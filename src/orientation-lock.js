(() => {
  const STARTUP_SPLASH_MS = 5000;
  const isPortrait = () => window.innerHeight > window.innerWidth;
  const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true);

  function installStartupSplash() {
    const existing = document.getElementById("startup-splash");
    if (existing) return;

    const splash = document.createElement("div");
    splash.id = "startup-splash";
    splash.setAttribute("aria-hidden", "true");
    Object.assign(splash.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      background: "#fff",
      pointerEvents: "auto"
    });

    document.documentElement.appendChild(splash);
    window.setTimeout(() => splash.remove(), STARTUP_SPLASH_MS);
  }

  function updatePortraitState() {
    const portrait = isPortrait();
    document.documentElement.classList.toggle("portrait-blocked", portrait);
    document.documentElement.setAttribute("data-orientation", portrait ? "portrait" : "landscape");
  }

  function tryLockLandscape() {
    if (!screen.orientation?.lock) return;
    void screen.orientation.lock("landscape").catch(() => {
      // Orientation lock is not available in every browser/context.
    });
  }

  function installStandaloneSnapshotGuard() {
    if (!isStandalone()) return;

    let snapshotMask = null;

    const createMask = () => {
      if (snapshotMask) return;
      snapshotMask = document.createElement("div");
      snapshotMask.id = "standalone-snapshot-mask";
      snapshotMask.setAttribute("aria-hidden", "true");
      Object.assign(snapshotMask.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483647",
        background: "#e9f7ff",
        pointerEvents: "none",
        opacity: "1"
      });
      document.documentElement.appendChild(snapshotMask);
    };

    const removeMask = () => {
      snapshotMask?.remove();
      snapshotMask = null;
    };

    // iPadOS may capture the standalone web app while it is being sent to the
    // background. Keep that captured frame visually stable instead of allowing
    // an intermediate WebKit launch/resume state to become the next snapshot.
    window.addEventListener("pagehide", createMask, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") createMask();
      else if (document.visibilityState === "visible") {
        window.requestAnimationFrame(() => window.requestAnimationFrame(removeMask));
      }
    });
    window.addEventListener("pageshow", () => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(removeMask));
    });
  }

  installStartupSplash();
  updatePortraitState();
  installStandaloneSnapshotGuard();

  window.addEventListener("load", () => {
    tryLockLandscape();
    updatePortraitState();
  });
  window.addEventListener("resize", updatePortraitState, { passive: true });
  window.addEventListener("orientationchange", () => {
    tryLockLandscape();
    updatePortraitState();
  }, { passive: true });
  window.visualViewport?.addEventListener("resize", updatePortraitState, { passive: true });

  const mediaQuery = window.matchMedia?.("(orientation: portrait)");
  mediaQuery?.addEventListener?.("change", updatePortraitState);
})();
