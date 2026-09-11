(() => {
  const STATUS_CAPTION_IDS = ["round-caption", "task-number-caption"];
  let lastGameScreen = null;

  function moveStatusCaptions() {
    const gameScreen = document.querySelector(".game-screen");
    if (!gameScreen) {
      lastGameScreen = null;
      return;
    }

    const header = gameScreen.querySelector(".game-header");
    if (!header) return;

    let group = header.querySelector(".header-statuses");
    if (!group) {
      group = document.createElement("div");
      group.className = "header-statuses";
      group.setAttribute("aria-label", "Level und Aufgabe");
      header.insertBefore(group, header.firstChild);
    }

    for (const id of STATUS_CAPTION_IDS) {
      const element = document.getElementById(id);
      if (element && element.parentElement !== group) {
        group.appendChild(element);
      }
    }

    const taskCaption = gameScreen.querySelector(".task-caption");
    if (taskCaption && taskCaption.children.length === 0) taskCaption.remove();
    lastGameScreen = gameScreen;
  }

  const app = document.getElementById("app");
  if (!app) return;

  const observer = new MutationObserver(() => {
    if (lastGameScreen !== document.querySelector(".game-screen")) {
      requestAnimationFrame(moveStatusCaptions);
      return;
    }
    moveStatusCaptions();
  });

  observer.observe(app, { childList: true, subtree: true });
  moveStatusCaptions();
})();
