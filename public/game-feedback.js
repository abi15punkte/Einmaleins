(() => {
  let currentGameScreen = null;
  let feedbackSignature = "";
  let streak = 0;
  let displayedScore = 0;

  const POINTS_FLIGHT_MS = 1520;
  const SCORE_ARRIVAL_DELAY_MS = 1050;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCORE_UPDATE_DELAY_MS = REDUCED_MOTION ? 0 : SCORE_ARRIVAL_DELAY_MS;

  const MULTIPLIER_BY_STREAK = (value) => {
    if (value >= 20) return 5;
    if (value >= 10) return 3;
    if (value >= 3) return 2;
    return 1;
  };

  function resetForGame(screen) {
    if (screen !== currentGameScreen) {
      currentGameScreen = screen;
      feedbackSignature = "";
      streak = 0;
      displayedScore = Number(screen.querySelector("#score")?.textContent ?? 0) || 0;
    }
  }

  function showStreak(streakElement, multiplier) {
    streakElement.hidden = false;
    streakElement.textContent = `Serie ×${multiplier}`;
  }

  function triggerScoreArrival(scoreElement) {
    const scoreCard = scoreElement.closest(".stat-score");
    if (!scoreCard) return;
    scoreCard.classList.remove("score-arrival");
    void scoreCard.offsetWidth;
    scoreCard.classList.add("score-arrival");
    window.setTimeout(() => scoreCard.classList.remove("score-arrival"), 420);
  }

  function applyPointsWhenArrived(screen, scoreElement, points) {
    window.setTimeout(() => {
      if (currentGameScreen !== screen) return;
      displayedScore += points;
      scoreElement.textContent = String(displayedScore);
      triggerScoreArrival(scoreElement);
    }, SCORE_UPDATE_DELAY_MS);
  }

  function updateCriticalTime(timeElement) {
    const match = (timeElement.textContent ?? "").match(/^(\d+):(\d{2})$/);
    const seconds = match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
    timeElement.classList.toggle("time-critical", seconds <= 59);
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
    particle.textContent = `+${points}`;
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty("--fly-x", `${targetX - startX}px`);
    particle.style.setProperty("--fly-y", `${targetY - startY}px`);
    document.body.appendChild(particle);

    window.setTimeout(() => particle.remove(), POINTS_FLIGHT_MS + 90);
  }

  function sync() {
    const screen = document.querySelector(".game-screen");
    if (!screen) {
      currentGameScreen = null;
      feedbackSignature = "";
      streak = 0;
      displayedScore = 0;
      return;
    }

    resetForGame(screen);

    const feedback = screen.querySelector("#feedback");
    const streakElement = screen.querySelector("#streak");
    const scoreElement = screen.querySelector("#score");
    const timeElement = screen.querySelector("#time");
    const taskCard = screen.querySelector("#task-card");
    if (!feedback || !streakElement || !scoreElement || !timeElement || !taskCard) return;

    scoreElement.dataset.displayManaged = "true";
    updateCriticalTime(timeElement);

    const signature = `${feedback.className}|${feedback.textContent ?? ""}`;
    if (signature === feedbackSignature) {
      showStreak(streakElement, MULTIPLIER_BY_STREAK(streak));
      scoreElement.textContent = String(displayedScore);
      return;
    }

    feedbackSignature = signature;

    if (feedback.classList.contains("feedback-wrong")) {
      streak = 0;
      showStreak(streakElement, 1);
      scoreElement.textContent = String(displayedScore);
      return;
    }

    if (!feedback.classList.contains("feedback-correct")) {
      scoreElement.textContent = String(displayedScore);
      return;
    }

    streak += 1;
    const multiplier = MULTIPLIER_BY_STREAK(streak);
    showStreak(streakElement, multiplier);

    const match = (feedback.textContent ?? "").match(/\+(\d+) Punkte/);
    if (match) {
      const points = Number(match[1]);
      flyPoints(taskCard, scoreElement, points, multiplier);
      applyPointsWhenArrived(screen, scoreElement, points);
    }

    scoreElement.textContent = String(displayedScore);
    taskCard.classList.remove("correct-pop");
    void taskCard.offsetWidth;
    taskCard.classList.add("correct-pop");
    window.setTimeout(() => taskCard.classList.remove("correct-pop"), 420);
  }

  window.setInterval(sync, 80);
  sync();
})();
