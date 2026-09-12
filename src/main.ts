import "./style.css";
import { GameEngine, GAME_DURATION_MS } from "./game/engine";
import { GameController } from "./game/gameController";
import { multiplierForStreak } from "./game/scoring";
import { applyManagedStudentIdentity, loadManagedStudentIdentity } from "./game/jamfIdentity";
import { evaluateResult, loadPersonalHighscore, loadStudentIdentity, saveStudentIdentity, type HighscoreEvaluation, type StudentIdentity } from "./game/highscore";
import { createLeaderboardClient, type LeaderboardClient } from "./game/leaderboard";
import { initHighscoreFlow } from "./game/highscoreFlow";

const TOTAL_TASKS = 136;
const ANSWER_FEEDBACK_RED_MS = 750;
const ANSWER_FEEDBACK_RESULT_MS = 750;
const WRONG_ANSWER_TOTAL_MS = ANSWER_FEEDBACK_RED_MS + ANSWER_FEEDBACK_RESULT_MS;
const BUILD_RELOAD_SESSION_KEY = "einmaleins:version-reload";
type Screen = "start" | "game" | "result";
type PracticeMode = "highscore" | "free";
type AnswerPresentation = { factorA: string; factorB: string; entered: string; expected: string; status: "wrong-red" | "wrong-black" | "correct-green" } | null;
type TaskCardAnimation = "shake" | "pop";

function getRequiredElement<T extends HTMLElement>(selector: string): T { const element = document.querySelector<T>(selector); if (!element) throw new Error(`Required UI element not found: ${selector}`); return element; }
function escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function getCurrentBuildId(): string { const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]'); if (!manifestLink) return "dev"; const buildId = new URL(manifestLink.href, document.baseURI).searchParams.get("build"); if (!buildId || buildId === "__BUILD_ID__") return "dev"; return buildId; }
function getGreetingName(name: string): string { return name.trim().split(/\s+/)[0] || name; }

const CURRENT_BUILD_ID = getCurrentBuildId();
let buildCheckPromise: Promise<void> | null = null;
async function checkForLatestBuild(): Promise<void> { if (CURRENT_BUILD_ID === "dev" || buildCheckPromise !== null) return buildCheckPromise ?? Promise.resolve(); buildCheckPromise = (async () => { try { const response = await fetch(`./version.json?from=${encodeURIComponent(CURRENT_BUILD_ID)}&t=${Date.now()}`, { cache: "no-store", headers: { "cache-control": "no-cache" } }); if (!response.ok) return; const payload: unknown = await response.json(); if (!payload || typeof payload !== "object" || !("buildId" in payload) || typeof payload.buildId !== "string") return; const latestBuildId = payload.buildId; if (!latestBuildId || latestBuildId === CURRENT_BUILD_ID) { sessionStorage.removeItem(BUILD_RELOAD_SESSION_KEY); return; } const attemptedReload = sessionStorage.getItem(BUILD_RELOAD_SESSION_KEY); if (attemptedReload === `${CURRENT_BUILD_ID}->${latestBuildId}`) return; sessionStorage.setItem(BUILD_RELOAD_SESSION_KEY, `${CURRENT_BUILD_ID}->${latestBuildId}`); const url = new URL(window.location.href); url.searchParams.set("build", latestBuildId); url.searchParams.set("refresh", String(Date.now())); window.location.replace(url.href); } catch { /* Offline or temporarily unreachable: keep using the cached/current build. */ } })(); return buildCheckPromise; }

const app = getRequiredElement<HTMLDivElement>("#app");
let engine = new GameEngine();
let controller = new GameController(engine);
let screen: Screen = "start";
let practiceMode: PracticeMode = "highscore";
let wrongAnswerTimer: number | null = null;
let answerFeedbackTimer: number | null = null;
let gameTimer: number | null = null;
let answerPresentation: AnswerPresentation = null;
let resultEvaluation: HighscoreEvaluation | null = null;
let student: StudentIdentity = loadResolvedStudentIdentity();
let leaderboardClient: LeaderboardClient | null = createLeaderboardClient();

