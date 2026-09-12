import { GameEngine, GAME_DURATION_MS } from "./game/engine";
import { GameController } from "./game/gameController";
import { applyManagedStudentIdentity, loadManagedStudentIdentity } from "./game/jamfIdentity";
import { evaluateResult, loadPersonalHighscore, loadStudentIdentity, saveStudentIdentity, type StudentIdentity } from "./game/highscore";
import { initHighscoreFlow } from "./game/highscoreFlow";
import { multiplierForStreak } from "./game/scoring";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function greetingName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function resolveStudent(): StudentIdentity {
  const managed = loadManagedStudentIdentity();
  if (managed) {
    applyManagedStudentIdentity(managed, saveStudentIdentity);
    return { ...managed, source: "jamf" };
  }
  return loadStudentIdentity();
}

function boot(): void {
  const app = document.getElementById("app");
  if (!app || app.dataset.einmaleinsBooted === "true") return;
  app.dataset.einmaleinsBooted = "true";

  let student = resolveStudent();
  let practiceMode: "highscore" | "free" = "highscore";
  let engine = new GameEngine();
  let controller = new GameController(engine);
  let gameTimer: number | null = null;
  let feedbackTimer: number | null = null;
  let wrongTimer: number | null = null;

  const renderStart = (status = ""): void => {
    student = resolveStudent();
    const personalBest = loadPersonalHighscore(student.studentId);
    const manual = student.source !== "jamf";
    const greeting = escapeHtml(greetingName(student.name));
    app.innerHTML = `<main class="app-shell start-screen"><section class="welcome-card" aria-labelledby="welcome-title"><div class="brand-mark brand-mark-large" aria-hidden="true">·</div><p class="eyebrow">Einmaleins</p><p class="student-greeting">Hallo, ${greeting}!</p><h1 id="welcome-title">Bereit für eine Runde?</h1><p class="welcome-copy">Löse so viele Aufgaben wie du kannst. Du hast dafür zehn Minuten.</p>${personalBest ? `<div class="personal-best"><span>Dein persönlicher Highscore</span><strong>${personalBest.score} Punkte</strong></div>` : ""}${manual ? `<details class="profile-panel"><summary>Spielerprofil bearbeiten</summary><form id="profile-form" class="profile-form"><label><span>Name</span><input id="student-name" maxlength="30" value="${escapeHtml(student.name)}" required></label><label><span>Klasse <small>(optional)</small></span><input id="student-class" maxlength="20" value="${escapeHtml(student.className ?? "")}"></label><button type="submit" class="profile-save">Profil speichern</button><p id="profile-status" class="profile-status" aria-live="polite">${escapeHtml(status)}</p></form></details>` : `<p class="managed-profile-note">Name und Klassenangabe wurden von der Schulverwaltung übernommen.</p>`}<div class="mode-actions"><button type="button" class="mode-card mode-card-primary" data-mode="highscore"><span class="mode-title">Üben mit Highscore</span><span class="mode-copy">Spiele mit persönlicher Rekordauswertung und Highscore-Hinweis.</span></button><button type="button" class="mode-card" data-mode="free"><span class="mode-title">Üben ohne Highscore</span><span class="mode-copy">Spiele ohne Highscore-Fokus.</span></button></div></section></main>`;

    if (manual) {
      document.getElementById("profile-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = (document.getElementById("student-name") as HTMLInputElement).value.trim();
        const className = (document.getElementById("student-class") as HTMLInputElement).value.trim() || null;
        if (!name) return;
        saveStudentIdentity({ ...student, name, className, source: "manual" });
        renderStart("Profil gespeichert.");
      });
    }

    app.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        practiceMode = button.dataset.mode === "free" ? "free" : "highscore";
        startGame();
      });
    });
  };

  const clearTimers = (): void => {
    if (gameTimer !== null) window.clearInterval(gameTimer);
    if (feedbackTimer !== null) window.clearTimeout(feedbackTimer);
    if (wrongTimer !== null) window.clearTimeout(wrongTimer);
    gameTimer = feedbackTimer = wrongTimer = null;
  };

  const renderResult = (): void => {
    clearTimers();
    const game = controller.getState().game;
    const evaluation = evaluateResult(student, game.score);
    app.innerHTML = `<main class="app-shell result-screen"><section class="result-card"><div class="result-icon" aria-hidden="true">${game.phase === "won" ? "✓" : "★"}</div><p class="eyebrow">Einmaleins</p><p class="result-greeting">Gut gespielt, ${escapeHtml(greetingName(student.name))}!</p><h1>${game.phase === "won" ? "Geschafft!" : "Die Zeit ist vorbei"}</h1><p class="result-copy">Dein Ergebnis steht fest.</p><div class="result-stats"><div class="result-stat"><span class="stat-label">Punkte</span><strong>${game.score}</strong></div><div class="result-stat"><span class="stat-label">Aufgaben</span><strong>${game.completedTasks}</strong></div><div class="result-stat"><span class="stat-label">Modus</span><strong>${practiceMode === "highscore" ? "Mit Highscore" : "Ohne Highscore"}</strong></div></div><div class="result-highscore ${evaluation.isNewPersonalBest ? "is-new" : ""}">${evaluation.isNewPersonalBest ? "🏆 Neuer persönlicher Highscore!" : `Persönlicher Rekord: ${evaluation.personalBest.score}`}</div><button type="button" class="result-button" id="again">Noch eine Runde</button></section></main>`;
    document.getElementById("again")?.addEventListener("click", startGame);
  };

  const renderGame = (): void => {
    app.innerHTML = `<main class="app-shell game-screen"><header class="game-header"><div class="brand-block"><div class="brand-mark" aria-hidden="true">·</div><div><p class="eyebrow">Einmaleins</p><p class="round" id="round">Level 1</p></div></div><div class="header-stats"><div class="stat-card"><span class="stat-label">Punkte</span><strong id="score">0</strong></div><div class="stat-card"><span class="stat-label">Zeit</span><strong id="time">10:00</strong></div></div></header><div class="progress-track"><div class="progress-bar" id="progress"></div></div><section class="game-content"><div class="task-card" id="task-card"><p class="task-caption"><span id="round-caption">Level 1</span><span id="task-number-caption">Aufgabe 1</span></p><div class="task-equation"><span id="factor-a">?</span><span class="operator">·</span><span id="factor-b">?</span><span class="operator">=</span><span class="answer-box" id="answer">?</span></div><div class="feedback-area"><p id="feedback" class="feedback feedback-neutral">Gib deine Antwort ein.</p><p id="streak" class="streak" hidden></p></div></div></section><section class="keypad" aria-label="Zahlenfeld">${[1,2,3,4,5,6,7,8,9].map((n) => `<button type="button" class="keypad-key" data-digit="${n}">${n}</button>`).join("")}<button type="button" class="keypad-key keypad-zero" data-digit="0">0</button></section></main>`;
    app.querySelectorAll<HTMLButtonElement>("[data-digit]").forEach((button) => button.addEventListener("click", () => handleDigit(Number(button.dataset.digit))));
    updateGame();
  };

  const handleDigit = (digit: number): void => {
    const state = controller.getState();
    if (state.game.phase !== "playing" || state.input.status !== "waiting") return;
    const next = controller.pressDigit(digit);
    const outcome = next.lastDigitOutcome;
    if (!outcome) return;
    updateGame();
    if (outcome.kind === "wrong") {
      wrongTimer = window.setTimeout(() => { controller.advanceAfterWrongAnswer(); updateGame(); }, 1500);
    }
    if (next.game.phase !== "playing") renderResult();
  };

  const updateGame = (): void => {
    const state = controller.getState();
    const game = state.game;
    const task = game.currentTask;
    const byId = (id: string) => document.getElementById(id);
    const round = byId("round"); const roundCaption = byId("round-caption"); const taskCaption = byId("task-number-caption"); const score = byId("score"); const time = byId("time"); const progress = byId("progress"); const a = byId("factor-a"); const b = byId("factor-b"); const answer = byId("answer"); const feedback = byId("feedback"); const streak = byId("streak");
    if (!round || !score || !time || !progress || !a || !b || !answer || !feedback || !streak || !roundCaption || !taskCaption) return;
    round.textContent = `Level ${game.round}`;
    roundCaption.textContent = `Level ${game.round}`;
    taskCaption.textContent = `Aufgabe ${Math.min(game.completedTasks + 1, 136)}`;
    score.textContent = String(game.score);
    const remaining = Math.max(GAME_DURATION_MS - game.elapsedMs, 0);
    time.textContent = `${Math.floor(remaining / 60000)}:${Math.ceil((remaining % 60000) / 1000).toString().padStart(2, "0")}`;
    progress.style.width = `${Math.min(game.completedTasks / 136 * 100, 100)}%`;
    a.textContent = task ? String(task[0]) : "?";
    b.textContent = task ? String(task[1]) : "?";
    answer.textContent = state.input.entered || "?";
    feedback.textContent = state.lastAnswer?.correct ? `Richtig! +${state.lastAnswer.points} Punkte` : state.lastAnswer && !state.lastAnswer.correct ? `Falsch. Die Antwort ist ${state.lastAnswer.expectedAnswer}.` : "Gib deine Antwort ein.";
    feedback.className = `feedback ${state.lastAnswer?.correct ? "feedback-correct" : state.lastAnswer && !state.lastAnswer.correct ? "feedback-wrong" : "feedback-neutral"}`;
    if (game.streak >= 3) { streak.hidden = false; streak.textContent = `Serie ×${multiplierForStreak(game.streak)}`; } else streak.hidden = true;
  };

  const startGame = (): void => {
    clearTimers();
    engine = new GameEngine();
    controller = new GameController(engine);
    controller.start();
    renderGame();
    gameTimer = window.setInterval(() => {
      controller.tick();
      updateGame();
      if (controller.getState().game.phase !== "playing") renderResult();
    }, 100);
  };

  document.addEventListener("keydown", (event) => {
    if (/^[0-9]$/.test(event.key)) handleDigit(Number(event.key));
  });

  initHighscoreFlow();
  renderStart();
}

if (typeof document !== "undefined") {
  queueMicrotask(boot);
}
