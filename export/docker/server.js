// 极简后端服务：
// - 提供 /api/run /api/status /api/logs
// - 调用 ../sh/docker-export-compose.sh 执行实际导出
// - 同时作为静态文件服务器，直接提供 ../webui 下的前端页面

const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  randomUUID,
  randomBytes,
  pbkdf2Sync,
  timingSafeEqual,
  createHmac,
} = require("crypto");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3080;

const ROOT_DIR = path.resolve(__dirname, ".."); // export 目录
const SCRIPT_PATH = path.join(ROOT_DIR, "sh", "docker-export-compose.sh");
const WEBUI_ROOT = path.join(ROOT_DIR, "webui");
const CONFIG_FILE = path.join(ROOT_DIR, "sh", "config");

const DATA_DIR = process.env.DOCKER_EXPORT_DATA_DIR
  ? path.resolve(process.env.DOCKER_EXPORT_DATA_DIR)
  : path.join(ROOT_DIR, "data");
const AUTH_STATE_FILE = path.join(DATA_DIR, "auth.json");
const SECURITY_CONFIG_FILE = path.join(DATA_DIR, "security.json");

function ensureDirExists(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {}

}

let securityConfigCache = null;
let securityConfigMtimeMs = 0;

function getSecurityConfig() {
  const defaults = {
    sessionTtlSeconds: 12 * 60 * 60,
    loginFailWindowSeconds: 30 * 60,
    loginFailMaxAttempts: 3,
    loginLockSeconds: 30 * 60,
  };

  ensureDirExists(DATA_DIR);

  try {
    if (!fs.existsSync(SECURITY_CONFIG_FILE)) {
      fs.writeFileSync(SECURITY_CONFIG_FILE, JSON.stringify(defaults, null, 2), "utf-8");
      securityConfigCache = defaults;
      securityConfigMtimeMs = Date.now();
      return securityConfigCache;
    }

    const st = fs.statSync(SECURITY_CONFIG_FILE);
    const mtime = st && st.mtimeMs ? st.mtimeMs : 0;
    if (securityConfigCache && mtime && mtime === securityConfigMtimeMs) {
      return securityConfigCache;
    }

    const raw = fs.readFileSync(SECURITY_CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    const cfg = {
      sessionTtlSeconds:
        Number.isFinite(parsed.sessionTtlSeconds) && parsed.sessionTtlSeconds > 60
          ? Math.floor(parsed.sessionTtlSeconds)
          : defaults.sessionTtlSeconds,
      loginFailWindowSeconds:
        Number.isFinite(parsed.loginFailWindowSeconds) && parsed.loginFailWindowSeconds >= 60
          ? Math.floor(parsed.loginFailWindowSeconds)
          : defaults.loginFailWindowSeconds,
      loginFailMaxAttempts:
        Number.isFinite(parsed.loginFailMaxAttempts) && parsed.loginFailMaxAttempts >= 1
          ? Math.floor(parsed.loginFailMaxAttempts)
          : defaults.loginFailMaxAttempts,
      loginLockSeconds:
        Number.isFinite(parsed.loginLockSeconds) && parsed.loginLockSeconds >= 60
          ? Math.floor(parsed.loginLockSeconds)
          : defaults.loginLockSeconds,
    };

    securityConfigCache = cfg;
    securityConfigMtimeMs = mtime;
    return securityConfigCache;
  } catch (e) {
    securityConfigCache = defaults;
    securityConfigMtimeMs = Date.now();
    return securityConfigCache;
  }
}

function parseCookies(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || "");
  if (!raw) return out;
  const parts = raw.split(";");
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx < 0) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch (e) {
      out[k] = v;
    }
  }
  return out;
}

function setCookie(res, name, value, opts) {
  const o = opts || {};
  let str = `${name}=${encodeURIComponent(String(value || ""))}`;
  str += "; Path=/";
  if (typeof o.maxAgeSeconds === "number" && Number.isFinite(o.maxAgeSeconds)) {
    const sec = Math.floor(o.maxAgeSeconds);
    str += `; Max-Age=${sec}`;
    const exp = new Date(Date.now() + sec * 1000);
    str += `; Expires=${exp.toUTCString()}`;
  }
  if (o.httpOnly !== false) str += "; HttpOnly";
  str += `; SameSite=${o.sameSite || "Lax"}`;
  if (o.secure) str += "; Secure";
  res.setHeader("Set-Cookie", str);
}

function handleAuthInfo(req, res) {
  sendJson(res, 200, {
    user: authState.user,
    mfaEnabled: !!authState.mfaEnabled,
  });
}

