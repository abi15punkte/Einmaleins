(() => {
  const PROFILE_KEY = "einmaleins.student.profile.v1";
  const CLASS_RE = /^M(?:[1-9]|1[0-6])$/i;
  const PORTRAIT_RE = /^M(?:[1-9]|1[0-6])$/i;

  function redirectHighscoreAction(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest(".result-highscore-action button");
    if (!(button instanceof HTMLButtonElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign("./highscore.html");
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
    syncHighscorePortraits();
  }

  document.addEventListener("click", redirectHighscoreAction, true);

  const observer = new MutationObserver(syncAll);
  const app = document.getElementById("app");
  if (app) observer.observe(app, { childList: true, subtree: true });
  observer.observe(document.body, { childList: true, subtree: true });
  syncAll();
})();
