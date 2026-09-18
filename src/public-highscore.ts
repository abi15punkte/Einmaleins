import { createLeaderboardClient, type LeaderboardEntry } from "./game/leaderboard";
import { highestUnlockedFrame } from "./game/frameUnlocks";
import { getPersonalBackgroundAsset } from "./game/highscore";
import "./style.css";
import "./responsive.css";
import "./laptop.css";

const STAR_ASSETS = ["./Stern1.png", "./Stern2.png", "./Stern3.png"];
const REFRESH_INTERVAL_MS = 15_000;

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function classPortrait(className: string | null): string {
  const normalized = String(className ?? "").trim().toUpperCase();
  const match = normalized.match(/^M([1-9]|1[0-6])$/);
  return match ? `./P${match[1]}.png` : "./P1.png";
}

function portraitBackground(completedGames: number): string | null {
  const asset = getPersonalBackgroundAsset(completedGames);
  return asset ? `./${asset}` : null;
}

function firstNameOnly(value: string): string {
  return value.trim().split(/\s+/)[0] || "Schüler";
}

function frameAsset(entry: LeaderboardEntry): string | null {
  const frame = highestUnlockedFrame({
    rahmenB: entry.rahmenB,
    rahmenS: entry.rahmenS,
    rahmenG: entry.rahmenG
  });
  return frame ? `./Rahmen${frame}.png` : null;
}

function starHtml(entry: LeaderboardEntry): string {
  const stars = [entry.stern1, entry.stern2, entry.stern3];
  const count = stars.filter(Boolean).length;

  return `<span class="achievement-stars" aria-label="${count} von 3 Errungenschaften">${STAR_ASSETS.map((asset, index) => `<img src="${asset}" class="${stars[index] ? "" : "is-muted"}" alt="">`).join("")}</span>`;
}

function installStyles(root: HTMLElement): void {
  const style = document.createElement("style");
  style.textContent = `
    html, body { margin: 0; min-height: 100%; }
    body { background: #e9f7ff; overflow: hidden; }
    #public-highscore { min-height: 100vh; }
    .public-highscore-overlay {
      position: fixed;
      inset: 0;
      z-index: 20000;
      display: flex;
      flex-direction: column;
      overscroll-behavior: none;
      background: #e9f7ff url("./Background.png") center/cover no-repeat;
      color: #172033;
      padding: 20px 24px 30px;
      box-sizing: border-box;
    }
    .public-highscore-overlay::after { display: none; }
    .highscore-list-scroll {
      width: min(100%, 860px) !important;
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
      box-sizing: border-box !important;
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
      position: relative !important;
      border: 1px solid rgba(23,32,51,.08) !important;
      background: var(--school-highscore-mascot-background, #ffffff) center / cover no-repeat !important;
      overflow: visible !important;
      isolation: isolate !important;
    }
    .school-highscore-mascot > img.school-highscore-portrait {
      position: absolute !important;
      left: 10% !important;
      bottom: 0 !important;
      width: 80% !important;
      height: 80% !important;
      z-index: 1 !important;
      object-fit: contain !important;
    }
    .school-highscore-mascot > img.school-highscore-frame {
      position: absolute !important;
      left: -8% !important;
      top: -8% !important;
      width: 116% !important;
      height: 116% !important;
      max-width: none !important;
      max-height: none !important;
      z-index: 2 !important;
      object-fit: contain !important;
      object-position: center !important;
      transform: none !important;
      pointer-events: none !important;
    }
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
    .achievement-stars {
      display: grid !important;
      grid-template-columns: repeat(3,48px) !important;
      gap: 6px !important;
      width: 150px !important;
      transform: translateX(calc(3vw - 24px)) !important;
    }
    .achievement-stars img { width: 48px !important; height: 48px !important; object-fit: contain !important; }
    .achievement-stars img.is-muted { opacity: .22 !important; filter: grayscale(1) !important; }
    .achievement-stars img:nth-child(3) { position: relative !important; top: -3px !important; }
    .school-highscore-score {
      text-align: right !important;
      color: #000 !important;
      font-size: 2.15rem !important;
      font-weight: 900 !important;
      font-variant-numeric: tabular-nums !important;
    }
    @keyframes highscore-star-hop {
      0%, 100% { transform: translateY(0) scale(1); }
      25% { transform: translateY(-8px) scale(1.08); }
      45% { transform: translateY(0) scale(.98); }
      65% { transform: translateY(-3px) scale(1.02); }
    }
    .public-highscore-overlay .school-highscore-row:first-child .achievement-stars img:not(.is-muted) {
      animation: highscore-star-hop 3s ease-in-out infinite;
      will-change: transform;
    }
    .public-highscore-overlay .school-highscore-row:first-child .achievement-stars img:nth-child(1):not(.is-muted) { animation-delay: 0s; }
    .public-highscore-overlay .school-highscore-row:first-child .achievement-stars img:nth-child(2):not(.is-muted) { animation-delay: 1s; }
    .public-highscore-overlay .school-highscore-row:first-child .achievement-stars img:nth-child(3):not(.is-muted) { animation-delay: 2s; }
    .school-highscore-status {
      margin: 16px auto 0 !important;
      width: min(100%,860px) !important;
      text-align: center !important;
      color: #7a8495 !important;
      position: relative !important;
      z-index: 20001 !important;
      min-height: 1.2em;
    }
    .school-highscore-status.error { color: #b13b3b !important; }
    @media (max-width: 700px) {
      .public-highscore-overlay { padding: 12px !important; }
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
    @media (prefers-reduced-motion: reduce) {
      .public-highscore-overlay .school-highscore-row:first-child .achievement-stars img:not(.is-muted) { animation: none !important; }
    }
  `;
  root.appendChild(style);
}