async function handleChangePassword(req, res) {
  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return sendJson(res, 400, { error: "请求体不是有效 JSON。" });
  }

  const oldPassword = String(body && body.oldPassword ? body.oldPassword : "");
  const newPassword = String(body && body.newPassword ? body.newPassword : "");

  if (!oldPassword) {
    return sendJson(res, 400, { error: "请先输入原密码。" });
  }
  if (newPassword.length < 6) {
    return sendJson(res, 400, { error: "新密码长度至少 6 位。" });
  }
  if (!verifyPassword(oldPassword, authState)) {
    return sendJson(res, 400, { error: "原密码不正确。" });
  }

  const saltBase64 = Buffer.from(randomBytes(16)).toString("base64");
  const hashed = hashPassword(newPassword, saltBase64);
  authState.passwordSaltBase64 = hashed.saltBase64;
  authState.passwordHashBase64 = hashed.hashBase64;
  authState.passwordIterations = hashed.iterations;
  authState.passwordKeylen = hashed.keylen;
  authState.passwordDigest = hashed.digest;
  authState.updatedAt = Date.now();
  try {
    saveAuthState(authState);
  } catch (e) {
    return sendJson(res, 500, { error: "保存失败，请检查 data 挂载目录权限。" });
  }

  sendJson(res, 200, { ok: true });
}

function base32Encode(buf) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(str || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpCode(secretBase32, step, digits) {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  let counter = step;
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 255;
    counter = Math.floor(counter / 256);
  }
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binCode =
    ((hmac[offset] & 127) << 24) |
    ((hmac[offset + 1] & 255) << 16) |
    ((hmac[offset + 2] & 255) << 8) |
    (hmac[offset + 3] & 255);
  const mod = 10 ** digits;
  const num = binCode % mod;
  return String(num).padStart(digits, "0");
}

function totpVerify(secretBase32, code, window) {
  const clean = String(code || "").replace(/\s+/g, "");
  if (!/^[0-9]{6}$/.test(clean)) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  const w = typeof window === "number" ? window : 1;
  for (let i = -w; i <= w; i++) {
    if (totpCode(secretBase32, step + i, 6) === clean) {
      return true;
    }
  }
  return false;
}

function hashPassword(password, saltBase64) {
  const salt = Buffer.from(saltBase64, "base64");
  const iterations = 150000;
  const keylen = 32;
  const digest = "sha256";
  const derived = pbkdf2Sync(String(password), salt, iterations, keylen, digest);
  return {
    saltBase64,
    hashBase64: derived.toString("base64"),
    iterations,
    keylen,
    digest,
  };
}

