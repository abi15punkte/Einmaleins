import "./style.css";
import { GameEngine } from "./game/engine";
import { GameController } from "./game/gameController";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container not found.");
}

app.innerHTML = `
  <main class="game">
    <header class="game-header">
      <div>
        <h1>Einmaleins</h1>
        <p class="round" id="round">Runde 1</p>
      </div>

      <div class="stats">
        <span>Punkte: <strong id="score">0</strong></span>
        <span>Zeit: <strong id="time">10:00</strong></span>
      </div>
    </header>

    <section class="task" aria-label="Aufgabe">
      <div class="task-equation">
        <span id="factor-a">?</span>
        <span>×</span>
        <span id="factor-b">?</span>
        <span>=</span>
        <span id="answer">?</span>
      </div>

      <p id="feedback" class="feedback" aria-live="polite">
        Gib deine Antwort ein.
      </p>
    </section>

    <section class="keypad" aria-label="Zahlenfeld">
      <button type="button" data-digit="1">1</button>
      <button type="button" data-digit="2">2</button>
      <button type="button" data-digit="3">3</button>

      <button type="button" data-digit="4">4</button>
      <button type="button" data-digit="5">5</button>
      <button type="button" data-digit="6">6</button>

      <button type="button" data-digit="7">7</button>
      <button type="button" data-digit="8">8</button>
      <button type="button" data-digit="9">9</button>

      <button type="button" class="keypad-zero" data-digit="0">0</button>
    </section>
  </main>
`;

const engine = new GameEngine();
const controller = new GameController(engine);

const roundElement =
  document.querySelector<HTMLElement>("#round");
const scoreElement =
  document.querySelector<HTMLElement>("#score");
const timeElement =
  document.querySelector<HTMLElement>("#time");
const factorAElement =
  document.querySelector<HTMLElement>("#factor-a");
const factorBElement =
  document.querySelector<HTMLElement>("#factor-b");
const answerElement =
  document.querySelector<HTMLElement>("#answer");
const feedbackElement =
  document.querySelector<HTMLElement>("#feedback");

if (
  !roundElement ||
  !scoreElement ||
  !timeElement ||
  !factorAElement ||
  !factorBElement ||
  !answerElement ||
  !feedbackElement
) {
  throw new Error("Required UI element not found.");
}

const round = roundElement;
const score = scoreElement;
const time = timeElement;
const factorA = factorAElement;
const factorB = factorBElement;
const answer = answerElement;
const feedback = feedbackElement;

function formatTime(elapsedMs: number): string {
  const remainingMs = Math.max(
    0,
    10 * 60 * 1000 - elapsedMs
  );

  const totalSeconds = Math.ceil(
    remainingMs / 1000
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function render(): void {
  const state = controller.getState();
  const task = state.game.currentTask;

  round.textContent = `Runde ${state.game.round}`;
  score.textContent = String(state.game.score);
  time.textContent = formatTime(state.game.elapsedMs);

  if (task === null) {
    factorA.textContent = "?";
    factorB.textContent = "?";
  } else {
    factorA.textContent = String(task[0]);
    factorB.textContent = String(task[1]);
  }

  answer.textContent =
    state.input.entered || "?";

  if (state.lastAnswer === null) {
    feedback.textContent =
      "Gib deine Antwort ein.";
  } else if (state.lastAnswer.correct) {
    feedback.textContent =
      `Richtig! +${state.lastAnswer.points} Punkte`;
  } else {
    feedback.textContent =
      `Falsch. Die Antwort ist ${state.lastAnswer.expectedAnswer}.`;
  }
}

const buttons =
  document.querySelectorAll<HTMLButtonElement>(
    "[data-digit]"
  );

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const digit = Number(button.dataset.digit);

    controller.pressDigit(digit);
    render();
  });
});

controller.start();
render();

window.setInterval(() => {
  controller.tick();
  render();
}, 250);

window.setInterval(() => {
  controller.tick();
  render();
}, 250);
