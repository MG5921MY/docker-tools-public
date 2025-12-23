(function () {
  const THEME_KEY = "dockerExportTheme";
  const LAYOUT_KEY = "dockerExportLayout"; // 'wide' | 'narrow'

  function applyTheme(theme) {
    const body = document.body;
    if (theme === "dark") {
      body.classList.add("theme-dark");
    } else {
      body.classList.remove("theme-dark");
      theme = "light";
    }
    localStorage.setItem(THEME_KEY, theme);

    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "切换到浅色主题" : "切换到深色主题";
    }
  }

  function applyLayout(layout) {
    const body = document.body;
    if (layout === "narrow") {
      body.classList.add("layout-narrow");
    } else {
      body.classList.remove("layout-narrow");
      layout = "wide";
    }
    localStorage.setItem(LAYOUT_KEY, layout);

    const btn = document.getElementById("layoutToggle");
    if (btn) {
      btn.textContent =
        layout === "narrow" ? "切换为宽屏布局" : "切换为窄屏布局";
    }
  }

  function initThemeAndLayout() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);

    const savedLayout = localStorage.getItem(LAYOUT_KEY) || "wide";
    applyLayout(savedLayout);

    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        const current =
          document.body.classList.contains("theme-dark") ? "dark" : "light";
        applyTheme(current === "dark" ? "light" : "dark");
      });
    }

    const layoutBtn = document.getElementById("layoutToggle");
    if (layoutBtn) {
      layoutBtn.addEventListener("click", function () {
        const isNarrow = document.body.classList.contains("layout-narrow");
        applyLayout(isNarrow ? "wide" : "narrow");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", initThemeAndLayout);
})();


