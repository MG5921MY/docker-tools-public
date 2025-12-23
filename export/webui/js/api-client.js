// 与后端脚本执行服务的 HTTP 交互封装
// API 基地址默认自动使用当前页面的 origin（例如 http://nas-ip:3080）

(function () {
  function getApiBase() {
    // 优先支持通过全局变量覆盖（如果以后需要反向代理或子路径）
    if (window.DockerExportApiBase && typeof window.DockerExportApiBase === "string") {
      return window.DockerExportApiBase.replace(/\/+$/, "");
    }
    // 默认使用当前页面 origin，例如 http://mijiao-nas:3080
    if (window.location && window.location.origin) {
      return window.location.origin;
    }
    // 兜底：退回 localhost:3080（极端环境）
    return "http://localhost:3080";
  }

  async function postJson(path, data) {
    const url = getApiBase() + path;
    const resp = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("后端返回的不是有效 JSON：\n" + text);
    }
    if (!resp.ok) {
      const msg = json && json.error ? json.error : resp.statusText;
      const err = new Error("请求失败：" + msg);
      if (json && json.code) err.code = json.code;
      if (json && typeof json.retryAfterSeconds === "number") {
        err.retryAfterSeconds = json.retryAfterSeconds;
      }
      err.status = resp.status;
      throw err;
    }
    return json;
  }

  async function getJson(path) {
    const url = getApiBase() + path;
    const resp = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error("后端返回的不是有效 JSON：\n" + text);
    }
    if (!resp.ok) {
      const msg = json && json.error ? json.error : resp.statusText;
      const err = new Error("请求失败：" + msg);
      if (json && json.code) err.code = json.code;
      if (json && typeof json.retryAfterSeconds === "number") {
        err.retryAfterSeconds = json.retryAfterSeconds;
      }
      err.status = resp.status;
      throw err;
    }
    return json;
  }

  window.DockerExportApiClient = {
    getApiBase: function () {
      return getApiBase();
    },
    runTask: function (payload) {
      return postJson("/api/run", payload);
    },
    getStatus: function (taskId) {
      return getJson("/api/status?task_id=" + encodeURIComponent(taskId));
    },
    getLogs: function (taskId) {
      return getJson("/api/logs?task_id=" + encodeURIComponent(taskId));
    },
    listContainers: function () {
      return getJson("/api/containers");
    },
    getConfig: function () {
      return getJson("/api/config");
    },
    saveConfig: function (content) {
      return postJson("/api/config", { content });
    },
    getAuthSession: function () {
      return getJson("/api/auth/session");
    },
    authLogin: function (user, password) {
      return postJson("/api/auth/login", { user, password });
    },
    authMfa: function (code) {
      return postJson("/api/auth/mfa", { code });
    },
    authLogout: function () {
      return postJson("/api/auth/logout", {});
    },
    getMfaStatus: function () {
      return getJson("/api/mfa/status");
    },
    initMfa: function () {
      return postJson("/api/mfa/init", {});
    },
    disableMfa: function () {
      return postJson("/api/mfa/disable", {});
    },
    resetMfa: function () {
      return postJson("/api/mfa/reset", {});
    },
    enableMfa: function (code) {
      return postJson("/api/mfa/enable", { code });
    },
    getMfaQrUrl: function (cacheBust) {
      const base = getApiBase();
      const ts = typeof cacheBust === "string" ? cacheBust : String(Date.now());
      return base + "/api/mfa/qr?ts=" + encodeURIComponent(ts);
    },
    getAuthInfo: function () {
      return getJson("/api/auth/info");
    },
    changePassword: function (oldPassword, newPassword) {
      return postJson("/api/auth/change-password", { oldPassword, newPassword });
    },
  };
})();


