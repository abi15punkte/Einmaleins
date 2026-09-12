import { loadPersonalHighscore, loadStudentIdentity } from "./highscore";
import { createLeaderboardClient, type LeaderboardEntry } from "./leaderboard";

const CLASS_MASCOT = (className: string | null): string =>
  /^(M(?:[1-9]|1[0-6]))$/i.test(className ?? "")
    ? `./${String(className).toUpperCase()}.png`
    : "./M1.png";

const STAR_ASSETS = ["./Stern1.png", "./Stern2.png", "./Stern3.png"];

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

function starHtml(entry: LeaderboardEntry): string {
  const stars = [entry.stern1, entry.stern2, entry.stern3];
  const count = stars.filter(Boolean).length;

  return `<span class="achievement-stars" aria-label="${count} von 3 Errungenschaften">${STAR_ASSETS.map((asset, index) => `<img src="${asset}" class="${stars[index] ? "" : "is-muted"}" alt="">`).join("")}</span>`;
}

function ensurePermanentClassMascot(): void {
  const student = loadStudentIdentity();
  let mascot = document.querySelector<HTMLImageElement>(".start-class-overlay");

  if (!mascot) {
    mascot = document.createElement("img");
    mascot.className = "start-class-overlay";
    mascot.setAttribute("aria-hidden", "true");
    document.body.appendChild(mascot);
  }

  mascot.src = CLASS_MASCOT(student.className);
  mascot.alt = `Klassentier ${student.className ?? "M1"}`;
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
    const rankClass = entry.rank === 1
      ? "rank-gold"
      : entry.rank === 2
        ? "rank-silver"
        : entry.rank === 3
          ? "rank-bronze"
          : "";

    return `<div class="school-highscore-row ${isMe ? "school-highscore-me" : ""} ${rankClass}"><div class="school-highscore-rank">${entry.rank}</div><div class="school-highscore-entry-meta"><span class="school-highscore-mascot"><img src="${CLASS_MASCOT(entry.className)}" alt="Klasse ${escapeHtml(className)}"></span><div class="school-highscore-name-wrap"><div class="school-highscore-name">${escapeHtml(firstName)}${isMe ? " · Du" : ""}</div><div class="school-highscore-class">Klasse ${escapeHtml(className)}</div></div></div>${starHtml(entry)}<div class="school-highscore-score">${entry.score}</div></div>`;
  }).join("");

  overlay.innerHTML = `
    <style>
      .school-highscore-top { display: none !important; }
      .school-highscore-overlay {
        background: #e9f7ff url("./Background.png") center/cover no-repeat !important;
        color: #172033 !important;
        padding: 20px 24px 30px !important;
      }
      .school-highscore-overlay::after {
        content: "" !important;
        position: fixed !important;
        left: -2vw !important;
        bottom: 4vh !important;
        width: clamp(150px, 18vw, 220px) !important;
        height: clamp(150px, 18vw, 220px) !important;
        background: url("./Alien.png") center/contain no-repeat !important;
        pointer-events: none !important;
        z-index: 20002 !important;
      }
      .school-highscore-close {
        position: fixed !important;
        top: calc(14px + env(safe-area-inset-top)) !important;
        right: calc(14px + env(safe-area-inset-right)) !important;
        z-index: 20004 !important;
        width: 48px !important;
        height: 48px !important;
        border: 1px solid rgba(23,32,51,.1) !important;
        border-radius: 50% !important;
        background: rgba(255,255,255,.94) !important;
        color: #172033 !important;
        font-size: 1.35rem !important;
        line-height: 1 !important;
      }
      .highscore-list-scroll {
        width: min(100%,860px) !important;
        margin: 0 auto !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        flex: 1 !important;
        min-height: 0 !important;
        border-radius: 22px !important;
        background: rgba(255,255,255,.94) !important;
        box-shadow: 0 18px 50px rgba(23,32,51,.08) !important;
        position: relative !important;
        z-index: 20001 !important;
        touch-action: pan-y !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .school-highscore-row {
        display: grid !important;
        grid-template-columns: 78px minmax(0,1fr) 150px 180px !important;
        gap: 8px !important;
        align-items: center !important;
        min-height: 136px !important;
        padding: 24px !important;
        border-top: 1px solid rgba(23,32,51,.08) !important;
      }
      .school-highscore-row:first-child { border-top: 0 !important; }
      .school-highscore-row.rank-gold { background: #fff6d8 !important; }
      .school-highscore-row.rank-silver { background: #f0f2f5 !important; }
      .school-highscore-row.rank-bronze { background: #f7eee7 !important; }
      .school-highscore-rank { font-size: 2.15rem !important; font-weight: 900 !important; color: #6f798a !important; }
      .rank-gold .school-highscore-rank { color: #9a7819 !important; }
      .rank-silver .school-highscore-rank { color: #66707d !important; }
      .rank-bronze .school-highscore-rank { color: #96613f !important; }
      .school-highscore-entry-meta {
        display: grid !important;
        grid-template-columns: 88px minmax(0,1fr) !important;
        align-items: center !important;
        gap: 24px !important;
        min-width: 0 !important;
        transform: translateX(-1vw) !important;
      }
      .school-highscore-mascot {
        width: 88px !important;
        height: 88px !important;
        border-radius: 18px !important;
        display: grid !important;
        place-items: center !important;
        border: 1px solid rgba(23,32,51,.08) !important;
        background: #f3f5f8 !important;
        overflow: hidden !important;
      }
      .school-highscore-mascot img { width: 100% !important; height: 100% !important; object-fit: contain !important; }
      .school-highscore-name-wrap { min-width: 0 !important; }
      .school-highscore-name {
        font-size: 1.55rem !important;
        font-weight: 850 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        color: #000 !important;
      }
      .school-highscore-class {
        display: block !important;
        margin-top: 6px !important;
        color: #52afe7 !important;
        font-size: 1.1rem !important;
        font-weight: 850 !important;
      }
      .school-highscore-me { background: #edf8f1 !important; }
      .achievement-stars {
        display: grid !important;
        grid-template-columns: repeat(3,48px) !important;
        gap: 6px !important;
        width: 150px !important;
        transform: translateX(calc(3vw - 24px)) !important;
      }
      .achievement-stars img { width: 48px !important; height: 48px !important; object-fit: contain !important; }
      .achievement-stars img.is-muted { opacity: .22 !important; filter: grayscale(1) !important; }
      .achievement-stars img:nth-child(3) { transform: translateY(-3px) !important; }
      .school-highscore-score {
        text-align: right !important;
        color: #000 !important;
        font-size: 2.15rem !important;
        font-weight: 900 !important;
        font-variant-numeric: tabular-nums !important;
      }
      .school-highscore-me .school-highscore-score { color: #248f5b !important; }
      .school-highscore-status {
        margin: 16px auto 0 !important;
        width: min(100%,860px) !important;
        text-align: center !important;
        color: #7a8495 !important;
        position: relative !important;
        z-index: 20001 !important;
      }
      @media (max-width: 700px) {
        .school-highscore-overlay { padding: 12px !important; }
        .school-highscore-overlay::after {
          left: -4vw !important;
          bottom: 2vh !important;
          width: 22vw !important;
          height: 22vw !important;
        }
        .school-highscore-row {
          grid-template-columns: 58px minmax(0,1fr) 96px 108px !important;
          gap: 6px !important;
          min-height: 106px !important;
          padding: 18px 14px !important;
        }
        .school-highscore-rank { font-size: 1.45rem !important; }
        .school-highscore-entry-meta { grid-template-columns: 62px minmax(0,1fr) !important; gap: 16px !important; transform: translateX(-1vw) !important; }
        .school-highscore-mascot { width: 62px !important; height: 62px !important; border-radius: 14px !important; }
        .school-highscore-name { font-size: 1.12rem !important; }
        .school-highscore-class { font-size: .9rem !important; }
        .achievement-stars { grid-template-columns: repeat(3,30px) !important; width: 96px !important; gap: 2px !important; transform: translateX(calc(3vw - 16px)) !important; }
        .achievement-stars img { width: 30px !important; height: 30px !important; }
        .school-highscore-score { font-size: 1.5rem !important; }
      }
    </style>
    <button type="button" class="school-highscore-close" aria-label="Highscoreliste verlassen">×</button>
    <div class="highscore-list-scroll" role="list" aria-label="Rangliste">${rows || "<p style=\"padding:24px;text-align:center\">Noch keine Einträge vorhanden.</p>"}</div>
    <p class="school-highscore-status">Zum Ergebnis zurück mit „×“.</p>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector<HTMLButtonElement>(".school-highscore-close")?.addEventListener("click", () => overlay.remove());
  overlay.querySelector<HTMLElement>(".school-highscore-me")?.scrollIntoView({ block: "nearest" });
  ensurePermanentClassMascot();
}

function triggerHighscoreSubmitErrorShake(action: HTMLDivElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  action.classList.remove("highscore-submit-error");
  action.style.animation = "none";
  void action.offsetWidth;
  action.classList.add("highscore-submit-error");

  const animation = action.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-1vw)" },
      { transform: "translateX(0.9vw)" },
      { transform: "translateX(-0.75vw)" },
      { transform: "translateX(0.6vw)" },
      { transform: "translateX(-0.45vw)" },
      { transform: "translateX(0.3vw)" },
      { transform: "translateX(0)" }
    ],
    { duration: 620, easing: "cubic-bezier(.36,.07,.19,.97)", fill: "none" }
  );

  animation.finished.finally(() => {
    action.classList.remove("highscore-submit-error");
    action.style.animation = "";
  });
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

export function initHighscoreFlow(): void {
  const app = document.getElementById("app");
  if (!app) return;

  ensurePermanentClassMascot();

  const observer = new MutationObserver(() => {
    const result = app.querySelector<HTMLElement>(".result-screen");
    if (result) installOnResult(result);
    ensurePermanentClassMascot();
  });
  observer.observe(app, { childList: true, subtree: true });

  const result = app.querySelector<HTMLElement>(".result-screen");
  if (result) installOnResult(result);
}