function verifyPassword(password, state) {
  if (!state || !state.passwordHashBase64 || !state.passwordSaltBase64) return false;
  const salt = Buffer.from(state.passwordSaltBase64, "base64");
  const iterations = Number(state.passwordIterations) || 150000;
  const keylen = Number(state.passwordKeylen) || 32;
  const digest = state.passwordDigest || "sha256";
  const derived = pbkdf2Sync(String(password), salt, iterations, keylen, digest);
  const expected = Buffer.from(state.passwordHashBase64, "base64");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

function loadAuthState() {
  ensureDirExists(DATA_DIR);
  if (fs.existsSync(AUTH_STATE_FILE)) {
    try {
      const raw = fs.readFileSync(AUTH_STATE_FILE, "utf-8");
      if (!raw || !raw.trim()) return null;
      const json = JSON.parse(raw);
      if (json && typeof json === "object") return json;
    } catch (e) {
      // auth.json 损坏时：备份一份，避免一直卡在坏文件上
      try {
        const ts = new Date();
        const stamp =
          ts.getFullYear().toString() +
          String(ts.getMonth() + 1).padStart(2, "0") +
          String(ts.getDate()).padStart(2, "0") +
          "-" +
          String(ts.getHours()).padStart(2, "0") +
          String(ts.getMinutes()).padStart(2, "0") +
          String(ts.getSeconds()).padStart(2, "0");
        const backup = AUTH_STATE_FILE + ".corrupt-" + stamp + ".bak";
        fs.copyFileSync(AUTH_STATE_FILE, backup);
      } catch (e2) {}
      return null;
    }
  }
  return null;
}

function saveAuthState(state) {
  ensureDirExists(DATA_DIR);
  const tmp = AUTH_STATE_FILE + ".tmp-" + process.pid + "-" + Date.now();
  const body = JSON.stringify(state, null, 2);
  fs.writeFileSync(tmp, body, "utf-8");
  try {
    fs.renameSync(tmp, AUTH_STATE_FILE);
  } catch (e) {
    try {
      fs.copyFileSync(tmp, AUTH_STATE_FILE);
      fs.unlinkSync(tmp);
    } catch (e2) {
      try {
        fs.unlinkSync(tmp);
      } catch (e3) {}
      throw e2;
    }
  }
}

function initAuthState() {
  const envUser = (process.env.DOCKER_EXPORT_AUTH_USER || "").trim();
  const envPass = process.env.DOCKER_EXPORT_AUTH_PASSWORD;

  const state = loadAuthState() || {};
  const user = envUser || state.user || "admin";
  let passwordPlain = null;

  const hasStoredPassword = !!(state.passwordHashBase64 && state.passwordSaltBase64);
  if (!hasStoredPassword && typeof envPass === "string" && envPass.length > 0) {
    const saltBase64 = Buffer.from(randomBytes(16)).toString("base64");
    const hashed = hashPassword(envPass, saltBase64);
    state.user = user;
    state.passwordSaltBase64 = hashed.saltBase64;
    state.passwordHashBase64 = hashed.hashBase64;
    state.passwordIterations = hashed.iterations;
    state.passwordKeylen = hashed.keylen;
    state.passwordDigest = hashed.digest;
    state.updatedAt = Date.now();
    passwordPlain = null;
  } else if (!state.passwordHashBase64 || !state.passwordSaltBase64) {
    const generated = randomBytes(18).toString("base64url");
    const saltBase64 = Buffer.from(randomBytes(16)).toString("base64");
    const hashed = hashPassword(generated, saltBase64);
    state.user = user;
    state.passwordSaltBase64 = hashed.saltBase64;
    state.passwordHashBase64 = hashed.hashBase64;
    state.passwordIterations = hashed.iterations;
    state.passwordKeylen = hashed.keylen;
    state.passwordDigest = hashed.digest;
    state.createdAt = Date.now();
    passwordPlain = generated;
  } else {
    state.user = user;
    passwordPlain = null;
  }

  // MFA 默认关闭；由 WebUI 手动开启后写入 auth.json 持久化
  if (typeof state.mfaEnabled !== "boolean") {
    state.mfaEnabled = false;
  }
  if (!state.mfaEnabled) {
    delete state.mfaSecretBase32;
  }

  saveAuthState(state);

  // eslint-disable-next-line no-console
  console.log(`[auth] user=${state.user}`);
  if (passwordPlain) {
    // eslint-disable-next-line no-console
    console.log(`[auth] generated password=${passwordPlain}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[auth] password=*** (stored in ${AUTH_STATE_FILE})`);
  }

  // eslint-disable-next-line no-console
  console.log(`[auth] mfa=${state.mfaEnabled ? "enabled" : "disabled"}`);

  return state;
}

const authState = initAuthState();

const SESSION_COOKIE = "docker_export_sid";
const sessions = new Map();

function getSessionTtlSeconds() {
  const cfg = getSecurityConfig();
  return cfg && cfg.sessionTtlSeconds ? cfg.sessionTtlSeconds : 12 * 60 * 60;
}

function createSession(fields) {
  const ttlSeconds = getSessionTtlSeconds();
  const sid = randomUUID();
  sessions.set(sid, {
    sid,
    user: authState.user,
    passwordOk: !!(fields && fields.passwordOk),
    mfaVerified: !!(fields && fields.mfaVerified),
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return sid;
}

function getSessionFromReq(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) return null;
  const s = sessions.get(sid);
  if (!s) return null;
  if (s.expiresAt && Date.now() > s.expiresAt) {
    sessions.delete(sid);
    return null;
  }
  return s;
}

function unauthorized(res) {
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
  });
  res.end("Unauthorized");
}

function unauthorizedJson(res) {
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ error: "Unauthorized" }));
}

function unauthorizedJsonWithCode(res, code) {
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    Vary: "Cookie",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ error: "Unauthorized", code: String(code || "AUTH_REQUIRED") }));
}

function requireApiSession(req, res, opts) {
  const o = opts || {};
  const s = getSessionFromReq(req);
  if (!s || !s.passwordOk) {
    unauthorizedJsonWithCode(res, "AUTH_REQUIRED");
    return null;
  }
  if (authState.mfaEnabled && !o.allowMfaPending && !s.mfaVerified) {
    unauthorizedJsonWithCode(res, "MFA_REQUIRED");
    return null;
  }
  return s;
}

async function handleAuthSession(req, res) {
  const s = getSessionFromReq(req);
  sendJson(res, 200, {
    authenticated: !!(s && s.passwordOk),
    mfaEnabled: !!authState.mfaEnabled,
    mfaVerified: !!(s && s.mfaVerified),
    user: authState.user,
  });
}