function loadResolvedStudentIdentity(): StudentIdentity { const managedIdentity = loadManagedStudentIdentity(); if (managedIdentity) { applyManagedStudentIdentity(managedIdentity, (identity) => saveStudentIdentity(identity)); return { ...managedIdentity, source: "jamf" }; } return loadStudentIdentity(); }

function animateTaskCard(kind: TaskCardAnimation): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const taskCard = document.querySelector<HTMLElement>(".game-screen #task-card");
  if (!taskCard) return;
  taskCard.style.animation = "none";
  const keyframes = kind === "shake"
    ? [
        { transform: "translateX(0) translateY(10vh) rotate(0deg) scale(1)" },
        { transform: "translateX(-1.8vw) translateY(10vh) rotate(-2.2deg) scale(1.02)" },
        { transform: "translateX(1.6vw) translateY(10vh) rotate(1.9deg) scale(1.02)" },
        { transform: "translateX(-1.35vw) translateY(10vh) rotate(-1.6deg) scale(1.015)" },
        { transform: "translateX(1.15vw) translateY(10vh) rotate(1.35deg) scale(1.012)" },
        { transform: "translateX(-0.95vw) translateY(10vh) rotate(-1.05deg) scale(1.008)" },
        { transform: "translateX(0.7vw) translateY(10vh) rotate(0.8deg) scale(1.005)" },
        { transform: "translateX(-0.45vw) translateY(10vh) rotate(-0.55deg) scale(1.002)" },
        { transform: "translateX(0) translateY(10vh) rotate(0deg) scale(1)" }
      ]
    : [
        { rotate: "0deg", scale: "1" },
        { rotate: "-0.8deg", scale: "1.035" },
        { rotate: "0.35deg", scale: "0.992" },
        { rotate: "-0.15deg", scale: "1.008" },
        { rotate: "0deg", scale: "1" }
      ];
  taskCard.animate(keyframes, { duration: kind === "shake" ? 760 : 420, easing: "cubic-bezier(.36,.07,.19,.97)", fill: "none" });
}

function renderStartScreen(profileMessage = ""): void {
  student = loadResolvedStudentIdentity(); leaderboardClient = createLeaderboardClient(); const personalHighscore = loadPersonalHighscore(student.studentId); const showManualProfile = student.source !== "jamf"; const versionMarkup = CURRENT_BUILD_ID !== "dev" ? `<p class="build-version" aria-label="Build-Version">Build ${escapeHtml(CURRENT_BUILD_ID)}</p>` : ""; const greetingName = getGreetingName(student.name);
  app.innerHTML = `<main class="app-shell start-screen"><section class="welcome-card" aria-labelledby="welcome-title"><div class="brand-mark brand-mark-large" aria-hidden="true">·</div><p class="eyebrow">Einmaleins</p><p class="student-greeting">Hallo, ${escapeHtml(greetingName)}!</p><h1 id="welcome-title">Bereit für eine Runde?</h1><p class="welcome-copy">Löse so viele Aufgaben wie du kannst. Du hast dafür zehn Minuten.</p>${personalHighscore ? `<div class="personal-best" aria-label="Persönlicher Highscore"><span>Dein persönlicher Highscore</span><strong>${personalHighscore.score} Punkte</strong></div>` : ""}${showManualProfile ? `<details class="profile-panel"><summary>Spielerprofil bearbeiten</summary><form id="profile-form" class="profile-form"><label><span>Name</span><input id="student-name" name="name" type="text" maxlength="30" autocomplete="name" value="${escapeHtml(student.name)}" required /></label><label><span>Klasse <small>(optional)</small></span><input id="student-class" name="className" type="text" maxlength="20" autocomplete="off" value="${escapeHtml(student.className ?? "")}" /></label><button type="submit" class="profile-save">Profil speichern</button><p id="profile-status" class="profile-status" aria-live="polite">${escapeHtml(profileMessage)}</p></form></details>` : `<p class="managed-profile-note">Name und Klassenangabe wurden von der Schulverwaltung übernommen.</p>`}<div class="mode-actions" aria-label="Übungsmodus wählen"><button type="button" class="mode-card mode-card-primary" data-mode="highscore"><span class="mode-title">Üben mit Highscore</span><span class="mode-copy">Spiele mit persönlicher Rekordauswertung und Highscore-Hinweis.</span></button><button type="button" class="mode-card" data-mode="free"><span class="mode-title">Üben ohne Highscore</span><span class="mode-copy">Spiele ohne Highscore-Fokus; dein persönlicher Rekord wird am Ende trotzdem geprüft.</span></button></div>${versionMarkup}</section></main>`;
  if (showManualProfile) { getRequiredElement<HTMLFormElement>("#profile-form").addEventListener("submit", (event) => { event.preventDefault(); const nameInput = getRequiredElement<HTMLInputElement>("#student-name"); const classInput = getRequiredElement<HTMLInputElement>("#student-class"); const trimmedName = nameInput.value.trim(); if (!trimmedName) { getRequiredElement<HTMLElement>("#profile-status").textContent = "Bitte gib einen Namen ein."; nameInput.focus(); return; } saveStudentIdentity({ ...student, name: trimmedName, className: classInput.value.trim() || null, source: "manual" }); renderStartScreen("Profil gespeichert."); document.querySelector<HTMLDetailsElement>(".profile-panel")?.setAttribute("open", ""); }); }
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => button.addEventListener("click", () => { practiceMode = button.dataset.mode === "free" ? "free" : "highscore"; startGame(); })); void checkForLatestBuild();
}

