(() => {
  const PROFILE_KEY = "einmaleins.student.profile.v1";
  const CLASS_RE = /^M(?:[1-9]|1[0-6])$/i;
  const PORTRAIT_RE = /^M(?:[1-9]|1[0-6])$/i;

  function readClassName() {
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const profile = JSON.parse(raw);
      const value = typeof profile?.className === "string" ? profile.className.trim() : "";
      return CLASS_RE.test(value) ? value.toUpperCase() : null;
    } catch {
      return null;
    }
  }

  function syncMascot() {
    const screen = document.querySelector(".start-screen");
    const card = screen?.querySelector(".welcome-card");
    if (!(card instanceof HTMLElement)) return;

    const className = readClassName();
    card.querySelector(".start-class-mascot")?.remove();
    if (!className) return;

    const mascot = document.createElement("img");
    mascot.className = "start-class-mascot";
    mascot.src = `./${className}.png`;
    mascot.alt = `Klassentier ${className}`;
    mascot.setAttribute("aria-hidden", "true");
    card.prepend(mascot);
  }

  function syncHighscorePortraits() {
    document.querySelectorAll(".school-highscore-mascot img").forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;
      const match = (image.alt || "").match(/Klasse\s+(M(?:[1-9]|1[0-6]))/i);
      if (!match || !PORTRAIT_RE.test(match[1])) return;
      const className = match[1].toUpperCase();
      const portraitSrc = `./P${className.slice(1)}.png`;
      if (image.dataset.highscorePortrait === portraitSrc) return;
      image.dataset.highscorePortrait = portraitSrc;
      image.src = portraitSrc;
    });
  }

  function syncAll() {
    syncMascot();
    syncHighscorePortraits();
  }

  const observer = new MutationObserver(syncAll);
  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });
  observer.observe(document.body, { childList: true, subtree: true });
  syncAll();
})();