async function handleAuthLogin(req, res) {
  const cfg = getSecurityConfig();
  const ttlSeconds = getSessionTtlSeconds();

  const ip = getClientIp(req);
  const block = checkLoginBlocked(ip, cfg);
  if (block && block.blocked) {
    res.writeHead(429, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(
      JSON.stringify({
        error: "登录失败次数过多，请稍后再试。",
        code: "RATE_LIMIT",
        retryAfterSeconds: block.retryAfterSeconds,
      })
    );
    return;
  }

  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return sendJson(res, 400, { error: "请求体不是有效 JSON。" });
  }
  const user = String(body && body.user ? body.user : "");
  const password = String(body && body.password ? body.password : "");
  if (!user || !password) {
    return sendJson(res, 400, { error: "请填写账号与密码。" });
  }
  if (user !== authState.user) {
    recordLoginFail(ip, cfg);
    return sendJson(res, 401, { error: "账号或密码不正确。" });
  }
  if (!verifyPassword(password, authState)) {
    recordLoginFail(ip, cfg);
    return sendJson(res, 401, { error: "账号或密码不正确。" });
  }

  clearLoginFail(ip);

  const sid = createSession({ passwordOk: true, mfaVerified: !authState.mfaEnabled });
  setCookie(res, SESSION_COOKIE, sid, { httpOnly: true, sameSite: "Lax", maxAgeSeconds: ttlSeconds });
  sendJson(res, 200, {
    ok: true,
    mfaRequired: !!authState.mfaEnabled,
    user: authState.user,
  });
}

async function handleAuthMfa(req, res) {
  const s = requireApiSession(req, res, { allowMfaPending: true });
  if (!s) return;
  if (!authState.mfaEnabled) {
    return sendJson(res, 400, { error: "MFA 未开启。" });
  }
  if (s.mfaVerified) {
    return sendJson(res, 200, { ok: true, mfaVerified: true });
  }
  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return sendJson(res, 400, { error: "请求体不是有效 JSON。" });
  }
  const code = String(body && body.code ? body.code : "");
  if (!authState.mfaSecretBase32) {
    return sendJson(res, 500, { error: "MFA 配置异常（缺少 secret）。" });
  }
  if (!totpVerify(authState.mfaSecretBase32, code, 1)) {
    return sendJson(res, 400, { error: "验证码不正确，请重试。" });
  }
  s.mfaVerified = true;
  s.expiresAt = Date.now() + getSessionTtlSeconds() * 1000;
  sessions.set(s.sid, s);
  sendJson(res, 200, { ok: true, mfaVerified: true });
}

async function handleAuthLogout(req, res) {
  const s = getSessionFromReq(req);
  if (s && s.sid) {
    sessions.delete(s.sid);
  }
  setCookie(res, SESSION_COOKIE, "", { httpOnly: true, sameSite: "Lax", maxAgeSeconds: 0 });
  sendJson(res, 200, { ok: true });
}

const loginFailStateByIp = new Map();

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    const first = xf.split(",")[0].trim();
    if (first) return first;
  }
  const ra = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
  return String(ra || "unknown");
}

function checkLoginBlocked(ip, cfg) {
  const now = Date.now();
  const key = String(ip || "unknown");
  const st = loginFailStateByIp.get(key);
  if (!st) return { blocked: false, retryAfterSeconds: 0 };
  if (st.lockedUntil && now < st.lockedUntil) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((st.lockedUntil - now) / 1000)),
    };
  }
  return { blocked: false, retryAfterSeconds: 0 };
}

function recordLoginFail(ip, cfg) {
  const c = cfg || getSecurityConfig();
  const now = Date.now();
  const key = String(ip || "unknown");
  const windowMs = (c.loginFailWindowSeconds || 1800) * 1000;
  const maxAttempts = c.loginFailMaxAttempts || 3;
  const lockMs = (c.loginLockSeconds || 1800) * 1000;

  const cur = loginFailStateByIp.get(key) || { count: 0, firstAt: 0, lockedUntil: 0 };
  if (!cur.firstAt || now - cur.firstAt > windowMs) {
    cur.count = 0;
    cur.firstAt = now;
    cur.lockedUntil = 0;
  }
  cur.count += 1;
  if (cur.count >= maxAttempts) {
    cur.lockedUntil = now + lockMs;
  }
  loginFailStateByIp.set(key, cur);
}

function clearLoginFail(ip) {
  const key = String(ip || "unknown");
  loginFailStateByIp.delete(key);
}

