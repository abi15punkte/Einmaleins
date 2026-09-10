import "./style.css";
import { GameEngine, GAME_DURATION_MS } from "./game/engine";
import { GameController } from "./game/gameController";
import { multiplierForStreak } from "./game/scoring";
import { applyManagedStudentIdentity, loadManagedStudentIdentity } from "./game/jamfIdentity";
import {
  evaluateResult,
  loadPersonalHighscore,
  loadStudentIdentity,
  saveStudentIdentity,
  type HighscoreEvaluation,
  type StudentIdentity
} from "./game/highscore";

const TOTAL_TASKS = 136;

type Screen = "start" | "game" | "result";
type PracticeMode = "highscore" | "free";

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required UI element not found: ${selector}`);
  }
  return element;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const app = getRequiredElement<HTMLDivElement>("#app");

let engine = new GameEngine();
let controller = new GameController(engine);
let screen: Screen = "start";
let practiceMode: PracticeMode = "highscore";
let wrongAnswerTimer: number | null = null;
let gameTimer: number | null = null;
let resultEvaluation: HighscoreEvaluation | null = null;
let student: StudentIdentity = loadResolvedStudentIdentity();

function loadResolvedStudentIdentity(): StudentIdentity {
  const managedIdentity = loadManagedStudentIdentity();

  if (managedIdentity) {
    const stored = loadStudentIdentity();
    applyManagedStudentIdentity(managedIdentity, (identity) => {
      saveStudentIdentity({ ...identity, source: "jamf" });
    });
    return {
      ...managedIdentity,
      source: "jamf"
    };
  }

  return loadStudentIdentity();
}

function renderStartScreen(profileMessage = ""): void {
  student = loadResolvedStudentIdentity();
  const personalHighscore = loadPersonalHighscore(student.studentId);
  const showManualProfile = student.source !== "jamf";

  app.innerHTML = `
    <main class="app-shell start-screen">
      <section class="welcome-card" aria-labelledby="welcome-title">
        <div class="brand-mark brand-mark-large" aria-hidden="true">×</div>
        <p class="eyebrow">Einmaleins</p>
        <p class="student-greeting">Hallo, ${escapeHtml(student.name)}!</p>
        <h1 id="welcome-title">Bereit für eine Runde?</h1>
        <p class="welcome-copy">
          Löse so viele Aufgaben wie du kannst. Du hast dafür zehn Minuten.
        </p>

        ${student.className ? `
          <p class="student-class">Klasse ${escapeHtml(student.className)}</p>
        ` : ""}

        ${personalHighscore ? `
          <div class="personal-best" aria-label="Persönlicher Highscore">
            <span>Dein persönlicher Highscore</span>
            <strong>${personalHighscore.score} Punkte</strong>
          </div>
        ` : ""}

        ${showManualProfile ? `
          <details class="profile-panel">
            <summary>Spielerprofil bearbeiten</summary>
            <form id="profile-form" class="profile-form">
              <label>
                <span>Name</span>
                <input id="student-name" name="name" type="text" maxlength="30" autocomplete="name" value="${escapeHtml(student.name)}" required />
              </label>
              <label>
                <span>Klasse <small>(optional)</small></span>
                <input id="student-class" name="className" type="text" maxlength="20" autocomplete="off" value="${escapeHtml(student.className ?? "")}" />
              </label>
              <button type="submit" class="profile-save">Profil speichern</button>
              <p id="profile-status" class="profile-status" aria-live="polite">${escapeHtml(profileMessage)}</p>
            </form>
          </details>
        ` : `
          <p class="managed-profile-note">Name und Klassenangabe wurden von der Schulverwaltung übernommen.</p>
        `}

        <div class="mode-actions" aria-label="Übungsmodus wählen">
          <button type="button" class="mode-card mode-card-primary" data-mode="highscore">
            <span class="mode-title">Üben mit Highscore</span>
            <span class="mode-copy">Dein Ergebnis kann deinen persönlichen Rekord verbessern.</span>
          </button>
          <button type="button" class="mode-card" data-mode="free">
            <span class="mode-title">Üben ohne Highscore</span>
            <span class="mode-copy">Spiele dieselbe Runde ohne persönlichen Rekord zu verändern.</span>
          </button>
        </div>
      </section>
    </main>
  `;

  if (showManualProfile) {
    getRequiredElement<HTMLFormElement>("#profile-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const nameInput = getRequiredElement<HTMLInputElement>("#student-name");
      const classInput = getRequiredElement<HTMLInputElement>("#student-class");
      const trimmedName = nameInput.value.trim();

      if (!trimmedName) {
        getRequiredElement<HTMLElement>("#profile-status").textContent = "Bitte gib einen Namen ein.";
        nameInput.focus();
        return;
      }

      saveStudentIdentity({
        ...student,
        name: trimmedName,
        className: classInput.value.trim() || null,
        source: "manual"
      });

      renderStartScreen("Profil gespeichert.");
      document.querySelector<HTMLDetailsElement>(".profile-panel")?.setAttribute("open", "");
    });
  }

  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      practiceMode = button.dataset.mode === "free" ? "free" : "highscore";
      startGame();
    });
  });
}

function renderGameScreen(): void {
  app.innerHTML = `
    <main class="app-shell game-screen">
      <header class="game-header" aria-label="Spielstatus">
        <div class="brand-block">
          <div class="brand-mark" aria-hidden="true">×</div>
          <div>
            <p class="eyebrow">Einmaleins</p>
            <p class="round" id="round">Durchlauf 1</p>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-card stat-score"><span class="stat-label">Punkte</span><strong id="score">0</strong></div>
          <div class="stat-card stat-time"><span class="stat-label">Zeit</span><strong id="time">10:00</strong></div>
        </div>
      </header>

      <div class="progress-track" aria-label="Fortschritt"><div class="progress-bar" id="progress"></div></div>

      <section class="game-content" aria-label="Aktuelle Aufgabe">
        <div class="task-card" id="task-card">
          <p class="task-caption" id="task-caption">Löse die Aufgabe</p>
          <div class="task-equation" aria-live="polite" aria-label="Rechenaufgabe">
            <span id="factor-a">?</span><span class="operator" aria-hidden="true">×</span><span id="factor-b">?</span><span class="operator" aria-hidden="true">=</span><span class="answer-box" id="answer">?</span>
          </div>
          <div class="feedback-area" aria-live="polite" aria-atomic="true">
            <p id="feedback" class="feedback feedback-neutral">Gib deine Antwort ein.</p>
            <p id="streak" class="streak" hidden>Serie ×1</p>
          </div>
        </div>
      </section>

      <p class="keyboard-hint">Tipp: Du kannst am PC auch die Zifferntasten 0–9 verwenden.</p>

      <section class="keypad" aria-label="Zahlenfeld">
        ${[1,2,3,4,5,6,7,8,9].map((digit) => `<button type="button" class="keypad-key" data-digit="${digit}">${digit}</button>`).join("")}
        <button type="button" class="keypad-key keypad-zero" data-digit="0">0</button>
      </section>
    </main>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-digit]").forEach((button) => {
    button.addEventListener("click", () => handleDigit(Number(button.dataset.digit)));
  });

  renderGameState();
}