function renderGameScreen(): void {
  app.innerHTML = `<main class="app-shell game-screen"><header class="game-header" aria-label="Spielstatus"><div class="brand-block"><div class="brand-mark" aria-hidden="true">·</div><div><p class="eyebrow">Einmaleins</p><p class="round" id="round">Level 1</p></div></div><div class="header-stats"><div class="stat-card stat-score"><span class="stat-label">Punkte</span><strong id="score">0</strong></div><div class="stat-card stat-time"><span class="stat-label">Zeit</span><strong id="time">10:00</strong></div></div></header><div class="progress-track" aria-label="Fortschritt"><div class="progress-bar" id="progress"></div></div><section class="game-content" aria-label="Aktuelle Aufgabe"><div class="task-card" id="task-card"><p class="task-caption" id="task-caption"><span id="round-caption"><span class="status-caption-label">Level</span><strong class="status-caption-value">1</strong></span><span id="task-number-caption"><span class="status-caption-label">Aufgabe</span><strong class="status-caption-value">1</strong></span></p><div class="task-equation" aria-live="polite" aria-label="Rechenaufgabe"><span id="factor-a">?</span><span class="operator" aria-hidden="true">·</span><span id="factor-b">?</span><span class="operator" aria-hidden="true">=</span><span class="answer-box" id="answer">?</span></div><div class="feedback-area" aria-live="polite" aria-atomic="true"><p id="feedback" class="feedback feedback-neutral">Gib deine Antwort ein.</p><p id="streak" class="streak" hidden>Serie ×1</p></div></div></section><p class="keyboard-hint">Tipp: Du kannst am PC auch die Zifferntasten 0–9 verwenden.</p><section class="keypad" aria-label="Zahlenfeld">${[1,2,3,4,5,6,7,8,9].map((digit) => `<button type="button" class="keypad-key" data-digit="${digit}">${digit}</button>`).join("")}<button type="button" class="keypad-key keypad-zero" data-digit="0">0</button></section></main>`;
  document.querySelectorAll<HTMLButtonElement>("[data-digit]").forEach((button) => button.addEventListener("click", () => handleDigit(Number(button.dataset.digit)))); renderGameState();
}