function isAuthorized(req) {
  const hdr = req.headers["authorization"];
  if (!hdr || typeof hdr !== "string") return false;
  const m = hdr.match(/^Basic\s+(.+)$/i);
  if (!m) return false;
  let decoded;
  try {
    decoded = Buffer.from(m[1], "base64").toString("utf-8");
  } catch (e) {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return false;
  const user = decoded.slice(0, idx);
  const passAll = decoded.slice(idx + 1);
  if (user !== authState.user) return false;

  let passwordPart = passAll;
  let otpPart = "";
  if (authState.mfaEnabled) {
    const last = passAll.lastIndexOf(":");
    if (last >= 0) {
      passwordPart = passAll.slice(0, last);
      otpPart = passAll.slice(last + 1);
    }
  }

  if (!verifyPassword(passwordPart, authState)) return false;
  if (authState.mfaEnabled) {
    if (!authState.mfaSecretBase32) return false;
    if (!totpVerify(authState.mfaSecretBase32, otpPart, 1)) return false;
  }
  return true;
}

let pendingMfaSecretBase32 = "";
let pendingMfaCreatedAt = 0;

function buildMfaOtpauthUri(secretBase32, user) {
  const label = encodeURIComponent(`DockerExportWebUI:${user}`);
  const issuer = encodeURIComponent("DockerExportWebUI");
  const secret = encodeURIComponent(secretBase32);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
}

function handleMfaStatus(req, res) {
  sendJson(res, 200, {
    enabled: !!authState.mfaEnabled,
    hasSecret: !!authState.mfaSecretBase32,
  });
}

function handleMfaInit(req, res) {
  if (authState.mfaEnabled) {
    return sendJson(res, 400, { error: "MFA 已开启，无需初始化。" });
  }
  pendingMfaSecretBase32 = base32Encode(randomBytes(20));
  pendingMfaCreatedAt = Date.now();
  const uri = buildMfaOtpauthUri(pendingMfaSecretBase32, authState.user);
  sendJson(res, 200, {
    otpauthUri: uri,
    secretBase32: pendingMfaSecretBase32,
    createdAt: pendingMfaCreatedAt,
  });
}

function handleMfaDisable(req, res) {
  pendingMfaSecretBase32 = "";
  pendingMfaCreatedAt = 0;

  authState.mfaEnabled = false;
  delete authState.mfaSecretBase32;
  delete authState.mfaEnabledAt;
  saveAuthState(authState);

  sendJson(res, 200, { enabled: false });
}

function handleMfaReset(req, res) {
  // 重新绑定：关闭已有 MFA，并生成新的 pending secret
  authState.mfaEnabled = false;
  delete authState.mfaSecretBase32;
  delete authState.mfaEnabledAt;

  pendingMfaSecretBase32 = base32Encode(randomBytes(20));
  pendingMfaCreatedAt = Date.now();
  const uri = buildMfaOtpauthUri(pendingMfaSecretBase32, authState.user);

  saveAuthState(authState);

  sendJson(res, 200, {
    otpauthUri: uri,
    secretBase32: pendingMfaSecretBase32,
    createdAt: pendingMfaCreatedAt,
  });
}

function handleMfaQr(req, res) {
  if (authState.mfaEnabled) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Authorization",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: "MFA 已开启，无需生成二维码。" }));
    return;
  }
  if (!pendingMfaSecretBase32) {
    res.writeHead(400, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Authorization",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: "请先初始化 MFA（生成二维码）。" }));
    return;
  }

  const uri = buildMfaOtpauthUri(pendingMfaSecretBase32, authState.user);

  let responded = false;
  function fail(msg) {
    if (responded) return;
    responded = true;
    sendJson(res, 500, { error: msg });
  }

  const child = spawn("qrencode", ["-t", "SVG", "-o", "-", uri]);
  const chunks = [];
  let total = 0;

  child.stdout.on("data", (buf) => {
    chunks.push(buf);
    total += buf.length;
  });
  child.on("error", () => {
    fail("生成二维码失败（qrencode 不可用）。");
  });
  child.on("close", (code) => {
    if (responded) return;
    if (code !== 0) {
      return fail("生成二维码失败。");
    }
    const svg = Buffer.concat(chunks, total);
    responded = true;
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Authorization",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(svg);
  });
}

async function handleMfaEnable(req, res) {
  if (authState.mfaEnabled) {
    return sendJson(res, 200, { enabled: true });
  }
  if (!pendingMfaSecretBase32) {
    return sendJson(res, 400, { error: "请先初始化 MFA（生成二维码）。" });
  }

  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw || "{}");
  } catch (e) {
    return sendJson(res, 400, { error: "请求体不是有效 JSON。" });
  }
  const code = String(body && body.code ? body.code : "");
  if (!totpVerify(pendingMfaSecretBase32, code, 1)) {
    return sendJson(res, 400, { error: "验证码不正确，请重试。" });
  }

  authState.mfaEnabled = true;
  authState.mfaSecretBase32 = pendingMfaSecretBase32;
  authState.mfaEnabledAt = Date.now();
  saveAuthState(authState);
  pendingMfaSecretBase32 = "";
  pendingMfaCreatedAt = 0;

  const s = getSessionFromReq(req);
  if (s && s.passwordOk) {
    s.mfaVerified = true;
    s.expiresAt = Date.now() + getSessionTtlSeconds() * 1000;
    sessions.set(s.sid, s);
  }

  sendJson(res, 200, { enabled: true });
}

