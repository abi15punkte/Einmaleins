(() => {
  const isPortrait = () => window.innerHeight > window.innerWidth;

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

  updatePortraitState();

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
