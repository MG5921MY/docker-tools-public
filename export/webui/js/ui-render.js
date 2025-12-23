(function () {
  const config = window.DockerExportConfigModel;
  const api = window.DockerExportApiClient;

  const els = {
    appShell: document.getElementById("appShell"),
    modeRadios: document.querySelectorAll('input[name="mode"]'),
    containerName: document.getElementById("containerName"),
    containerList: document.getElementById("containerList"),
    fieldContainerName: document.getElementById("field-container-name"),
    fieldContainerList: document.getElementById("field-container-list"),
    outputDir: document.getElementById("outputDir"),
    exportType: document.getElementById("exportType"),
    optPrivacy: document.getElementById("optPrivacy"),
    optClean: document.getElementById("optClean"),
    optDryRun: document.getElementById("optDryRun"),
    optOverwrite: document.getElementById("optOverwrite"),
    optQuiet: document.getElementById("optQuiet"),
    optMustOutput: document.getElementById("optMustOutput"),
    btnRun: document.getElementById("btnRun"),
    btnPickContainer: document.getElementById("btnPickContainer"),
    btnPickContainerBatch: document.getElementById("btnPickContainerBatch"),
    cmdPreview: document.getElementById("commandPreview"),
    logOutput: document.getElementById("logOutput"),
    currentTaskInfo: document.getElementById("currentTaskInfo"),
    containerPicker: document.getElementById("containerPicker"),
    btnClosePicker: document.getElementById("btnClosePicker"),
    containerFilter: document.getElementById("containerFilter"),
    containerListItems: document.getElementById("containerListItems"),
    pickerSelectedCount: document.getElementById("pickerSelectedCount"),
    btnApplySelection: document.getElementById("btnApplySelection"),
    btnOpenConfig: document.getElementById("btnOpenConfig"),
    btnCloseConfig: document.getElementById("btnCloseConfig"),
    btnSaveConfig: document.getElementById("btnSaveConfig"),
    btnDownloadConfig: document.getElementById("btnDownloadConfig"),
    configModal: document.getElementById("configModal"),
    configContent: document.getElementById("configContent"),
    configStatus: document.getElementById("configStatus"),
    btnCopyCommand: document.getElementById("btnCopyCommand"),
    lastCommandText: document.getElementById("lastCommandText"),
    batchFileInput: document.getElementById("batchFileInput"),
    btnLoadBatchFile: document.getElementById("btnLoadBatchFile"),
    btnSaveBatchFile: document.getElementById("btnSaveBatchFile"),

    btnAuth: document.getElementById("btnAuth"),
    loginModal: document.getElementById("loginModal"),
    btnCloseLogin: document.getElementById("btnCloseLogin"),
    loginStatusText: document.getElementById("loginStatusText"),
    loginPasswordPanel: document.getElementById("loginPasswordPanel"),
    loginOtpPanel: document.getElementById("loginOtpPanel"),
    loginUser: document.getElementById("loginUser"),
    loginPassword: document.getElementById("loginPassword"),
    btnLogin: document.getElementById("btnLogin"),
    loginOtp: document.getElementById("loginOtp"),
    btnVerifyOtp: document.getElementById("btnVerifyOtp"),

    btnOpenMfa: document.getElementById("btnOpenMfa"),
    mfaModal: document.getElementById("mfaModal"),
    btnCloseMfa: document.getElementById("btnCloseMfa"),
    mfaStatusText: document.getElementById("mfaStatusText"),
    mfaEnabledPanel: document.getElementById("mfaEnabledPanel"),
    mfaSetupPanel: document.getElementById("mfaSetupPanel"),
    btnMfaInit: document.getElementById("btnMfaInit"),
    mfaQrWrap: document.getElementById("mfaQrWrap"),
    mfaQrImg: document.getElementById("mfaQrImg"),
    mfaSecretWrap: document.getElementById("mfaSecretWrap"),
    mfaSecretText: document.getElementById("mfaSecretText"),
    mfaCode: document.getElementById("mfaCode"),
    btnMfaEnable: document.getElementById("btnMfaEnable"),
    btnMfaDisable: document.getElementById("btnMfaDisable"),
    btnMfaReset: document.getElementById("btnMfaReset"),
    btnMfaReset2: document.getElementById("btnMfaReset2"),
    mfaActionStatus: document.getElementById("mfaActionStatus"),

    btnOpenPassword: document.getElementById("btnOpenPassword"),
    passwordModal: document.getElementById("passwordModal"),
    btnClosePassword: document.getElementById("btnClosePassword"),
    passwordInfoText: document.getElementById("passwordInfoText"),
    oldPassword: document.getElementById("oldPassword"),
    newPassword: document.getElementById("newPassword"),
    newPassword2: document.getElementById("newPassword2"),
    btnChangePassword: document.getElementById("btnChangePassword"),
    passwordActionStatus: document.getElementById("passwordActionStatus"),
  };

  let currentTaskId = null;
  let pollTimer = null;
  let allContainersCache = [];
  let pickerMode = "single"; // 'single' | 'batch'
  const pickerSelected = new Set();
  let lastCommand = "";

  let authSession = null;

  function applyAuthVisibility() {
    const authed = !!(authSession && authSession.authenticated);
    const mfaEnabled = !!(authSession && authSession.mfaEnabled);
    const mfaOk = !!(authSession && authSession.mfaVerified);
    const allowApp = authed && (!mfaEnabled || mfaOk);

    if (els.appShell) {
      els.appShell.classList.toggle("hidden", !allowApp);
    }

    if (els.btnCloseLogin) {
      els.btnCloseLogin.classList.toggle("hidden", !allowApp);
    }

    if (allowApp) {
      closeLoginModal();
      setLoginStatus("");
      return;
    }

    if (!allowApp) {
      if (!authed) {
        openLoginModal("password");
      } else if (mfaEnabled && !mfaOk) {
        openLoginModal("otp");
      }
    }
  }

  function setLoginStatus(text) {
    if (!els.loginStatusText) return;
    els.loginStatusText.textContent = text || "";
  }

  function setAuthButtonLabel() {
    if (!els.btnAuth) return;
    const authed = !!(authSession && authSession.authenticated);
    const mfaEnabled = !!(authSession && authSession.mfaEnabled);
    const mfaOk = !!(authSession && authSession.mfaVerified);
    if (!authed) {
      els.btnAuth.textContent = "登录";
      return;
    }
    if (mfaEnabled && !mfaOk) {
      els.btnAuth.textContent = "输入验证码";
      return;
    }
    els.btnAuth.textContent = "退出";
  }

  function openLoginModal(mode) {
    if (!els.loginModal) return;
    const m = mode || "password";
    setLoginStatus("");
    if (els.loginPasswordPanel) {
      els.loginPasswordPanel.classList.toggle("hidden", m !== "password");
    }
    if (els.loginOtpPanel) {
      els.loginOtpPanel.classList.toggle("hidden", m !== "otp");
    }
    if (els.loginPassword) els.loginPassword.value = "";
    if (els.loginOtp) els.loginOtp.value = "";
    els.loginModal.classList.remove("hidden");
    if (m === "password" && els.loginUser) {
      els.loginUser.focus();
    }
    if (m === "otp" && els.loginOtp) {
      els.loginOtp.focus();
    }
  }

  function closeLoginModal() {
    if (!els.loginModal) return;
    els.loginModal.classList.add("hidden");
  }

  async function refreshSession() {
    try {
      authSession = await api.getAuthSession();
    } catch (e) {
      authSession = null;
    }
    setAuthButtonLabel();
    applyAuthVisibility();
  }

  function handleAuthError(e) {
    const code = e && e.code ? String(e.code) : "";
    if (code === "AUTH_REQUIRED") {
      openLoginModal("password");
      setLoginStatus("请先登录。");
      return true;
    }
    if (code === "MFA_REQUIRED") {
      openLoginModal("otp");
      setLoginStatus("请输入动态验证码完成登录。");
      return true;
    }
    return false;
  }

  async function doLoginPassword() {
    if (!els.btnLogin) return;
    const user = String(els.loginUser && els.loginUser.value ? els.loginUser.value : "").trim();
    const pass = String(
      els.loginPassword && els.loginPassword.value ? els.loginPassword.value : ""
    );
    if (!user || !pass) {
      setLoginStatus("请填写账号与密码。");
      return;
    }
    setLoginStatus("");
    try {
      els.btnLogin.disabled = true;
      const res = await api.authLogin(user, pass);
      await refreshSession();
      if (res && res.mfaRequired) {
        openLoginModal("otp");
        setLoginStatus("账号密码验证通过，请输入动态验证码。");
        return;
      }
      closeLoginModal();
    } catch (e) {
      if (handleAuthError(e)) return;
      if (e && e.code === "RATE_LIMIT") {
        const sec =
          typeof e.retryAfterSeconds === "number" && e.retryAfterSeconds > 0
            ? Math.ceil(e.retryAfterSeconds)
            : 0;
        if (sec > 0) {
          setLoginStatus("登录失败次数过多，请 " + sec + " 秒后再试。");
        } else {
          setLoginStatus("登录失败次数过多，请稍后再试。");
        }
        return;
      }
      setLoginStatus("登录失败：" + (e.message || e));
    } finally {
      els.btnLogin.disabled = false;
    }
  }

  async function doVerifyOtp() {
    if (!els.btnVerifyOtp) return;
    const code = String(els.loginOtp && els.loginOtp.value ? els.loginOtp.value : "")
      .replace(/\s+/g, "")
      .trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setLoginStatus("请输入 6 位数字验证码。");
      return;
    }
    setLoginStatus("");
    try {
      els.btnVerifyOtp.disabled = true;
      await api.authMfa(code);
      await refreshSession();
      closeLoginModal();
    } catch (e) {
      if (handleAuthError(e)) return;
      setLoginStatus("验证失败：" + (e.message || e));
    } finally {
      els.btnVerifyOtp.disabled = false;
    }
  }

  async function doLogout() {
    try {
      await api.authLogout();
    } catch (e) {}
    await refreshSession();
    openLoginModal("password");
  }

  function getSelectedMode() {
    for (const r of els.modeRadios) {
      if (r.checked) return r.value;
    }
    return "single";
  }

  function openMfaModal() {
    if (!els.mfaModal) return;
    els.mfaModal.classList.remove("hidden");
    refreshMfaStatus();
  }

  function closeMfaModal() {
    if (!els.mfaModal) return;
    els.mfaModal.classList.add("hidden");
  }

  function setMfaActionStatus(text) {
    if (!els.mfaActionStatus) return;
    els.mfaActionStatus.textContent = text || "";
  }

  async function refreshMfaStatus() {
    if (!els.mfaStatusText) return;
    els.mfaStatusText.textContent = "正在获取 MFA 状态...";
    setMfaActionStatus("");
    try {
      const st = await api.getMfaStatus();
      const enabled = !!(st && st.enabled);
      if (enabled) {
        els.mfaStatusText.textContent = "状态：已开启";
        if (els.mfaEnabledPanel) els.mfaEnabledPanel.classList.remove("hidden");
        if (els.mfaSetupPanel) els.mfaSetupPanel.classList.add("hidden");
      } else {
        els.mfaStatusText.textContent = "状态：未开启";
        if (els.mfaEnabledPanel) els.mfaEnabledPanel.classList.add("hidden");
        if (els.mfaSetupPanel) els.mfaSetupPanel.classList.remove("hidden");
      }
    } catch (e) {
      if (handleAuthError(e)) return;
      const msg = String(e && e.message ? e.message : e);
      els.mfaStatusText.textContent = "获取 MFA 状态失败：" + msg;
    }
  }

  async function initMfa() {
    if (!els.btnMfaInit) return;
    setMfaActionStatus("");
    try {
      els.btnMfaInit.disabled = true;
      const res = await api.initMfa();
      if (els.mfaSecretText) {
        els.mfaSecretText.textContent = res && res.secretBase32 ? res.secretBase32 : "";
      }
      if (els.mfaSecretWrap) els.mfaSecretWrap.classList.remove("hidden");

      if (els.mfaQrImg) {
        els.mfaQrImg.src = api.getMfaQrUrl(String(Date.now()));
      }
      if (els.mfaQrWrap) els.mfaQrWrap.classList.remove("hidden");

      setMfaActionStatus("二维码已生成，请扫码后输入 6 位验证码。");
    } catch (e) {
      if (handleAuthError(e)) return;
      setMfaActionStatus("生成二维码失败：" + (e.message || e));
    } finally {
      els.btnMfaInit.disabled = false;
    }
  }

  async function resetMfa() {
    setMfaActionStatus("");
    try {
      const res = await api.resetMfa();
      if (els.mfaSecretText) {
        els.mfaSecretText.textContent =
          res && res.secretBase32 ? res.secretBase32 : "";
      }
      if (els.mfaSecretWrap) els.mfaSecretWrap.classList.remove("hidden");

      if (els.mfaQrImg) {
        els.mfaQrImg.src = api.getMfaQrUrl(String(Date.now()));
      }
      if (els.mfaQrWrap) els.mfaQrWrap.classList.remove("hidden");

      setMfaActionStatus(
        "已重新生成绑定信息，请扫码新二维码并输入 6 位验证码启用。"
      );
      await refreshMfaStatus();
    } catch (e) {
      if (handleAuthError(e)) return;
      setMfaActionStatus("重置失败：" + (e.message || e));
    }
  }

  async function disableMfa() {
    const ok = window.confirm("确认关闭 MFA？关闭后将不再需要动态验证码。");
    if (!ok) return;
    setMfaActionStatus("");
    try {
      await api.disableMfa();
      if (els.mfaQrWrap) els.mfaQrWrap.classList.add("hidden");
      if (els.mfaSecretWrap) els.mfaSecretWrap.classList.add("hidden");
      if (els.mfaCode) els.mfaCode.value = "";
      setMfaActionStatus("MFA 已关闭。");
      await refreshMfaStatus();
    } catch (e) {
      if (handleAuthError(e)) return;
      setMfaActionStatus("关闭失败：" + (e.message || e));
    }
  }

  async function enableMfa() {
    if (!els.btnMfaEnable) return;
    const code = String(els.mfaCode && els.mfaCode.value ? els.mfaCode.value : "")
      .replace(/\s+/g, "")
      .trim();
    if (!/^[0-9]{6}$/.test(code)) {
      setMfaActionStatus("请输入 6 位数字验证码。");
      return;
    }
    setMfaActionStatus("");
    try {
      els.btnMfaEnable.disabled = true;
      await api.enableMfa(code);
      setMfaActionStatus(
        "MFA 已启用。后续登录时：先输入账号+密码，通过后会要求再输入一次动态验证码（OTP）。"
      );
      await refreshMfaStatus();
      await refreshSession();
    } catch (e) {
      if (handleAuthError(e)) return;
      setMfaActionStatus("启用失败：" + (e.message || e));
    } finally {
      els.btnMfaEnable.disabled = false;
    }
  }

  function openPasswordModal() {
    if (!els.passwordModal) return;
    if (els.passwordActionStatus) els.passwordActionStatus.textContent = "";
    if (els.passwordInfoText) {
      els.passwordInfoText.textContent = "正在加载账号信息...";
    }
    if (els.oldPassword) els.oldPassword.value = "";
    if (els.newPassword) els.newPassword.value = "";
    if (els.newPassword2) els.newPassword2.value = "";
    els.passwordModal.classList.remove("hidden");
    refreshAuthInfo();
  }

  function closePasswordModal() {
    if (!els.passwordModal) return;
    els.passwordModal.classList.add("hidden");
  }

  async function refreshAuthInfo() {
    if (!els.passwordInfoText) return;
    try {
      const info = await api.getAuthInfo();
      const user = info && info.user ? info.user : "-";
      const mfa = info && info.mfaEnabled ? "已开启" : "未开启";
      els.passwordInfoText.textContent = "当前账号：" + user + "；MFA：" + mfa;
    } catch (e) {
      if (handleAuthError(e)) return;
      const msg = String(e && e.message ? e.message : e);
      if (msg.includes("Unauthorized")) {
        els.passwordInfoText.textContent = "需要登录后才能修改密码。";
      } else {
        els.passwordInfoText.textContent = "获取账号信息失败：" + msg;
      }
    }
  }

  async function changePassword() {
    if (!els.btnChangePassword) return;
    const oldPass = String(els.oldPassword && els.oldPassword.value ? els.oldPassword.value : "");
    const newPass = String(els.newPassword && els.newPassword.value ? els.newPassword.value : "");
    const newPass2 = String(
      els.newPassword2 && els.newPassword2.value ? els.newPassword2.value : ""
    );

    if (els.passwordActionStatus) els.passwordActionStatus.textContent = "";

    if (!oldPass) {
      if (els.passwordActionStatus) els.passwordActionStatus.textContent = "请先输入原密码。";
      return;
    }
    if (newPass.length < 6) {
      if (els.passwordActionStatus) els.passwordActionStatus.textContent = "新密码长度至少 6 位。";
      return;
    }
    if (newPass !== newPass2) {
      if (els.passwordActionStatus) els.passwordActionStatus.textContent = "两次新密码输入不一致。";
      return;
    }

    try {
      els.btnChangePassword.disabled = true;
      await api.changePassword(oldPass, newPass);
      if (els.passwordActionStatus) {
        els.passwordActionStatus.textContent =
          "密码修改成功。请刷新页面并用新密码重新登录。";
      }
    } catch (e) {
      if (handleAuthError(e)) return;
      if (els.passwordActionStatus) {
        els.passwordActionStatus.textContent = "修改失败：" + (e.message || e);
      }
    } finally {
      els.btnChangePassword.disabled = false;
    }
  }

  function updateModeVisibility() {
    const mode = getSelectedMode();
    const modeCfg = config.modes.find((m) => m.id === mode);
    if (!modeCfg) return;

    if (modeCfg.requiresContainerName) {
      els.fieldContainerName.classList.remove("hidden");
    } else {
      els.fieldContainerName.classList.add("hidden");
    }

    if (modeCfg.supportsContainerList) {
      els.fieldContainerList.classList.remove("hidden");
    } else {
      els.fieldContainerList.classList.add("hidden");
    }
  }

  function buildRequestPayload() {
    const mode = getSelectedMode();
    const payload = {
      mode: mode,
      options: {
        outputDir: els.outputDir.value.trim() || config.options.outputDir.default,
        exportType: els.exportType.value || config.options.exportType.default,
        privacy: !!els.optPrivacy.checked,
        clean: !!els.optClean.checked,
        dryRun: !!els.optDryRun.checked,
        overwrite: !!els.optOverwrite.checked,
        quiet: !!els.optQuiet.checked,
        mustOutput: !!els.optMustOutput.checked,
      },
    };

    if (mode === "single") {
      payload.containerName = els.containerName.value.trim();
    } else if (mode === "batchFromList") {
      payload.containerList = els.containerList.value;
    }

    return payload;
  }

  function validatePayload(payload) {
    if (payload.mode === "single") {
      if (!payload.containerName) {
        throw new Error("单个容器模式下必须填写容器名称。");
      }
    }
    if (payload.mode === "batchFromList") {
      if (!payload.containerList || !payload.containerList.trim()) {
        throw new Error("批量模式下请粘贴至少一个容器名称。");
      }
    }
    if (payload.options.mustOutput) {
      const yes = window.confirm(
        "您启用了 --must-output，这会跳过脚本的三次确认，可能破坏系统文件。\n仅在完全理解风险时才应启用。\n\n是否继续？"
      );
      if (!yes) {
        throw new Error("已取消执行（--must-output 未确认）。");
      }
    }
  }

  function buildCommandPreview(payload) {
    const args = [];
    const opts = payload.options;

    if (opts.outputDir && opts.outputDir !== config.options.outputDir.default) {
      args.push("-o", JSON.stringify(opts.outputDir));
    }
    if (opts.exportType && opts.exportType !== config.options.exportType.default) {
      args.push("--type", opts.exportType);
    }
    if (opts.privacy) args.push("--privacy");
    if (opts.clean) args.push("--clean");
    if (opts.dryRun) args.push("--dry-run");
    if (opts.overwrite) args.push("--overwrite");
    if (opts.quiet) args.push("--quiet");
    if (opts.mustOutput) args.push("--must-output");

    if (payload.mode === "single" && payload.containerName) {
      args.push(payload.containerName);
    } else if (payload.mode === "batchFromList") {
      args.push("--file", "<临时文件路径>");
    } else if (payload.mode === "all-run") {
      args.push("--all-run");
    } else if (payload.mode === "all") {
      args.push("--all");
    } else if (payload.mode === "all-stop") {
      args.push("--all-stop");
    }

    return "bash export/sh/docker-export-compose.sh " + args.join(" ");
  }

  function setCommandPreview(text) {
    els.cmdPreview.textContent = text;
  }

  function setLastCommand(text) {
    lastCommand = text || "";
    if (els.lastCommandText) {
      els.lastCommandText.textContent = lastCommand || "暂无";
    }
  }

  function setLog(text) {
    els.logOutput.textContent = text || "";
    els.logOutput.scrollTop = els.logOutput.scrollHeight;
  }

  function appendLog(text) {
    els.logOutput.textContent += text;
    els.logOutput.scrollTop = els.logOutput.scrollHeight;
  }

  function setTaskInfo(text) {
    els.currentTaskInfo.textContent = text || "";
  }

  async function runTask() {
    const payload = buildRequestPayload();
    try {
      validatePayload(payload);
    } catch (e) {
      alert(e.message || e);
      return;
    }

    const cmdText = buildCommandPreview(payload);
    setCommandPreview(cmdText);
    setLog("");
    setTaskInfo("正在提交任务...");
    els.btnRun.disabled = true;

    try {
      const res = await api.runTask(payload);
      currentTaskId = res.taskId;
      setLastCommand(cmdText);
      setTaskInfo("任务 ID: " + currentTaskId + "，正在执行...");
      startPolling(currentTaskId);
    } catch (e) {
      if (handleAuthError(e)) {
        setTaskInfo("");
        els.btnRun.disabled = false;
        return;
      }
      setTaskInfo("");
      setLog("调用后端失败：\n" + (e.message || e));
      els.btnRun.disabled = false;
    }
  }

  async function pollOnce(taskId) {
    try {
      const [status, logs] = await Promise.all([
        api.getStatus(taskId),
        api.getLogs(taskId),
      ]);
      if (logs && typeof logs.log === "string") {
        setLog(logs.log);
      }
      if (!status || !status.found) {
        setTaskInfo("任务未找到或已过期。");
        stopPolling();
        els.btnRun.disabled = false;
        return;
      }
      if (status.finished) {
        const exitCode = status.exitCode;
        if (exitCode === 0) {
          setTaskInfo("任务完成，退出码 0（成功）。");
        } else {
          setTaskInfo("任务完成，退出码 " + exitCode + "（可能有错误）。");
        }
        stopPolling();
        els.btnRun.disabled = false;
      }
    } catch (e) {
      if (handleAuthError(e)) {
        stopPolling();
        els.btnRun.disabled = false;
        return;
      }
      appendLog("\n[WebUI] 轮询失败：" + (e.message || e) + "\n");
      stopPolling();
      els.btnRun.disabled = false;
    }
  }

  function startPolling(taskId) {
    if (pollTimer) {
      clearInterval(pollTimer);
    }
    pollTimer = setInterval(function () {
      pollOnce(taskId);
    }, 2000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function openConfigModal() {
    if (!els.configModal) return;
    els.configModal.classList.remove("hidden");
    if (els.configStatus) {
      els.configStatus.textContent = "正在加载 config...";
    }
    loadConfig();
  }

  function closeConfigModal() {
    if (!els.configModal) return;
    els.configModal.classList.add("hidden");
  }

  async function loadConfig() {
    try {
      const res = await api.getConfig();
      if (els.configContent) {
        els.configContent.value = res && typeof res.content === "string" ? res.content : "";
      }
      if (els.configStatus) {
        els.configStatus.textContent = "已加载当前 config 文件。";
      }
    } catch (e) {
      if (handleAuthError(e)) return;
      if (els.configStatus) {
        els.configStatus.textContent = "加载失败：" + (e.message || e);
      }
    }
  }

  async function saveConfig() {
    if (!els.configContent) return;
    const content = els.configContent.value;
    if (!content.trim()) {
      alert("config 内容不能为空。");
      return;
    }
    if (els.configStatus) {
      els.configStatus.textContent = "正在保存 config...";
    }
    try {
      await api.saveConfig(content);
      if (els.configStatus) {
        els.configStatus.textContent = "保存成功。新配置将在下次脚本运行时生效。";
      }
    } catch (e) {
      if (handleAuthError(e)) return;
      if (els.configStatus) {
        els.configStatus.textContent = "保存失败：" + (e.message || e);
      }
      alert("保存 config 失败：" + (e.message || e));
    }
  }

  function refreshPreview() {
    const payload = buildRequestPayload();
    const cmdText = buildCommandPreview(payload);
    setCommandPreview(cmdText);
  }

  function openPicker(mode) {
    if (!els.containerPicker) return;
    pickerMode = mode || "single";
    pickerSelected.clear();
    els.containerPicker.classList.remove("hidden");
    els.containerFilter.value = "";
    loadContainers();
  }

  function closePicker() {
    if (!els.containerPicker) return;
    els.containerPicker.classList.add("hidden");
  }

  function renderContainers(list) {
    if (!els.containerListItems) return;
    els.containerListItems.innerHTML = "";
    if (!list || list.length === 0) {
      const div = document.createElement("div");
      div.className = "container-row";
      div.textContent = "没有找到任何容器。";
      els.containerListItems.appendChild(div);
      return;
    }
    list.forEach((item) => {
      const row = document.createElement("div");
      row.className = "container-row";
      const checkSpan = document.createElement("span");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = pickerSelected.has(item.name);
      checkbox.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (checkbox.checked) {
          pickerSelected.add(item.name);
        } else {
          pickerSelected.delete(item.name);
        }
        updatePickerSelectedCount();
      });
      checkSpan.appendChild(checkbox);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = item.name || "-";
      const imageSpan = document.createElement("span");
      imageSpan.textContent = item.image || "-";
      const statusSpan = document.createElement("span");
      statusSpan.textContent = item.status || "-";
      row.appendChild(checkSpan);
      row.appendChild(nameSpan);
      row.appendChild(imageSpan);
      row.appendChild(statusSpan);
      row.addEventListener("click", () => {
        if (pickerMode === "single") {
          if (item.name && els.containerName) {
            els.containerName.value = item.name;
          }
          closePicker();
          refreshPreview();
        } else {
          if (pickerSelected.has(item.name)) {
            pickerSelected.delete(item.name);
            checkbox.checked = false;
          } else {
            pickerSelected.add(item.name);
            checkbox.checked = true;
          }
          updatePickerSelectedCount();
        }
      });
      els.containerListItems.appendChild(row);
    });
  }

  async function loadContainers() {
    try {
      const res = await api.listContainers();
      const items = (res && res.items) || [];
      allContainersCache = items;
      applyContainerFilter();
    } catch (e) {
      if (handleAuthError(e)) return;
      allContainersCache = [];
      renderContainers([]);
      if (els.containerListItems) {
        els.containerListItems.textContent =
          "获取容器列表失败：" + (e.message || e);
      }
    }
  }

  function updatePickerSelectedCount() {
    if (!els.pickerSelectedCount) return;
    const n = pickerSelected.size;
    if (n === 0) {
      els.pickerSelectedCount.textContent = "未选择任何容器。";
    } else {
      els.pickerSelectedCount.textContent = "已选择 " + n + " 个容器。";
    }
  }

  function applyContainerFilter() {
    const kw = (els.containerFilter.value || "").trim().toLowerCase();
    if (!kw) {
      return renderContainers(allContainersCache);
    }
    const filtered = allContainersCache.filter((it) => {
      return (
        (it.name && it.name.toLowerCase().includes(kw)) ||
        (it.image && it.image.toLowerCase().includes(kw)) ||
        (it.status && it.status.toLowerCase().includes(kw))
      );
    });
    renderContainers(filtered);
  }

  function init() {
    updateModeVisibility();
    setCommandPreview("等待参数配置...");
    setLastCommand("");

    applyAuthVisibility();
    setLoginStatus("正在检查登录状态...");

    refreshSession().then(function () {
      if (!authSession || !authSession.authenticated) {
        setLoginStatus("请先登录后再使用 WebUI。");
      } else if (authSession.mfaEnabled && !authSession.mfaVerified) {
        setLoginStatus("请输入动态验证码完成登录。");
      }
    });

    els.modeRadios.forEach(function (r) {
      r.addEventListener("change", function () {
        updateModeVisibility();
        refreshPreview();
      });
    });

    els.btnRun.addEventListener("click", function () {
      runTask();
    });

    // 交互控件变更时实时预览命令
    [
      els.containerName,
      els.containerList,
      els.outputDir,
      els.exportType,
      els.optPrivacy,
      els.optClean,
      els.optDryRun,
      els.optOverwrite,
      els.optQuiet,
      els.optMustOutput,
    ].forEach(function (el) {
      if (!el) return;
      const evtName = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evtName, function () {
        refreshPreview();
      });
    });

    if (els.btnPickContainer) {
      els.btnPickContainer.addEventListener("click", function () {
        openPicker("single");
      });
    }

    if (els.btnPickContainerBatch) {
      els.btnPickContainerBatch.addEventListener("click", function () {
        openPicker("batch");
      });
    }

    if (els.btnClosePicker) {
      els.btnClosePicker.addEventListener("click", function () {
        closePicker();
      });
    }

    if (els.containerFilter) {
      els.containerFilter.addEventListener("input", function () {
        applyContainerFilter();
      });
    }

    if (els.btnApplySelection) {
      els.btnApplySelection.addEventListener("click", function () {
        if (pickerMode !== "batch") {
          alert("当前为单个导出模式，批量应用只对批量模式有效。");
          return;
        }
        if (!els.containerList) return;
        const names = Array.from(pickerSelected).filter(Boolean);
        if (names.length === 0) {
          alert("请先勾选至少一个容器。");
          return;
        }
        els.containerList.value = names.join("\n");
        closePicker();
        refreshPreview();
      });
    }

    if (els.btnOpenConfig) {
      els.btnOpenConfig.addEventListener("click", function () {
        openConfigModal();
      });
    }

    if (els.btnOpenMfa) {
      els.btnOpenMfa.addEventListener("click", function () {
        openMfaModal();
      });
    }

    if (els.btnAuth) {
      els.btnAuth.addEventListener("click", function () {
        if (!authSession || !authSession.authenticated) {
          openLoginModal("password");
          return;
        }
        if (authSession.mfaEnabled && !authSession.mfaVerified) {
          openLoginModal("otp");
          return;
        }
        const ok = window.confirm("确认退出登录？");
        if (!ok) return;
        doLogout();
      });
    }

    if (els.btnCloseLogin) {
      els.btnCloseLogin.addEventListener("click", function () {
        closeLoginModal();
      });
    }

    if (els.btnLogin) {
      els.btnLogin.addEventListener("click", function () {
        doLoginPassword();
      });
    }

    if (els.btnVerifyOtp) {
      els.btnVerifyOtp.addEventListener("click", function () {
        doVerifyOtp();
      });
    }

    if (els.btnOpenPassword) {
      els.btnOpenPassword.addEventListener("click", function () {
        openPasswordModal();
      });
    }

    if (els.btnClosePassword) {
      els.btnClosePassword.addEventListener("click", function () {
        closePasswordModal();
      });
    }

    if (els.btnChangePassword) {
      els.btnChangePassword.addEventListener("click", function () {
        changePassword();
      });
    }

    if (els.btnCloseMfa) {
      els.btnCloseMfa.addEventListener("click", function () {
        closeMfaModal();
      });
    }

    if (els.btnMfaInit) {
      els.btnMfaInit.addEventListener("click", function () {
        initMfa();
      });
    }

    if (els.btnMfaEnable) {
      els.btnMfaEnable.addEventListener("click", function () {
        enableMfa();
      });
    }

    if (els.btnMfaDisable) {
      els.btnMfaDisable.addEventListener("click", function () {
        disableMfa();
      });
    }

    if (els.btnMfaReset) {
      els.btnMfaReset.addEventListener("click", function () {
        resetMfa();
      });
    }

    if (els.btnMfaReset2) {
      els.btnMfaReset2.addEventListener("click", function () {
        resetMfa();
      });
    }

    if (els.btnCloseConfig) {
      els.btnCloseConfig.addEventListener("click", function () {
        closeConfigModal();
      });
    }

    if (els.btnSaveConfig) {
      els.btnSaveConfig.addEventListener("click", function () {
        saveConfig();
      });
    }

    if (els.btnCopyCommand) {
      els.btnCopyCommand.addEventListener("click", function () {
        const text = els.cmdPreview ? els.cmdPreview.textContent || "" : "";
        if (!text) {
          alert("当前没有可复制的命令。");
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {},
            function () {
              alert("复制失败，请手动选择命令复制。");
            }
          );
        } else {
          // 兼容老浏览器
          const temp = document.createElement("textarea");
          temp.value = text;
          document.body.appendChild(temp);
          temp.select();
          try {
            document.execCommand("copy");
          } catch (e) {
            alert("复制失败，请手动选择命令复制。");
          }
          document.body.removeChild(temp);
        }
      });
    }

    if (els.btnDownloadConfig) {
      els.btnDownloadConfig.addEventListener("click", function () {
        if (!els.configContent) return;
        const text = (els.configContent.value || "").trim();
        if (!text) {
          alert("当前 config 内容为空，无法导出。");
          return;
        }
        const now = new Date();
        const ts =
          now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, "0") +
          String(now.getDate()).padStart(2, "0") +
          "-" +
          String(now.getHours()).padStart(2, "0") +
          String(now.getMinutes()).padStart(2, "0");
        const filename = "docker-export-config-" + ts + ".conf";

        const blob = new Blob([text + "\n"], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    if (els.optMustOutput) {
      els.optMustOutput.addEventListener("change", function () {
        if (els.optMustOutput.checked) {
          const ok = window.confirm(
            "⚠️ 您正在启用 --must-output。\n\n" +
              "该选项会跳过脚本内部对“核心系统目录”的三重确认，如果输出目录设置不当，" +
              "可能会覆盖或破坏系统关键文件，导致系统无法启动。\n\n" +
              "仅在完全理解风险，且明确知道自己在做什么时才应启用。\n\n" +
              "是否确认启用 --must-output ？"
          );
          if (!ok) {
            els.optMustOutput.checked = false;
          }
        }
        refreshPreview();
      });
    }

    if (els.btnLoadBatchFile && els.batchFileInput) {
      els.btnLoadBatchFile.addEventListener("click", function () {
        els.batchFileInput.click();
      });

      els.batchFileInput.addEventListener("change", function () {
        const file = els.batchFileInput.files && els.batchFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
          const text = String(e.target && e.target.result ? e.target.result : "");
          const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#"));
          if (!els.containerList) return;
          els.containerList.value = lines.join("\n");
          refreshPreview();
        };
        reader.readAsText(file);
        // 重置 input，方便再次选择同一文件
        els.batchFileInput.value = "";
      });
    }

    if (els.btnSaveBatchFile) {
      els.btnSaveBatchFile.addEventListener("click", function () {
        if (!els.containerList) return;
        const text = (els.containerList.value || "").trim();
        if (!text) {
          alert("当前批量列表为空，无法导出。");
          return;
        }
        const now = new Date();
        const ts =
          now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, "0") +
          String(now.getDate()).padStart(2, "0") +
          "-" +
          String(now.getHours()).padStart(2, "0") +
          String(now.getMinutes()).padStart(2, "0");
        const filename = "docker-export-containers-" + ts + ".txt";

        const blob = new Blob([text + "\n"], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // 初始预览一次
    refreshPreview();
  }

  document.addEventListener("DOMContentLoaded", init);
})();