const CONFIG_TEMPLATE = `# ═══════════════════════════════════════════════════════════════
# Docker Export Compose - 自定义敏感关键词配置文件
# ═══════════════════════════════════════════════════════════════
# 版本: v2.2.1
# 创建: 2025-11-06
# 说明: 此文件用于自定义额外的敏感环境变量关键词和排除规则
# ═══════════════════════════════════════════════════════════════

# 使用说明 / Usage:
# 1. 每行一个关键词（大小写不敏感）
# 2. 使用 # 开头表示注释
# 3. 空行会被忽略
# 4. 使用 ! 开头表示排除（不视为敏感）⭐ 新功能
# 5. 脚本会自动检测包含这些关键词的环境变量

# ═══════════════════════════════════════════════════════════════
# 添加敏感关键词 / Add Sensitive Keywords
# ═══════════════════════════════════════════════════════════════
# 示例 / Examples:
# MY_COMPANY_SECRET     # 公司特定的密钥变量
# CUSTOM_API_KEY        # 自定义 API 密钥
# INTERNAL_TOKEN        # 内部令牌

# ═══════════════════════════════════════════════════════════════
# 排除关键词（使用 ! 开头）/ Exclude Keywords (Use ! prefix) ⭐
# ═══════════════════════════════════════════════════════════════
# 说明：即使变量名包含敏感关键词，也不视为敏感
# Note: Even if variable name contains sensitive keywords, not treated as sensitive
#
# 使用场景 / Use Cases:
# - 公开的数据库连接（只读）
# - 非敏感的配置 URL
# - 已脱敏的测试数据
#
# 示例 / Examples:
# !PUBLIC_DATABASE_URL  # 虽然包含 DATABASE_URL，但这是公开的
# !DEMO_PASSWORD        # 虽然包含 PASSWORD，但这是演示密码
# !TEST_SECRET_KEY      # 虽然包含 SECRET，但这是测试密钥

# ═══════════════════════════════════════════════════════════════
# 内置关键词（无需添加，已自动包含）/ Built-in Keywords:
# ═══════════════════════════════════════════════════════════════
# PASSWORD, PASSWD, PWD, PASS
# SECRET, TOKEN, KEY, APIKEY
# API_KEY, API_SECRET, API_TOKEN
# ACCESS_KEY, ACCESS_TOKEN, ACCESS_SECRET
# PRIVATE_KEY, PUBLIC_KEY, SSH_KEY
# AUTH, AUTHENTICATION, AUTHORIZATION
# CREDENTIALS, CREDENTIAL
# SESSION, SESSION_KEY, SESSION_SECRET
# OAUTH, OAUTH_TOKEN, OAUTH_SECRET
# CERT, CERTIFICATE, SSL, TLS
# PRIVATE, PEM, P12, PKCS
# SALT, HASH, ENCRYPTION, DECRYPT
# CIPHER, AES, RSA
# DATABASE_URL, DB_PASSWORD, DB_USER
# CONNECTION_STRING, CONN_STR
# MYSQL_PASSWORD, POSTGRES_PASSWORD
# MONGO_PASSWORD, REDIS_PASSWORD
# ADMIN, ROOT, SUPERUSER
# ADMIN_PASSWORD, ROOT_PASSWORD
# AWS_SECRET, AWS_ACCESS, AWS_KEY
# AZURE_, GCP_, GOOGLE_, CLOUD_, S3_
# SIGNING_KEY, JWT_SECRET, JWT_KEY
# WEBHOOK_SECRET, ENCRYPTION_KEY
# ═══════════════════════════════════════════════════════════════

# 在下方添加您的自定义关键词 / Add your custom keywords below:

# 示例（取消注释以启用）/ Examples (uncomment to enable):
# COMPANY_SECRET
# INTERNAL_KEY
# PRIVATE_TOKEN
`;

/** 任务状态内存存储（简单实现，满足本工具场景） */
const tasks = Object.create(null);

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Cookie",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

function sendText(res, statusCode, text, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": (contentType || "text/plain") + "; charset=utf-8",
    "Cache-Control": "no-store",
    Vary: "Cookie",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(text);
}

function notFound(res) {
  sendText(res, 404, "Not Found");
}

