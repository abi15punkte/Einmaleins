import { loadPersonalHighscore, loadStudentIdentity } from "./highscore";
import { createLeaderboardClient, type LeaderboardEntry } from "./leaderboard";

const CLASS_MASCOT = (className: string | null): string =>
  /^(M(?:[1-9]|1[0-6]))$/i.test(className ?? "")
    ? `./${String(className).toUpperCase()}.png`
    : "./M1.png";

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstNameOnly(value: string): string {
  return value.trim().split(/\s+/)[0] || "Schüler";
}

function ensurePermanentClassMascot(): void {
  const existing = document.querySelector<HTMLImageElement>(".start-class-overlay");
  if (existing) return;

  const student = loadStudentIdentity();
  const mascot = document.createElement("img");
  mascot.className = "start-class-overlay";
  mascot.src = CLASS_MASCOT(student.className);
  mascot.alt = `Klassentier ${student.className ?? "M1"}`;
  mascot.setAttribute("aria-hidden", "true");
  document.body.appendChild(mascot);
}

function renderOverlay(entries: LeaderboardEntry[], studentName: string): void {
  document.querySelector<HTMLElement>(".school-highscore-overlay")?.remove();

  const overlay = document.createElement("section");
  overlay.className = "school-highscore-overlay";
  overlay.setAttribute("aria-label", "Schulweite Highscoreliste");

  const rows = entries.map((entry) => {
    const isMe = entry.name === studentName || firstNameOnly(entry.name) === firstNameOnly(studentName);
    const firstName = firstNameOnly(entry.name);
    const className = entry.className ?? "–";
    return `<div class="school-highscore-row ${isMe ? "school-highscore-me" : ""}"><div class="school-highscore-rank">${entry.rank}</div><span class="school-highscore-mascot"><img src="${CLASS_MASCOT(entry.className)}" alt="Klasse ${escapeHtml(className)}"></span><div><div class="school-highscore-name">${escapeHtml(firstName)}${isMe ? " · Du" : ""}</div><div class="school-highscore-class">Klasse ${escapeHtml(className)}</div></div><div class="school-highscore-score">${entry.score}</div></div>`;
  }).join("");

  overlay.innerHTML = `
    <div class="school-highscore-top">
      <button type="button" class="school-highscore-close" aria-label="Highscoreliste verlassen">×</button>
      <p class="eyebrow">Einmaleins</p>
      <h1>Schulweite Highscoreliste</h1>
      <p>Dein persönlicher Rekord wurde eingetragen.</p>
    </div>
    <div class="highscore-list-scroll" role="list" aria-label="Rangliste">${rows || "<p style=\"padding:24px;text-align:center\">Noch keine Einträge vorhanden.</p>"}</div>
    <p class="school-highscore-status">Zum Ergebnis zurück mit „×“.</p>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector<HTMLButtonElement>(".school-highscore-close")?.addEventListener("click", () => overlay.remove());
  overlay.querySelector<HTMLElement>(".school-highscore-me")?.scrollIntoView({ block: "nearest" });
  ensurePermanentClassMascot();
}

function triggerHighscoreSubmitErrorShake(action: HTMLDivElement): void {
  action.classList.remove("highscore-submit-error");
  void action.offsetWidth;
  action.classList.add("highscore-submit-error");
  window.setTimeout(() => action.classList.remove("highscore-submit-error"), 700);
}

async function submitPersonalHighscore(button: HTMLButtonElement, status: HTMLElement, action: HTMLDivElement): Promise<void> {
  button.disabled = true;
  status.textContent = "Dein persönlicher Rekord wird eingetragen …";

  const student = loadStudentIdentity();
  const personalBest = loadPersonalHighscore(student.studentId);
  const client = createLeaderboardClient();
  if (!personalBest || !client) {
    status.textContent = "Die schulweite Highscoreliste ist momentan nicht erreichbar.";
    triggerHighscoreSubmitErrorShake(action);
    button.disabled = false;
    return;
  }

  try {
    await client.submit(personalBest);
    status.textContent = "Eingetragen – Highscoreliste wird geöffnet …";
    const entries = await client.top();
    renderOverlay(entries, student.name);
  } catch (error) {
    status.textContent = error instanceof Error
      ? error.message
      : "Der Highscore konnte nicht übertragen werden.";
    triggerHighscoreSubmitErrorShake(action);
    button.disabled = false;
  }
}

function installOnResult(result: HTMLElement): void {
  const card = result.querySelector<HTMLElement>(".result-card");
  if (!card || card.querySelector(".result-highscore-action")) return;

  result.querySelector<HTMLElement>(".school-entry")?.remove();

  const action = document.createElement("div");
  action.className = "result-highscore-action";
  action.innerHTML = `
    <button type="button" aria-label="Highscore eintragen">
      <span class="result-highscore-title">Highscore</span>
      <span class="result-highscore-subtitle">eintragen</span>
    </button>
    <p class="result-highscore-status" aria-live="polite"></p>
  `;

  const button = action.querySelector<HTMLButtonElement>("button");
  if (!button) return;
  button.addEventListener("click", () => {
    const status = action.querySelector<HTMLElement>(".result-highscore-status");
    if (status) void submitPersonalHighscore(button, status, action);
  });

  const personalBest = card.querySelector<HTMLElement>(".result-highscore");
  const row = document.createElement("div");
  row.className = "result-action-row";
  if (personalBest) personalBest.replaceWith(row);
  else card.appendChild(row);
  if (personalBest) row.appendChild(personalBest);
  row.appendChild(action);
}

function installOnStartScreen(start: HTMLElement): void {
  const card = start.querySelector<HTMLElement>(".welcome-card");
  if (!card || card.querySelector(".start-class-debug")) return;

  const student = loadStudentIdentity();
  const className = student.className?.trim() || "nicht erkannt";
  const debug = document.createElement("div");
  debug.className = "start-class-debug";
  debug.style.cssText = "display:flex;align-items:center;justify-content:center;gap:14px;margin:14px auto 4px;padding:10px 14px;max-width:520px;border:1px dashed rgba(82,175,231,.55);border-radius:16px;background:rgba(233,247,255,.72);color:#172033;font-size:15px;font-weight:800;text-align:left;";
  debug.innerHTML = `<img src="${CLASS_MASCOT(student.className)}" alt="Klassentier ${escapeHtml(className)}" style="width:76px;height:76px;object-fit:contain;flex:0 0 auto;"><div><div style="color:#52afe7;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Testausgabe</div><div>Ausgelesene Klasse: ${escapeHtml(className)}</div></div>`;

  const greeting = card.querySelector<HTMLElement>(".student-greeting");
  if (greeting) greeting.insertAdjacentElement("afterend", debug);
  else card.insertBefore(debug, card.firstChild);
}

export function initHighscoreFlow(): void {
  const app = document.getElementById("app");
  if (!app) return;

  ensurePermanentClassMascot();

  const observer = new MutationObserver(() => {
    const result = app.querySelector<HTMLElement>(".result-screen");
    if (result) installOnResult(result);
    const start = app.querySelector<HTMLElement>(".start-screen");
    if (start) installOnStartScreen(start);
    ensurePermanentClassMascot();
  });
  observer.observe(app, { childList: true });

  const result = app.querySelector<HTMLElement>(".result-screen");
  if (result) installOnResult(result);
  const start = app.querySelector<HTMLElement>(".start-screen");
  if (start) installOnStartScreen(start);
}
