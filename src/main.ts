import "./style.css";
import { GameEngine } from "./game/engine";
import { GameController } from "./game/gameController";
import { multiplierForStreak } from "./game/scoring";

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Required UI element not found: ${selector}`);
  }

  return element;
}

const app = getRequiredElement<HTMLDivElement>("#app");

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header" aria-label="Spielstatus">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">×</div>
        <div>
          <p class="eyebrow">Einmaleins</p>
          <p class="round" id="round">Durchlauf 1</p>
        </div>
      </div>

      <div class="header-stats">
        <div class="stat-card stat-score">
          <span class="stat-label">Punkte</span>
          <strong id="score">0</strong>
        </div>
        <div class="stat-card stat-time">
          <span class="stat-label">Zeit</span>
          <strong id="time">10:00</strong>
        </div>
      </div>
    </header>

    <div class="progress-track" aria-label="Fortschritt">
      <div class="progress-bar" id="progress"></div>
    </div>

    <section class="game-content" aria-label="Aktuelle Aufgabe">
      <div class="task-card" id="task-card">
        <p class="task-caption">Löse die Aufgabe</p>

        <div class="task-equation" aria-live="polite" aria-label="Rechenaufgabe">
          <span id="factor-a">?</span>
          <span class="operator" aria-hidden="true">×</span>
          <span id="factor-b">?</span>
          <span class="operator" aria-hidden="true">=</span>
          <span class="answer-box" id="answer">?</span>
        </div>

        <div class="feedback-area" aria-live="polite" aria-atomic="true">
          <p id="feedback" class="feedback feedback-neutral">
            Gib deine Antwort ein.
          </p>
          <p id="streak" class="streak" hidden>Serie ×1</p>
        </div>
      </div>
    </section>

    <section class="keypad" aria-label="Zahlenfeld">
      <button type="button" class="keypad-key" data-digit="1">1</button>
      <button type="button" class="keypad-key" data-digit="2">2</button>
      <button type="button" class="keypad-key" data-digit="3">3</button>
      <button type="button" class="keypad-key" data-digit="4">4</button>
      <button type="button" class="keypad-key" data-digit="5">5</button>
      <button type="button" class="keypad-key" data-digit="6">6</button>
      <button type="button" class="keypad-key" data-digit="7">7</button>
      <button type="button" class="keypad-key" data-digit="8">8</button>
      <button type="button" class="keypad-key" data-digit="9">9</button>
      <button type="button" class="keypad-key keypad-zero" data-digit="0">0</button>
    </section>
  </main>
`;

const engine = new GameEngine();
const controller = new GameController(engine);

const round = getRequiredElement<HTMLElement>("#round");
const score = getRequiredElement<HTMLElement>("#score");
const time = getRequiredElement<HTMLElement>("#time");
const progress = getRequiredElement<HTMLElement>("#progress");
const factorA = getRequiredElement<HTMLElement>("#factor-a");
const factorB = getRequiredElement<HTMLElement>("#factor-b");
const answer = getRequiredElement<HTMLElement>("#answer");
const feedback = getRequiredElement<HTMLElement>("#feedback");
const streak = getRequiredElement<HTMLElement>("#streak");
const taskCard = getRequiredElement<HTMLElement>("#task-card");

let wrongAnswerTimer: number | null = null;

function formatTime(elapsedMs: number): string {
  const remainingMs = Math.max(0, 10 * 60 * 1000 - elapsedMs);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatRound(roundNumber: number): string {
  return `Durchlauf ${roundNumber}`;
}

function render(): void {
  const state = controller.getState();
  const game = state.game;
  const task = game.currentTask;
  const multiplier = multiplierForStreak(game.streak);

  round.textContent = formatRound(game.round);
  score.textContent = String(game.score);
  time.textContent = formatTime(game.elapsedMs);
  progress.style.width = `${Math.min((game.completedTasks / 136) * 100, 100)}%`;

  if (task === null) {
    factorA.textContent = "?";
    factorB.textContent = "?";
  } else {
    factorA.textContent = String(task[0]);
    factorB.textContent = String(task[1]);
  }

  answer.textContent = state.input.entered || "?";

  feedback.className = "feedback";
  taskCard.classList.remove("is-correct", "is-wrong");

  if (state.lastAnswer === null) {
    feedback.textContent = "Gib deine Antwort ein.";
    feedback.classList.add("feedback-neutral");
  } else if (state.lastAnswer.correct) {
    feedback.textContent = `Richtig! +${state.lastAnswer.points} Punkte`;
    feedback.classList.add("feedback-correct");
    taskCard.classList.add("is-correct");
  } else {
    feedback.textContent = `Falsch. Die Antwort ist ${state.lastAnswer.expectedAnswer}.`;
    feedback.classList.add("feedback-wrong");
    taskCard.classList.add("is-wrong");
  }

  if (game.streak >= 3) {
    streak.hidden = false;
    streak.textContent = `Serie ×${multiplier}`;
  } else {
    streak.hidden = true;
  }
}

function scheduleNextTaskAfterWrongAnswer(): void {
  if (wrongAnswerTimer !== null) {
    window.clearTimeout(wrongAnswerTimer);
  }

  wrongAnswerTimer = window.setTimeout(() => {
    wrongAnswerTimer = null;
    controller.advanceAfterWrongAnswer();
    render();
  }, 1000);
}

const buttons = document.querySelectorAll<HTMLButtonElement>("[data-digit]");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const stateBefore = controller.getState();

    if (stateBefore.input.status !== "waiting") {
      return;
    }

    const digit = Number(button.dataset.digit);
    const stateAfter = controller.pressDigit(digit);

    render();

    if (
      stateAfter.lastAnswer !== null &&
      !stateAfter.lastAnswer.correct
    ) {
      scheduleNextTaskAfterWrongAnswer();
    }
  });
});

controller.start();
render();

window.setInterval(() => {
  controller.tick();
  render();
}, 250);