function handleCors(req, res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        // 防御性限制
        req.connection.destroy();
        reject(new Error("请求体过大"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function buildArgsFromPayload(payload) {
  const args = [];
  const { mode, options } = payload;

  if (!options || typeof options !== "object") {
    throw new Error("缺少 options 字段。");
  }

  const outDir = (options.outputDir || "").trim();
  if (outDir && outDir !== "./output") {
    args.push("-o", outDir);
  }

  const exportType = options.exportType || "yml";
  if (exportType !== "yml" && exportType !== "env") {
    throw new Error("导出类型必须是 yml 或 env。");
  }
  if (exportType !== "yml") {
    args.push("--type", exportType);
  }

  if (options.privacy) args.push("--privacy");
  if (options.clean) args.push("--clean");
  if (options.dryRun) args.push("--dry-run");
  if (options.overwrite) args.push("--overwrite");
  if (options.quiet) args.push("--quiet");
  if (options.mustOutput) args.push("--must-output");

  if (mode === "single") {
    const name = (payload.containerName || "").trim();
    if (!name) {
      throw new Error("单个容器模式下必须提供 containerName。");
    }
    args.push(name);
  } else if (mode === "batchFromList") {
    if (!payload._filePath) {
      throw new Error("批量模式缺少临时文件路径。");
    }
    args.push("--file", payload._filePath);
  } else if (mode === "all-run") {
    args.push("--all-run");
  } else if (mode === "all") {
    args.push("--all");
  } else if (mode === "all-stop") {
    args.push("--all-stop");
  } else {
    throw new Error("未知模式：" + mode);
  }

  return args;
}

function createTask(args) {
  const taskId = randomUUID();
  const logLines = [];

  const proc = spawn("bash", [SCRIPT_PATH, ...args], {
    cwd: ROOT_DIR,
    env: process.env,
  });

  proc.stdout.setEncoding("utf-8");
  proc.stderr.setEncoding("utf-8");

  proc.stdout.on("data", (chunk) => {
    logLines.push(chunk.toString());
  });
  proc.stderr.on("data", (chunk) => {
    logLines.push(chunk.toString());
  });

  proc.on("close", (code) => {
    const task = tasks[taskId];
    if (task) {
      task.finished = true;
      task.exitCode = code;
    }
  });

  tasks[taskId] = {
    id: taskId,
    args,
    startedAt: Date.now(),
    finished: false,
    exitCode: null,
    getLog: () => logLines.join(""),
  };

  return taskId;
}

async function handleRun(req, res) {
  try {
    const bodyText = await readBody(req);
    let payload;
    try {
      payload = JSON.parse(bodyText || "{}");
    } catch (e) {
      throw new Error("请求体不是合法 JSON。");
    }

    const mode = payload.mode || "single";
    if (
      !["single", "batchFromList", "all-run", "all", "all-stop"].includes(mode)
    ) {
      throw new Error("不支持的模式：" + mode);
    }

    // 批量模式：写入临时文件，由脚本以 --file 读取
    if (mode === "batchFromList") {
      const list = (payload.containerList || "").trim();
      if (!list) {
        throw new Error("批量模式需要 containerList。");
      }
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docker-export-"));
      const listFile = path.join(tmpDir, "containers.txt");
      fs.writeFileSync(listFile, list, "utf-8");
      payload._filePath = listFile;
    }

    const args = buildArgsFromPayload(payload);
    const taskId = createTask(args);

    sendJson(res, 200, { taskId });
  } catch (e) {
    sendJson(res, 400, { error: e.message || String(e) });
  }
}

function handleStatus(req, res, query) {
  const id = query.task_id;
  if (!id || !tasks[id]) {
    return sendJson(res, 200, { found: false });
  }
  const t = tasks[id];
  sendJson(res, 200, {
    found: true,
    finished: !!t.finished,
    exitCode: t.exitCode,
    startedAt: t.startedAt,
  });
}

function handleLogs(req, res, query) {
  const id = query.task_id;
  if (!id || !tasks[id]) {
    return sendJson(res, 200, { found: false, log: "" });
  }
  const t = tasks[id];
  sendJson(res, 200, { found: true, log: t.getLog() });
}

function runDockerCommand(args, cb) {
  const proc = spawn("docker", args, {
    cwd: ROOT_DIR,
    env: process.env,
  });
  let out = "";
  let err = "";
  proc.stdout.setEncoding("utf-8");
  proc.stderr.setEncoding("utf-8");
  proc.stdout.on("data", (c) => {
    out += c.toString();
  });
  proc.stderr.on("data", (c) => {
    err += c.toString();
  });
  proc.on("close", (code) => {
    cb(code, out, err);
  });
}

function handleListContainers(_req, res) {
  // 列出所有容器（包含已停止），用于前端选择
  runDockerCommand(
    ["ps", "-a", "--format", "{{.Names}}||{{.Image}}||{{.Status}}"],
    (code, out, err) => {
      if (code !== 0) {
        return sendJson(res, 500, {
          error: "docker ps 执行失败",
          detail: err,
        });
      }
      const lines = out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const items = lines.map((l) => {
        const [name, image, status] = l.split("||");
        return { name: name || "", image: image || "", status: status || "" };
      });
      sendJson(res, 200, { items });
    }
  );
}

function ensureConfigExists() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, CONFIG_TEMPLATE, "utf-8");
  }
}

