(() => {
  const POINTS_FLIGHT_MS = 1520;

  let currentGameScreen = null;
  let feedbackSignature = "";

  function updateCriticalTime(timeElement) {
    const match = (timeElement.textContent ?? "").match(/^(\d+):(\d{2})$/);
    const seconds = match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
    timeElement.classList.toggle("time-critical", seconds <= 59);
  }

  function isShowingExpectedSolution(answerElement, feedbackElement) {
    const text = answerElement.textContent?.trim() ?? "";
    if (!text) return false;

    const feedbackExpected = feedbackElement.classList.contains("feedback-wrong")
      ? (feedbackElement.textContent ?? "").match(/Die Antwort ist\s+(\d+)\.?/i)?.[1]
      : null;
    if (feedbackExpected && text === feedbackExpected) return true;

    const factorA = Number(currentGameScreen?.querySelector("#factor-a")?.textContent ?? "");
    const factorB = Number(currentGameScreen?.querySelector("#factor-b")?.textContent ?? "");
    if (!Number.isFinite(factorA) || !Number.isFinite(factorB)) return false;
    return text === String(factorA * factorB);
  }

  function syncAnswerColor(answerElement, feedbackElement) {
    if (answerElement.classList.contains("answer-feedback-wrong")) {
      answerElement.style.setProperty("color", "#ee737f", "important");
      return;
    }
    if (answerElement.classList.contains("answer-feedback-correct") || isShowingExpectedSolution(answerElement, feedbackElement)) {
      answerElement.style.setProperty("color", "#69cb6c", "important");
      return;
    }
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

  function scheduleAnswerBoxAlignment() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(alignAnswerBoxWithKeypad);
    });
  }

  function triggerScoreArrival(scoreElement) {
    const scoreCard = scoreElement.closest(".stat-score");
    if (!scoreCard) return;
    scoreCard.classList.remove("score-arrival", "score-arrival-medium", "score-arrival-strong");
    const score = Number(scoreElement.textContent ?? "0") || 0;
    if (score > 199) scoreCard.classList.add("score-arrival-strong");
    else if (score > 99) scoreCard.classList.add("score-arrival-medium");
    void scoreCard.offsetWidth;
    scoreCard.classList.add("score-arrival");
    window.setTimeout(() => scoreCard.classList.remove("score-arrival", "score-arrival-medium", "score-arrival-strong"), 420);
  }

  function flyPoints(card, scoreElement, points, multiplier) {
    const cardRect = card.getBoundingClientRect();
    const scoreRect = scoreElement.getBoundingClientRect();
    const particle = document.createElement("span");
    particle.className = `points-fly multiplier-x${multiplier}`;
    particle.textContent = `+${points}`;
    particle.style.left = `${cardRect.left + cardRect.width * 0.72}px`;
    particle.style.top = `${cardRect.top + cardRect.height * 0.52}px`;
    particle.style.setProperty("--fly-x", `${scoreRect.left + scoreRect.width * 0.5 - (cardRect.left + cardRect.width * 0.72)}px`);
    particle.style.setProperty("--fly-y", `${scoreRect.top + scoreRect.height * 0.5 - (cardRect.top + cardRect.height * 0.52)}px`);
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), POINTS_FLIGHT_MS + 90);
  }

  function tryCloseApp() {
    window.close();
    window.setTimeout(() => {
      const status = document.querySelector("#close-app-status");
      if (!(status instanceof HTMLElement)) return;
      status.textContent = "Das Beenden wird auf deinem iPad nicht unterstützt. Bitte schließe die App selbst.";
      status.hidden = false;
    }, 250);
  }

  function ensureResultCloseAction() {
    const resultCard = document.querySelector(".result-card");
    if (!(resultCard instanceof HTMLElement) || resultCard.querySelector("#close-app")) return;

    const againButton = resultCard.querySelector("#again");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "result-button result-button-secondary";
    closeButton.id = "close-app";
    closeButton.textContent = "App schließen";
    closeButton.addEventListener("click", tryCloseApp);

    const status = document.createElement("p");
    status.id = "close-app-status";
    status.className = "close-app-status";
    status.hidden = true;
    status.setAttribute("aria-live", "polite");

    if (againButton) {
      againButton.insertAdjacentElement("afterend", closeButton);
      closeButton.insertAdjacentElement("afterend", status);
    } else {
      resultCard.append(closeButton, status);
    }
  }

  function sync() {
    const resultScreen = document.querySelector(".result-screen");
    if (resultScreen) ensureResultCloseAction();

    const screen = document.querySelector(".game-screen");
    if (!screen) {
      currentGameScreen = null;
      feedbackSignature = "";
      return;
    }

    if (screen !== currentGameScreen) {
      currentGameScreen = screen;
      feedbackSignature = "";
    }

    const feedback = screen.querySelector("#feedback");
    const scoreElement = screen.querySelector("#score");
    const timeElement = screen.querySelector("#time");
    const taskCard = screen.querySelector("#task-card");
    const answerElement = screen.querySelector("#answer");
    if (!(feedback instanceof HTMLElement) || !(scoreElement instanceof HTMLElement) || !(timeElement instanceof HTMLElement) || !(taskCard instanceof HTMLElement) || !(answerElement instanceof HTMLElement)) return;

    updateCriticalTime(timeElement);
    syncAnswerColor(answerElement, feedback);
    scheduleAnswerBoxAlignment();

    const signature = `${feedback.className}|${feedback.textContent ?? ""}`;
    if (signature === feedbackSignature) return;
    feedbackSignature = signature;

    if (!feedback.classList.contains("feedback-correct")) return;

    const match = (feedback.textContent ?? "").match(/\+(\d+) Punkte/);
    if (!match) return;

    const points = Number(match[1]);
    const streak = Number.parseInt((screen.querySelector("#streak")?.textContent ?? "").replace(/\D/g, ""), 10) || 1;
    const multiplier = streak >= 20 ? 5 : streak >= 10 ? 3 : streak >= 3 ? 2 : 1;
    flyPoints(taskCard, scoreElement, points, multiplier);
    window.setTimeout(() => {
      if (currentGameScreen === screen) triggerScoreArrival(scoreElement);
    }, 850);
  }

  window.addEventListener("resize", scheduleAnswerBoxAlignment, { passive: true });
  window.setInterval(sync, 80);
  sync();
})();
