(() => {
  const PROFILE_KEY = "einmaleins.student.profile.v1";
  const CLASS_RE = /^M(?:[1-9]|1[0-6])$/i;
  const PORTRAIT_RE = /^M(?:[1-9]|1[0-6])$/i;
  const TEST_MASCOT_COUNT = 16;

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

  function installMascotCycle(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.mascotCycleInstalled === "true") return;

    image.dataset.mascotCycleInstalled = "true";
    image.dataset.mascotCycleIndex = "1";
    image.src = "./M1.png";
    image.alt = "Klassentier M1";

    image.addEventListener("animationiteration", () => {
      const current = Number.parseInt(image.dataset.mascotCycleIndex || "1", 10);
      const next = current >= TEST_MASCOT_COUNT ? 1 : current + 1;
      image.dataset.mascotCycleIndex = String(next);
      image.src = `./M${next}.png`;
      image.alt = `Klassentier M${next}`;
    });
  }

  function syncClassMascot() {
    const mascot = document.querySelector(".start-class-overlay");
    if (mascot instanceof HTMLImageElement) installMascotCycle(mascot);
  }

  function syncAll() {
    syncHighscorePortraits();
    syncClassMascot();
  }

  const observer = new MutationObserver(syncAll);
  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });
  observer.observe(document.body, { childList: true, subtree: true });
  syncAll();
})();