function handleGetConfig(_req, res) {
  try {
    ensureConfigExists();
    const content = fs.readFileSync(CONFIG_FILE, "utf-8");
    sendJson(res, 200, { content });
  } catch (e) {
    sendJson(res, 500, { error: e.message || String(e) });
  }
}

async function handleSaveConfig(req, res) {
  try {
    const bodyText = await readBody(req);
    let payload;
    try {
      payload = JSON.parse(bodyText || "{}");
    } catch (e) {
      throw new Error("请求体不是合法 JSON。");
    }
    const content = typeof payload.content === "string" ? payload.content : "";
    if (!content.trim()) {
      throw new Error("内容不能为空。");
    }
    fs.writeFileSync(CONFIG_FILE, content, "utf-8");
    sendJson(res, 200, { ok: true });
  } catch (e) {
    sendJson(res, 400, { error: e.message || String(e) });
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "text/plain";
  }
}

function serveStatic(req, res, pathname) {
  let relPath = pathname;
  if (relPath === "/" || !relPath) {
    relPath = "/index.html";
  }

  const fsPath = path.join(WEBUI_ROOT, relPath.replace(/^\/+/, ""));

  // 简单防止目录穿越
  if (!fsPath.startsWith(WEBUI_ROOT)) {
    return notFound(res);
  }

  fs.readFile(fsPath, (err, buf) => {
    if (err) {
      return notFound(res);
    }
    const mime = getMimeType(fsPath);
    res.writeHead(200, {
      "Content-Type": mime + "; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Cookie",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "/";

  if (req.method === "OPTIONS") {
    return handleCors(req, res);
  }

  if (pathname.startsWith("/api/")) {
    if (pathname === "/api/auth/session" && req.method === "GET") {
      return handleAuthSession(req, res);
    }
    if (pathname === "/api/auth/login" && req.method === "POST") {
      return handleAuthLogin(req, res);
    }
    if (pathname === "/api/auth/mfa" && req.method === "POST") {
      return handleAuthMfa(req, res);
    }
    if (pathname === "/api/auth/logout" && req.method === "POST") {
      const s = requireApiSession(req, res, { allowMfaPending: true });
      if (!s) return;
      return handleAuthLogout(req, res);
    }

    const s = requireApiSession(req, res);
    if (!s) return;

    if (pathname === "/api/auth/info" && req.method === "GET") {
      return handleAuthInfo(req, res);
    }
    if (pathname === "/api/auth/change-password" && req.method === "POST") {
      return handleChangePassword(req, res);
    }
    if (pathname === "/api/run" && req.method === "POST") {
      return handleRun(req, res);
    }
    if (pathname === "/api/status" && req.method === "GET") {
      return handleStatus(req, res, parsed.query || {});
    }
    if (pathname === "/api/logs" && req.method === "GET") {
      return handleLogs(req, res, parsed.query || {});
    }
    if (pathname === "/api/containers" && req.method === "GET") {
      return handleListContainers(req, res);
    }
    if (pathname === "/api/config" && req.method === "GET") {
      return handleGetConfig(req, res);
    }
    if (pathname === "/api/config" && (req.method === "PUT" || req.method === "POST")) {
      return handleSaveConfig(req, res);
    }
    if (pathname === "/api/mfa/status" && req.method === "GET") {
      return handleMfaStatus(req, res);
    }
    if (pathname === "/api/mfa/qr" && req.method === "GET") {
      return handleMfaQr(req, res);
    }
    if (pathname === "/api/mfa/init" && req.method === "POST") {
      return handleMfaInit(req, res);
    }
    if (pathname === "/api/mfa/disable" && req.method === "POST") {
      return handleMfaDisable(req, res);
    }
    if (pathname === "/api/mfa/reset" && req.method === "POST") {
      return handleMfaReset(req, res);
    }
    if (pathname === "/api/mfa/enable" && req.method === "POST") {
      return handleMfaEnable(req, res);
    }
    return notFound(res);
  }

  // 其他路径作为静态资源处理
  if (req.method === "GET") {
    return serveStatic(req, res, pathname);
  }

  notFound(res);
});

server.listen(PORT, () => {
  // 简单启动日志
  // eslint-disable-next-line no-console
  console.log(
    `[server] Docker Export WebUI backend listening on http://localhost:${PORT}`
  );
  // eslint-disable-next-line no-console
  console.log(`[server] ROOT_DIR=${ROOT_DIR}`);
  // eslint-disable-next-line no-console
  console.log(`[server] SCRIPT_PATH=${SCRIPT_PATH}`);
});