function handleDigit(digit: number): void {
  if (screen !== "game") return;
  const stateBefore = controller.getState();
  if (stateBefore.input.status !== "waiting") return;
  const stateAfter = controller.pressDigit(digit);
  renderGameState();
  if (stateAfter.lastAnswer !== null && !stateAfter.lastAnswer.correct) scheduleNextTaskAfterWrongAnswer();
}

function handleKeyboardInput(event: KeyboardEvent): void {
  if (screen !== "game" || event.repeat) return;
  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    handleDigit(Number(event.key));
  }
}

function renderGameState(): void {
  if (screen !== "game") return;
  const state = controller.getState();
  const game = state.game;
  const task = game.currentTask;
  const multiplier = multiplierForStreak(game.streak);

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
  const taskCaption = getRequiredElement<HTMLElement>("#task-caption");

  round.textContent = `Durchlauf ${game.round}`;
  score.textContent = String(game.score);
  time.textContent = formatTime(game.elapsedMs);
  progress.style.width = `${Math.min((game.completedTasks / TOTAL_TASKS) * 100, 100)}%`;

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

  if (game.phase === "playing") taskCaption.textContent = `Durchlauf ${game.round} · Aufgabe ${game.completedTasks + 1} von ${TOTAL_TASKS}`;

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

function renderResultScreen(): void {
  clearGameTimer();
  const state = controller.getState();
  const game = state.game;
  const won = game.phase === "won";
  const headline = won ? "Geschafft!" : "Zeit ist um!";
  const message = won ? "Du hast alle Aufgaben vor Ablauf der zehn Minuten gelöst." : "Dein Ergebnis steht fest.";
  const highscoreMessage = resultEvaluation?.isNewPersonalBest
    ? "🏆 Neuer persönlicher Highscore!"
    : `Persönlicher Rekord: ${resultEvaluation?.personalBest.score ?? loadPersonalHighscore(student.studentId)?.score ?? 0}`;

  app.innerHTML = `
    <main class="app-shell result-screen">
      <section class="result-card" aria-labelledby="result-title">
        <div class="result-icon" aria-hidden="true">${won ? "✓" : "★"}</div>
        <p class="eyebrow">Einmaleins</p>
        <p class="result-greeting">Gut gespielt, ${escapeHtml(student.name)}!</p>
        <h1 id="result-title">${headline}</h1>
        <p class="result-copy">${message}</p>
        <div class="result-highscore ${resultEvaluation?.isNewPersonalBest ? "is-new" : ""}" aria-live="polite">${highscoreMessage}</div>
        <div class="result-stats" aria-label="Spielergebnis">
          <div class="result-stat"><span class="stat-label">Punkte</span><strong>${game.score}</strong></div>
          <div class="result-stat"><span class="stat-label">Aufgaben</span><strong>${game.completedTasks} / ${TOTAL_TASKS}</strong></div>
          <div class="result-stat"><span class="stat-label">Modus</span><strong>${practiceMode === "highscore" ? "Mit Highscore" : "Ohne Highscore"}</strong></div>
        </div>
        <button type="button" class="result-button" id="again">Noch eine Runde</button>
      </section>
    </main>
  `;

  getRequiredElement<HTMLButtonElement>("#again").addEventListener("click", () => {
    screen = "start";
    resultEvaluation = null;
    renderStartScreen();
  });
}

function startGame(): void {
  if (wrongAnswerTimer !== null) {
    window.clearTimeout(wrongAnswerTimer);
    wrongAnswerTimer = null;
  }
  clearGameTimer();
  resultEvaluation = null;
  student = loadResolvedStudentIdentity();
  engine = new GameEngine();
  controller = new GameController(engine);
  screen = "game";
  controller.start();
  renderGameScreen();

  gameTimer = window.setInterval(() => {
    const state = controller.tick();
    renderGameState();
    if (state.game.phase === "won" || state.game.phase === "timeUp") {
      if (practiceMode === "highscore") resultEvaluation = evaluateResult(student, state.game.score);
      screen = "result";
      renderResultScreen();
    }
  }, 250);
}

function scheduleNextTaskAfterWrongAnswer(): void {
  if (wrongAnswerTimer !== null) window.clearTimeout(wrongAnswerTimer);
  wrongAnswerTimer = window.setTimeout(() => {
    wrongAnswerTimer = null;
    controller.advanceAfterWrongAnswer();
    renderGameState();
  }, 1000);
}

function clearGameTimer(): void {
  if (gameTimer !== null) {
    window.clearInterval(gameTimer);
    gameTimer = null;
  }
}

function formatTime(elapsedMs: number): string {
  const remainingMs = Math.max(0, GAME_DURATION_MS - elapsedMs);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

window.addEventListener("keydown", handleKeyboardInput);
renderStartScreen();