function handleDigit(digit: number): void {
  if (screen !== "game") return;
  const stateBefore = controller.getState();
  if (stateBefore.input.status !== "waiting") return;
  const stateAfter = controller.pressDigit(digit);
  const outcome = stateAfter.lastDigitOutcome;
  if (!outcome) { renderGameState(); return; }

  clearAnswerFeedbackTimer();
  answerPresentation = { factorA: String(outcome.task[0]), factorB: String(outcome.task[1]), entered: outcome.entered, expected: String(outcome.expectedAnswer), status: outcome.kind === "wrong" ? "wrong-red" : "correct-green" };
  renderGameState();

  if (outcome.kind === "partial-correct") return;
  if (outcome.kind === "wrong") animateTaskCard("shake");
  if (outcome.kind === "correct") animateTaskCard("pop");

  const feedbackDelay = ANSWER_FEEDBACK_RESULT_MS;
  answerFeedbackTimer = window.setTimeout(() => {
    answerFeedbackTimer = null;
    if (answerPresentation === null) return;
    if (outcome.kind === "correct") {
      answerPresentation = null;
      renderGameState();
      return;
    }
    answerPresentation = { ...answerPresentation, status: "wrong-black" };
    renderGameState();
    animateTaskCard("pop");
    answerFeedbackTimer = window.setTimeout(() => {
      answerFeedbackTimer = null;
      if (answerPresentation === null) return;
      answerPresentation = null;
      renderGameState();
    }, ANSWER_FEEDBACK_RESULT_MS);
  }, feedbackDelay);

  if (outcome.kind === "wrong") scheduleNextTaskAfterWrongAnswer();
}
function handleKeyboardInput(event: KeyboardEvent): void { if (screen !== "game" || event.repeat) return; if (/^[0-9]$/.test(event.key)) { event.preventDefault(); handleDigit(Number(event.key)); } }
function renderGameState(): void { if (screen !== "game") return; const state = controller.getState(); const game = state.game; const task = game.currentTask; const multiplier = multiplierForStreak(game.streak); const round = getRequiredElement<HTMLElement>("#round"); const roundCaption = getRequiredElement<HTMLElement>("#round-caption"); const taskNumberCaption = getRequiredElement<HTMLElement>("#task-number-caption"); const score = getRequiredElement<HTMLElement>("#score"); const time = getRequiredElement<HTMLElement>("#time"); const progress = getRequiredElement<HTMLElement>("#progress"); const factorA = getRequiredElement<HTMLElement>("#factor-a"); const factorB = getRequiredElement<HTMLElement>("#factor-b"); const answer = getRequiredElement<HTMLElement>("#answer"); const feedback = getRequiredElement<HTMLElement>("#feedback"); const streak = getRequiredElement<HTMLElement>("#streak"); const taskCard = getRequiredElement<HTMLElement>("#task-card"); round.textContent = `Level ${game.round}`; roundCaption.innerHTML = `<span class="status-caption-label">Level</span><strong class="status-caption-value">${game.round}</strong>`; taskNumberCaption.innerHTML = `<span class="status-caption-label">Aufgabe</span><strong class="status-caption-value">${Math.min(game.completedTasks + 1, TOTAL_TASKS)}</strong>`; if (score.dataset.displayManaged !== "true") score.textContent = String(game.score); time.textContent = formatTime(game.elapsedMs); progress.style.width = `${Math.min((game.completedTasks / TOTAL_TASKS) * 100, 100)}%`; if (answerPresentation !== null) { factorA.textContent = answerPresentation.factorA; factorB.textContent = answerPresentation.factorB; answer.textContent = answerPresentation.status === "wrong-black" ? answerPresentation.expected : answerPresentation.entered; answer.classList.remove("answer-feedback-wrong", "answer-feedback-correct"); if (answerPresentation.status === "wrong-red") answer.classList.add("answer-feedback-wrong"); if (answerPresentation.status === "correct-green" || answerPresentation.status === "wrong-black") answer.classList.add("answer-feedback-correct"); } else { if (task === null) { factorA.textContent = "–"; factorB.textContent = "–"; answer.textContent = "–"; taskCard.classList.add("task-complete"); feedback.textContent = "Runde wird ausgewertet …"; feedback.className = "feedback feedback-neutral"; } else { factorA.textContent = String(task[0]); factorB.textContent = String(task[1]); answer.textContent = state.input.value || "?"; taskCard.classList.remove("task-complete"); if (state.input.status === "wrong") { feedback.textContent = "Noch einmal versuchen"; feedback.className = "feedback feedback-wrong"; } else if (state.input.status === "correct") { feedback.textContent = "Richtig!"; feedback.className = "feedback feedback-correct"; } else if (state.input.status === "typing") { feedback.textContent = "Weiter eingeben …"; feedback.className = "feedback feedback-neutral"; } else { feedback.textContent = "Gib deine Antwort ein."; feedback.className = "feedback feedback-neutral"; } } } streak.hidden = game.streak <= 0; streak.textContent = `Serie ×${multiplier}`; }
function startGame(): void { clearAllTimers(); screen = "game"; answerPresentation = null; resultEvaluation = null; engine = new GameEngine(); controller = new GameController(engine); renderGameScreen(); gameTimer = window.setInterval(() => { controller.tick(); renderGameState(); if (controller.isFinished()) finishGame(); }, 250); }
function finishGame(): void { if (screen !== "game") return; clearAllTimers(); screen = "result"; resultEvaluation = evaluateResult(controller.getState().game.score, student); renderResultScreen(); }
function renderResultScreen(): void { const evaluation = resultEvaluation; if (!evaluation) return; const score = evaluation.score; const personalBest = evaluation.previousBestScore; const record = evaluation.isPersonalRecord; app.innerHTML = `<main class="app-shell result-screen"><section class="welcome-card result-card"><p class="eyebrow">Runde beendet</p><h1>${score} Punkte</h1><p class="welcome-copy">${record ? "Neuer persönlicher Highscore!" : personalBest !== null ? `Dein persönlicher Highscore: ${personalBest} Punkte.` : "Deine Runde ist gespeichert."}</p><div class="result-actions"><button type="button" class="mode-card mode-card-primary" id="restart-game"><span class="mode-title">Noch eine Runde</span><span class="mode-copy">Starte direkt die nächste Runde.</span></button><button type="button" class="mode-card" id="back-start"><span class="mode-title">Zur Startseite</span><span class="mode-copy">Profil und Übungsmodus auswählen.</span></button></div></section></main>`; const restart = getRequiredElement<HTMLButtonElement>("#restart-game"); const back = getRequiredElement<HTMLButtonElement>("#back-start"); restart.addEventListener("click", startGame); back.addEventListener("click", () => { screen = "start"; renderStartScreen(); }); if (record && practiceMode === "highscore") { const recordToSubmit = { studentId: student.studentId, name: student.name, className: student.className, score, achievedAt: new Date().toISOString(), stern1: false, stern2: false, stern3: false }; void submitSchoolHighscore(recordToSubmit); } }
async function submitSchoolHighscore(record: { studentId: string; name: string; className: string | null; score: number; achievedAt: string; stern1: boolean; stern2: boolean; stern3: boolean }): Promise<void> { try { if (!leaderboardClient) leaderboardClient = createLeaderboardClient(); await leaderboardClient?.submit(record); } catch { /* Highscore is optional; the game result remains visible. */ } }
function scheduleNextTaskAfterWrongAnswer(): void { clearWrongAnswerTimer(); wrongAnswerTimer = window.setTimeout(() => { wrongAnswerTimer = null; controller.advanceAfterWrongAnswer(); renderGameState(); }, WRONG_ANSWER_TOTAL_MS); }
function clearWrongAnswerTimer(): void { if (wrongAnswerTimer !== null) { window.clearTimeout(wrongAnswerTimer); wrongAnswerTimer = null; } }
function clearAnswerFeedbackTimer(): void { if (answerFeedbackTimer !== null) { window.clearTimeout(answerFeedbackTimer); answerFeedbackTimer = null; } }
function clearAllTimers(): void { clearWrongAnswerTimer(); clearAnswerFeedbackTimer(); if (gameTimer !== null) { window.clearInterval(gameTimer); gameTimer = null; } }
function formatTime(milliseconds: number): string { const remaining = Math.max(0, GAME_DURATION_MS - milliseconds); const totalSeconds = Math.ceil(remaining / 1000); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${minutes}:${seconds.toString().padStart(2, "0")}`; }
window.addEventListener("keydown", handleKeyboardInput);
initHighscoreFlow();
renderStartScreen();
