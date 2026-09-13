(() => {
  const POINTS_FLIGHT_MS = 1520;
  const SCORE_ARRIVAL_MS = 850;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCORE_UPDATE_DELAY_MS = REDUCED_MOTION ? 0 : SCORE_ARRIVAL_MS;
  const MULTIPLIER_COLORS = { 1: "#000000", 2: "#ffc65a", 3: "#ee737f", 5: "#9877e6" };
  const PORTRAIT_RE = /^M(?:[1-9]|1[0-6])$/i;
  const MASCOT_COUNT = 16;
  const MASCOT_CYCLE_MS = 8000;
  let currentGameScreen = null;
  let feedbackSignature = "";
  let displayedScore = 0;
  let earnedStar1ThisGame = false;
  let highscoreOverlayWasVisible = false;
  let mascotCycleImage = null;
  let mascotCycleTimer = null;
  let mascotCycleIndex = 1;

  function ensureAlienAnimationStyles() {
    if (document.getElementById("highscore-alien-animation")) return;
    const style = document.createElement("style");
    style.id = "highscore-alien-animation";
    style.textContent = `
      @media (orientation: landscape) {
        .game-screen::after,
        .start-screen::after,
        .result-screen::after,
        .school-highscore-overlay::after { content: none !important; display: none !important; }
        body::after {
          content: "" !important;
          position: fixed !important;
          left: -4vw !important;
          bottom: 3vh !important;
          width: 24vw !important;
          height: 24vw !important;
          background: url("./Alien.png") center / contain no-repeat !important;
          pointer-events: none !important;
          z-index: 30000 !important;
          transform-origin: 50% 100%;
          animation: highscore-alien-float 5.8s ease-in-out infinite;
          will-change: transform;
        }
      }
      @keyframes highscore-alien-float {
        0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg) scale(1); }
        25% { transform: translate3d(0.35vw, -0.7vh, 0) rotate(0.5deg) scale(1.012); }
        50% { transform: translate3d(0, -1.1vh, 0) rotate(1deg) scale(1.02); }
        75% { transform: translate3d(-0.35vw, -0.55vh, 0) rotate(0.25deg) scale(1.01); }
      }
      @media (prefers-reduced-motion: reduce) {
        body::after { animation: none !important; transform: none !important; }
      }
    `;
    document.head.appendChild(style);
  }
  ensureAlienAnimationStyles();

  function ensureBuildIndicatorStyles() {
    if (document.getElementById("build-indicator-styles")) return;
    const style = document.createElement("style");
    style.id = "build-indicator-styles";
    style.textContent = `
      .app-build-indicator {
        position: absolute;
        right: 14px;
        bottom: 10px;
        z-index: 2;
        margin: 0;
        color: rgba(23, 32, 51, 0.42);
        font-size: 11px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.06em;
      }
    `;
    document.head.appendChild(style);
  }

  function getCurrentBuildId() {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!(manifestLink instanceof HTMLLinkElement)) return "dev";
    const buildId = new URL(manifestLink.href, document.baseURI).searchParams.get("build");
    return buildId && buildId !== "__BUILD_ID__" ? buildId : "dev";
  }

  function syncBuildIndicator() {
    const card = document.querySelector(".start-screen .welcome-card");
    if (!(card instanceof HTMLElement)) return;
    ensureBuildIndicatorStyles();
    let indicator = card.querySelector(".app-build-indicator");
    if (!(indicator instanceof HTMLElement)) {
      indicator = document.createElement("p");
      indicator.className = "app-build-indicator";
      indicator.setAttribute("aria-label", "Buildnummer");
      card.appendChild(indicator);
    }
    indicator.textContent = `Build ${getCurrentBuildId()}`;
  }

  function syncHighscorePortraits() {
    document.querySelectorAll(".school-highscore-mascot img").forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;
      const match = (image.alt || "").match(/Klasse\s+(M(?:[1-9]|1[0-6]))/i);
      if (!match || !PORTRAIT_RE.test(match[1])) return;
      const className = match[1].toUpperCase();
      const portraitSrc = `./P${className.slice(1)}.png`;
      if (image.dataset.highscorePortrait === portraitSrc && image.src.endsWith(portraitSrc.replace("./", "/"))) return;
      image.dataset.highscorePortrait = portraitSrc;
      image.src = portraitSrc;
    });
  }

  function syncClassMascotCycle() {
    const image = document.querySelector(".start-class-overlay");
    if (!(image instanceof HTMLImageElement)) {
      if (mascotCycleTimer !== null) window.clearTimeout(mascotCycleTimer);
      mascotCycleTimer = null;
      mascotCycleImage = null;
      mascotCycleIndex = 1;
      return;
    }

    if (image !== mascotCycleImage) {
      if (mascotCycleTimer !== null) window.clearTimeout(mascotCycleTimer);
      mascotCycleImage = image;
      mascotCycleIndex = 1;
      image.dataset.mascotCycleInstalled = "true";
      image.dataset.mascotCycleIndex = "1";
      image.src = "./M1.png";
      image.alt = "Klassentier M1";

      const advance = () => {
        if (mascotCycleImage !== image || !document.body.contains(image)) return;
        mascotCycleIndex = mascotCycleIndex >= MASCOT_COUNT ? 1 : mascotCycleIndex + 1;
        image.dataset.mascotCycleIndex = String(mascotCycleIndex);
        image.src = `./M${mascotCycleIndex}.png`;
        image.alt = `Klassentier M${mascotCycleIndex}`;
        mascotCycleTimer = window.setTimeout(advance, MASCOT_CYCLE_MS);
      };

      mascotCycleTimer = window.setTimeout(advance, MASCOT_CYCLE_MS);
    }
  }

  function updateCriticalTime(timeElement) {
    const match = (timeElement.textContent ?? "").match(/^(\d+):(\d{2})$/);
    const seconds = match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
    timeElement.classList.toggle("time-critical", seconds <= 59);
  }

  function isShowingExpectedSolution(answerElement, feedbackElement) {
    const text = answerElement.textContent?.trim() ?? "";
    if (!text) return false;
    const feedbackExpected = feedbackElement.classList.contains("feedback-wrong") ? (feedbackElement.textContent ?? "").match(/Die Antwort ist\s+(\d+)\.?/i)?.[1] : null;
    if (feedbackExpected && text === feedbackExpected) return true;
    const factorA = Number(currentGameScreen?.querySelector("#factor-a")?.textContent ?? "");
    const factorB = Number(currentGameScreen?.querySelector("#factor-b")?.textContent ?? "");
    if (!Number.isFinite(factorA) || !Number.isFinite(factorB)) return false;
    return text === String(factorA * factorB);
  }

  function syncAnswerColor(answerElement, feedbackElement) {
    if (answerElement.classList.contains("answer-feedback-wrong")) { answerElement.style.setProperty("color", "#ee737f", "important"); return; }
    if (answerElement.classList.contains("answer-feedback-correct") || isShowingExpectedSolution(answerElement, feedbackElement)) { answerElement.style.setProperty("color", "#69cb6c", "important"); return; }
    answerElement.style.setProperty("color", "#000000", "important");
  }

  function alignAnswerBoxWithKeypad() {
    if (currentGameScreen === null) return;
    const equation = currentGameScreen.querySelector(".task-equation");
    const answerElement = currentGameScreen.querySelector("#answer");
    const firstKey = currentGameScreen.querySelector(".keypad-key:first-child");
    if (!(equation instanceof HTMLElement) || !(answerElement instanceof HTMLElement) || !(firstKey instanceof HTMLElement)) return;
    equation.style.transform = "translateY(0)";
    const delta = firstKey.getBoundingClientRect().top - answerElement.getBoundingClientRect().top;
    equation.style.transform = `translateY(${delta}px)`;
  }
  function scheduleAnswerBoxAlignment() { window.requestAnimationFrame(() => window.requestAnimationFrame(alignAnswerBoxWithKeypad)); }

  function triggerScoreArrival(scoreElement) {
    const scoreCard = scoreElement.closest(".stat-score");
    if (!scoreCard) return;
    scoreCard.classList.remove("score-arrival", "score-arrival-medium", "score-arrival-strong");
    const score = Number(scoreElement.textContent ?? "0") || 0;
    if (score > 199) scoreCard.classList.add("score-arrival-strong"); else if (score > 99) scoreCard.classList.add("score-arrival-medium");
    void scoreCard.offsetWidth;
    scoreCard.classList.add("score-arrival");
    window.setTimeout(() => scoreCard.classList.remove("score-arrival", "score-arrival-medium", "score-arrival-strong"), 420);
  }

  function flyPoints(card, scoreElement, points, multiplier) {
    const cardRect = card.getBoundingClientRect();
    const scoreRect = scoreElement.getBoundingClientRect();
    const startX = cardRect.left + cardRect.width * 0.72;
    const startY = cardRect.top + cardRect.height * 0.52;
    const targetX = scoreRect.left + scoreRect.width * 0.5;
    const targetY = scoreRect.top + scoreRect.height * 0.5;
    const particle = document.createElement("span");
    particle.className = `points-fly multiplier-x${multiplier}`;
    particle.style.color = MULTIPLIER_COLORS[multiplier] ?? MULTIPLIER_COLORS[1];
    particle.textContent = `+${points}`;
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty("--fly-x", `${targetX - startX}px`);
    particle.style.setProperty("--fly-y", `${targetY - startY}px`);
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), POINTS_FLIGHT_MS + 90);
  }

  function resetScoreForGame(screen) {
    if (screen === currentGameScreen) return;
    currentGameScreen = screen;
    feedbackSignature = "";
    displayedScore = Number(screen.querySelector("#score")?.textContent ?? "0") || 0;
    earnedStar1ThisGame = false;
  }
  function applyPointsWhenArrived(screen, scoreElement, points) {
    window.setTimeout(() => { if (currentGameScreen !== screen) return; displayedScore += points; scoreElement.textContent = String(displayedScore); triggerScoreArrival(scoreElement); }, SCORE_UPDATE_DELAY_MS);
  }
  function tryCloseApp() {
    window.close();
    window.setTimeout(() => { const status = document.querySelector("#close-app-status"); if (!(status instanceof HTMLElement)) return; status.textContent = "Das Beenden wird auf deinem iPad nicht unterstützt. Bitte schließe die App selbst."; status.hidden = false; }, 250);
  }
  function ensureResultCloseAction() {
    const resultCard = document.querySelector(".result-card");
    if (!(resultCard instanceof HTMLElement) || resultCard.querySelector("#close-app")) return;
    const againButton = resultCard.querySelector("#again");
    const closeButton = document.createElement("button");
    closeButton.type = "button"; closeButton.className = "result-button result-button-secondary"; closeButton.id = "close-app"; closeButton.textContent = "App schließen"; closeButton.addEventListener("click", tryCloseApp);
    const status = document.createElement("p");
    status.id = "close-app-status"; status.className = "close-app-status"; status.hidden = true; status.setAttribute("aria-live", "polite");
    if (againButton) { againButton.insertAdjacentElement("afterend", closeButton); closeButton.insertAdjacentElement("afterend", status); } else resultCard.append(closeButton, status);
  }
  function syncResultStars() {
    const resultStars = document.querySelector(".result-stars");
    const statsStars = document.querySelector(".result-screen .result-stat:last-child strong");
    if (!(resultStars instanceof HTMLElement) || !(statsStars instanceof HTMLElement)) return;
    if (statsStars.querySelector("img")) { resultStars.remove(); return; }
    const stars = resultStars.querySelectorAll("img");
    if (stars.length !== 3) return;
    stars.forEach((star) => statsStars.appendChild(star));
    resultStars.remove();
  }
  function syncHighscoreReturnState() {
    const overlay = document.querySelector(".school-highscore-overlay");
    if (overlay) { highscoreOverlayWasVisible = true; return; }
    if (!highscoreOverlayWasVisible) return;
    highscoreOverlayWasVisible = false;
    document.querySelector(".result-highscore-action button")?.removeAttribute("disabled");
  }
  function sync() {
    syncHighscoreReturnState();
    syncBuildIndicator();
    syncHighscorePortraits();
    syncClassMascotCycle();
    syncResultStars();
    const resultScreen = document.querySelector(".result-screen");
    if (resultScreen) ensureResultCloseAction();
    const screen = document.querySelector(".game-screen");
    if (!screen) { feedbackSignature = ""; displayedScore = 0; return; }
    resetScoreForGame(screen);
    const feedback = screen.querySelector("#feedback");
    const scoreElement = screen.querySelector("#score");
    const timeElement = screen.querySelector("#time");
    const taskCard = screen.querySelector("#task-card");
    const answerElement = screen.querySelector("#answer");
    const streakElement = screen.querySelector("#streak");
    if (!(feedback instanceof HTMLElement) || !(scoreElement instanceof HTMLElement) || !(timeElement instanceof HTMLElement) || !(taskCard instanceof HTMLElement) || !(answerElement instanceof HTMLElement)) return;
    scoreElement.dataset.displayManaged = "true";
    scoreElement.textContent = String(displayedScore);
    updateCriticalTime(timeElement);
    syncAnswerColor(answerElement, feedback);
    scheduleAnswerBoxAlignment();
    const streakVisible = streakElement instanceof HTMLElement && !streakElement.hidden;
    const multiplierText = streakVisible ? (streakElement.textContent ?? "") : "Serie ×1";
    if (multiplierText.includes("×5")) earnedStar1ThisGame = true;
    const signature = `${feedback.className}|${feedback.textContent ?? ""}`;
    if (signature === feedbackSignature) return;
    feedbackSignature = signature;
    if (!feedback.classList.contains("feedback-correct")) return;
    const match = (feedback.textContent ?? "").match(/\+(\d+) Punkte/);
    if (!match) return;
    const points = Number(match[1]);
    const multiplierMatch = multiplierText.match(/×(1|2|3|5)\b/);
    const multiplier = multiplierMatch ? Number(multiplierMatch[1]) : 1;
    flyPoints(taskCard, scoreElement, points, multiplier);
    applyPointsWhenArrived(screen, scoreElement, points);
  }
  window.addEventListener("resize", scheduleAnswerBoxAlignment, { passive: true });
  window.setInterval(sync, 80);
  sync();
})();
