(() => {
  let currentGameScreen = null;
  let feedbackSignature = "";
  let streak = 0;

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
    }
  }

  function colorizeScore(scoreElement, multiplier) {
    scoreElement.classList.remove("multiplier-x1", "multiplier-x2", "multiplier-x3", "multiplier-x5");
    scoreElement.classList.add(`multiplier-x${multiplier}`);
  }

  function showStreak(streakElement, multiplier) {
    streakElement.hidden = false;
    streakElement.textContent = `Serie ×${multiplier}`;
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

    window.setTimeout(() => particle.remove(), 1610);
  }

  function sync() {
    const screen = document.querySelector(".game-screen");
    if (!screen) {
      currentGameScreen = null;
      feedbackSignature = "";
      streak = 0;
      return;
    }

    resetForGame(screen);

    const feedback = screen.querySelector("#feedback");
    const streakElement = screen.querySelector("#streak");
    const scoreElement = screen.querySelector("#score");
    const taskCard = screen.querySelector("#task-card");
    if (!feedback || !streakElement || !scoreElement || !taskCard) return;

    const signature = `${feedback.className}|${feedback.textContent ?? ""}`;
    if (signature === feedbackSignature) {
      const multiplier = MULTIPLIER_BY_STREAK(streak);
      showStreak(streakElement, multiplier);
      colorizeScore(scoreElement, multiplier);
      return;
    }

    feedbackSignature = signature;

    if (feedback.classList.contains("feedback-wrong")) {
      streak = 0;
      const multiplier = 1;
      showStreak(streakElement, multiplier);
      colorizeScore(scoreElement, multiplier);
      return;
    }

    if (!feedback.classList.contains("feedback-correct")) return;

    streak += 1;
    const multiplier = MULTIPLIER_BY_STREAK(streak);
    showStreak(streakElement, multiplier);
    colorizeScore(scoreElement, multiplier);

    const match = (feedback.textContent ?? "").match(/\+(\d+) Punkte/);
    if (match) {
      flyPoints(taskCard, scoreElement, Number(match[1]), multiplier);
    }

    taskCard.classList.remove("correct-pop");
    void taskCard.offsetWidth;
    taskCard.classList.add("correct-pop");
    window.setTimeout(() => taskCard.classList.remove("correct-pop"), 420);
  }

  window.setInterval(sync, 80);
  sync();
})();
