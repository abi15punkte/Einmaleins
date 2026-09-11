(() => {
  const PORTRAIT_QUERY = "(orientation: portrait)";
  const isPortrait = () => window.matchMedia?.(PORTRAIT_QUERY).matches ?? window.innerHeight > window.innerWidth;
  const getApp = () => document.getElementById("app");

  function updatePortraitGuard() {
    const app = getApp();
    if (!app) return;

    const portrait = isPortrait();
    document.documentElement.classList.toggle("portrait-blocked", portrait);

    let guard = document.getElementById("portrait-guard");
    if (portrait && !guard) {
      guard = document.createElement("div");
      guard.id = "portrait-guard";
      guard.setAttribute("role", "dialog");
      guard.setAttribute("aria-modal", "true");
      guard.innerHTML = '<div class="portrait-guard-card"><div class="portrait-guard-icon" aria-hidden="true">↻</div><h1>Bitte Gerät drehen</h1><p>Dieses Spiel funktioniert nur im Querformat.</p></div>';
      document.body.appendChild(guard);
    } else if (!portrait && guard) {
      guard.remove();
    }
  }

  function tryLockLandscape() {
    if (!screen.orientation?.lock) return;
    void screen.orientation.lock("landscape").catch(() => {
      // Orientation lock is not available in every browser/context.
    });
  }

  window.addEventListener("load", () => {
    tryLockLandscape();
    updatePortraitGuard();
  });
  window.addEventListener("resize", updatePortraitGuard, { passive: true });
  window.addEventListener("orientationchange", () => {
    tryLockLandscape();
    updatePortraitGuard();
  });

  const mediaQuery = window.matchMedia?.(PORTRAIT_QUERY);
  mediaQuery?.addEventListener?.("change", updatePortraitGuard);

  const observer = new MutationObserver(updatePortraitGuard);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  updatePortraitGuard();
})();