function rowHtml(entry: LeaderboardEntry): string {
  const className = entry.className ?? "–";
  const rankClass = entry.rank === 1 ? "rank-gold" : entry.rank === 2 ? "rank-silver" : entry.rank === 3 ? "rank-bronze" : "";
  const firstName = firstNameOnly(entry.name);
  const backgroundAsset = portraitBackground(entry.completedGames);
  const frameAssetPath = frameAsset(entry);
  const backgroundStyle = backgroundAsset
    ? ` style="--school-highscore-mascot-background:url('${backgroundAsset}')"`
    : "";

  return `<div class="school-highscore-row ${rankClass}" role="listitem">
    <div class="school-highscore-rank">${entry.rank}</div>
    <div class="school-highscore-entry-meta">
      <span class="school-highscore-mascot"${backgroundStyle}><img src="${classPortrait(entry.className)}" class="school-highscore-portrait" alt="Klasse ${escapeHtml(className)}">${frameAssetPath ? `<img src="${frameAssetPath}" class="school-highscore-frame" aria-hidden="true" alt="">` : ""}</span>
      <div class="school-highscore-name-wrap">
        <div class="school-highscore-name">${escapeHtml(firstName)}</div>
        <div class="school-highscore-class">Klasse ${escapeHtml(className)}</div>
      </div>
    </div>
    ${starHtml(entry)}
    <div class="school-highscore-score">${entry.score}</div>
  </div>`;
}

function renderList(list: HTMLElement, entries: LeaderboardEntry[]): void {
  list.innerHTML = entries.length
    ? entries.map(rowHtml).join("")
    : `<p style="padding:24px;text-align:center">Noch keine Einträge vorhanden.</p>`;
}

async function main(): Promise<void> {
  const root = document.getElementById("public-highscore");
  if (!root) throw new Error("Public highscore root not found.");
  installStyles(root);

  const overlay = document.createElement("section");
  overlay.className = "public-highscore-overlay";
  overlay.setAttribute("aria-label", "Schulweite Highscoreliste");
  overlay.innerHTML = `
    <div class="highscore-list-scroll" role="list" aria-label="Rangliste" aria-busy="true"></div>
    <p class="school-highscore-status" aria-live="polite">Highscoreliste wird geladen …</p>
  `;
  root.appendChild(overlay);

  const list = overlay.querySelector<HTMLElement>(".highscore-list-scroll");
  const status = overlay.querySelector<HTMLElement>(".school-highscore-status");
  if (!list || !status) throw new Error("Public highscore UI could not be initialized.");

  const client = createLeaderboardClient();

  const refresh = async (initial: boolean): Promise<void> => {
    try {
      const entries = await client.top(false);
      renderList(list, entries);
      list.setAttribute("aria-busy", "false");
      status.classList.remove("error");
      status.textContent = `Automatische Aktualisierung · ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
      list.setAttribute("aria-busy", "false");
      status.classList.add("error");
      status.textContent = error instanceof Error
        ? `Highscoreliste nicht erreichbar: ${error.message}`
        : "Die Highscoreliste ist momentan nicht erreichbar.";
      if (initial) renderList(list, []);
    }
  };

  await refresh(true);
  window.setInterval(() => { void refresh(false); }, REFRESH_INTERVAL_MS);
}

void main();
