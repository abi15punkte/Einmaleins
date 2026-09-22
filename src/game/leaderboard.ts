import { getPersonalBackgroundAsset, loadCompletedGames, loadPersonalHighscore, loadStudentIdentity, unlockSecondStar, type HighscoreRecord } from "./highscore";
import { highestUnlockedFrame, loadFrameUnlocks, mergeFrameUnlocks, type FrameUnlocks } from "./frameUnlocks";

type HighscoreRecordWithStars = HighscoreRecord & {
  stern1?: boolean;
  stern2?: boolean;
  stern3?: boolean;
};

type FirestoreSdk = typeof import("firebase/firestore") & {
  db: typeof import("../firebase").db;
};

let firestoreSdkPromise: Promise<FirestoreSdk> | null = null;
let latestLeaderboardEntries: LeaderboardEntry[] | null = null;
let latestAllLeaderboardEntries: LeaderboardEntry[] | null = null;
let leaderboardPortraitObserver: MutationObserver | null = null;
let secondStarChallengeLoadedForGame = false;
let secondStarChallengeLoading = false;
let secondStarTargetScore: number | null = null;
let lastSuccessfulLeaderboardSubmitKey: string | null = null;

async function loadFirestoreSdk(): Promise<FirestoreSdk> {
  if (!firestoreSdkPromise) {
    firestoreSdkPromise = Promise.all([
      import("firebase/firestore"),
      import("../firebase")
    ]).then(([firestore, firebase]) => ({
      ...firestore,
      db: firebase.db
    }));
  }
  return firestoreSdkPromise;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  className: string | null;
  score: number;
  stern1: boolean;
  stern2: boolean;
  stern3: boolean;
  completedGames: number;
  rahmenB: boolean;
  rahmenS: boolean;
  rahmenG: boolean;
  öffentlich: boolean;
}

interface InternalLeaderboardEntry extends LeaderboardEntry {
  timestampMs: number;
}

export interface LeaderboardClient {
  submit(record: HighscoreRecord, publicly?: boolean): Promise<void>;
  top(useCache?: boolean, publishedOnly?: boolean): Promise<LeaderboardEntry[]>;
}

export interface LeaderboardConfig {
  endpoint: string | null;
}

const HIGHSCORE_COLLECTION = "highscores";
const PRIVATE_DOCUMENT_SUFFIX = "__private";
const PUBLIC_DOCUMENT_SUFFIX = "__public";

function leaderboardDocumentId(studentId: string, publicly: boolean): string {
  return `${studentId}${publicly ? PUBLIC_DOCUMENT_SUFFIX : PRIVATE_DOCUMENT_SUFFIX}`;
}

function timestampToMillis(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : 0;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === "function") {
      const millis = Number(toMillis.call(value));
      return Number.isFinite(millis) ? millis : 0;
    }
  }

  return 0;
}

function deduplicateLeaderboardEntries(entries: InternalLeaderboardEntry[]): InternalLeaderboardEntry[] {
  const entriesByStudent = new Map<string, InternalLeaderboardEntry[]>();

  for (const entry of entries) {
    const group = entriesByStudent.get(entry.studentId);
    if (group) {
      group.push(entry);
    } else {
      entriesByStudent.set(entry.studentId, [entry]);
    }
  }

  return Array.from(entriesByStudent.values()).map((group) => {
    const latest = group.reduce<InternalLeaderboardEntry | null>((current, entry) => {
      if (
        !current
        || entry.timestampMs > current.timestampMs
        || (entry.timestampMs === current.timestampMs && entry.score > current.score)
      ) {
        return entry;
      }
      return current;
    }, null)!;

    // A manually completed class value may exist in another document for the
    // same student (for example in the public/private pair). Do not let the
    // latest score record hide that information when the selected record has
    // no class yet. Never overwrite an already populated class.
    if (!latest.className?.trim()) {
      const classCandidates = group
        .filter((entry) => Boolean(entry.className?.trim()))
        .sort((a, b) => {
          if (b.timestampMs !== a.timestampMs) return b.timestampMs - a.timestampMs;
          return b.score - a.score;
        });

      if (classCandidates[0]) {
        return {
          ...latest,
          className: classCandidates[0].className
        };
      }
    }

    return latest;
  });
}

function stripLeaderboardMetadata(entry: InternalLeaderboardEntry): LeaderboardEntry {
  const { timestampMs: _timestampMs, ...publicEntry } = entry;
  return publicEntry;
}


function portraitForClassName(className: string | null): string {
  const normalized = String(className ?? "").trim().toUpperCase();
  const match = normalized.match(/^M([1-9]|1[0-6])$/);
  return match ? `P${match[1]}.png` : "P1.png";
}

function backgroundForCompletedGames(completedGames: number): string | null {
  const asset = getPersonalBackgroundAsset(completedGames);
  return asset ? `url("${import.meta.env.BASE_URL}${asset}")` : null;
}

function frameForEntry(entry: Pick<LeaderboardEntry, "rahmenB" | "rahmenS" | "rahmenG">): string | null {
  const frame = highestUnlockedFrame({
    rahmenB: entry.rahmenB,
    rahmenS: entry.rahmenS,
    rahmenG: entry.rahmenG
  });
  if (frame === "G") return `url("${import.meta.env.BASE_URL}RahmenG.png")`;
  if (frame === "S") return `url("${import.meta.env.BASE_URL}RahmenS.png")`;
  if (frame === "B") return `url("${import.meta.env.BASE_URL}RahmenB.png")`;
  return null;
}

function leaderboardSubmitKey(
  record: HighscoreRecord,
  completedGames: number,
  publicly: boolean,
  frameUnlocks: FrameUnlocks = loadFrameUnlocks(record.studentId)
): string {
  const recordWithStars = record as HighscoreRecordWithStars;
  return JSON.stringify([
    record.studentId.trim(),
    record.name.trim(),
    record.className?.trim() || null,
    record.score,
    completedGames,
    publicly,
    recordWithStars.stern1 === true,
    recordWithStars.stern2 === true,
    recordWithStars.stern3 === true,
    frameUnlocks.rahmenB === true,
    frameUnlocks.rahmenS === true,
    frameUnlocks.rahmenG === true
  ]);
}

function hasAlreadySubmitted(
  record: HighscoreRecord,
  completedGames: number,
  publicly: boolean,
  frameUnlocks: FrameUnlocks = loadFrameUnlocks(record.studentId)
): boolean {
  return lastSuccessfulLeaderboardSubmitKey === leaderboardSubmitKey(record, completedGames, publicly, frameUnlocks);
}

function markLeaderboardSubmitted(
  record: HighscoreRecord,
  completedGames: number,
  publicly: boolean,
  frameUnlocks: FrameUnlocks = loadFrameUnlocks(record.studentId)
): void {
  lastSuccessfulLeaderboardSubmitKey = leaderboardSubmitKey(record, completedGames, publicly, frameUnlocks);
}

function invalidateLeaderboardCaches(): void {
  latestLeaderboardEntries = null;
  latestAllLeaderboardEntries = null;
}

function applyLeaderboardPortraits(): void {
  if (typeof document === "undefined" || !latestLeaderboardEntries) return;

  const rows = Array.from(document.querySelectorAll<HTMLElement>(".school-highscore-overlay .school-highscore-row"));
  rows.forEach((row, index) => {
    const entry = latestLeaderboardEntries?.[index];
    if (!entry) return;

    const mascot = row.querySelector<HTMLElement>(".school-highscore-mascot");
    const image = row.querySelector<HTMLImageElement>(".school-highscore-mascot img");
    if (!mascot) return;

    const backgroundValue = backgroundForCompletedGames(entry.completedGames) ?? "#ffffff";
    if (mascot.style.getPropertyValue("--school-highscore-mascot-background") !== backgroundValue) {
      mascot.style.setProperty("--school-highscore-mascot-background", backgroundValue);
    }

    const frameValue = frameForEntry(entry) ?? "none";
    if (mascot.style.getPropertyValue("--school-highscore-frame-image") !== frameValue) {
      mascot.style.setProperty("--school-highscore-frame-image", frameValue);
    }

    const portraitSrc = `./${portraitForClassName(entry.className)}`;
    if (image && image.getAttribute("src") !== portraitSrc) {
      image.src = portraitSrc;
    }
  });
}

function installLeaderboardPortraitObserver(): void {
  if (typeof document === "undefined" || leaderboardPortraitObserver !== null) return;

  leaderboardPortraitObserver = new MutationObserver(() => {
    applyLeaderboardPortraits();
  });
  leaderboardPortraitObserver.observe(document.body, { childList: true, subtree: true });
}

async function checkSecondStarChallenge(): Promise<void> {
  if (typeof document === "undefined") return;

  const timeElement = document.querySelector<HTMLElement>(".game-screen #time");
  if (!timeElement) return;

  const match = timeElement.textContent?.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return;

  const remainingSeconds = Number(match[1]) * 60 + Number(match[2]);
  if (remainingSeconds > 60) {
    secondStarChallengeLoadedForGame = false;
    secondStarChallengeLoading = false;
    secondStarTargetScore = null;
    latestLeaderboardEntries = null;
    return;
  }

  const student = loadStudentIdentity();
  const personalBest = loadPersonalHighscore(student.studentId);

  if (!secondStarChallengeLoadedForGame && !secondStarChallengeLoading) {
    secondStarChallengeLoading = true;
    try {
      const entries = await createLeaderboardClient().top(false);
      secondStarTargetScore = personalBest?.stern2 === true ? null : entries[2]?.score ?? null;
      secondStarChallengeLoadedForGame = true;
    } catch (error) {
      console.error("Highscoreliste konnte für die Hintergrundvorladung nicht geladen werden.", error);
    } finally {
      secondStarChallengeLoading = false;
    }
  }

  if (personalBest?.stern2 === true) return;

  const scoreElement = document.querySelector<HTMLElement>(".game-screen #score");
  if (!scoreElement) return;

  const currentScore = Number.parseInt(scoreElement.textContent?.trim() ?? "0", 10);
  if (!Number.isFinite(currentScore)) return;

  if (
    secondStarChallengeLoadedForGame
    && secondStarTargetScore !== null
    && currentScore > secondStarTargetScore
  ) {
    unlockSecondStar(student.studentId);
    secondStarTargetScore = null;
  }
}

function installGameLeaderboardReadObserver(): void {
  if (typeof document === "undefined") return;

  const startObserving = (): void => {
    if (!document.body) return;

    const observer = new MutationObserver(() => {
      void checkSecondStarChallenge();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    void checkSecondStarChallenge();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserving, { once: true });
  } else {
    startObserving();
  }
}

export function loadLeaderboardConfig(): LeaderboardConfig {
  const endpoint = typeof import.meta !== "undefined" && typeof import.meta.env?.VITE_LEADERBOARD_URL === "string"
    ? import.meta.env.VITE_LEADERBOARD_URL.trim()
    : "";
  return { endpoint: endpoint || null };
}

export function createLeaderboardClient(
  config: LeaderboardConfig = loadLeaderboardConfig(),
  fetcher: typeof fetch = fetch
): LeaderboardClient {
  const endpoint = config.endpoint?.trim().replace(/\/$/, "") ?? "";
  return endpoint ? createLegacyHttpClient(endpoint, fetcher) : createFirestoreClient();
}

function createFirestoreClient(): LeaderboardClient {
  return {
    async submit(record, publicly = false) {
      if (!Number.isInteger(record.score) || record.score < 0) {
        throw new Error("Leaderboard score must be a non-negative integer.");
      }

      const studentId = record.studentId.trim();
      if (!studentId) throw new Error("Leaderboard student id is required.");

      const name = record.name.trim();
      if (!name) throw new Error("Leaderboard name is required.");

      const recordWithStars = record as HighscoreRecordWithStars;
      const achievedTimestamp = new Date(record.achievedAt);
      if (Number.isNaN(achievedTimestamp.getTime())) throw new Error("Leaderboard timestamp is invalid.");

      const timestamp = publicly ? new Date() : achievedTimestamp;
      const completedGames = loadCompletedGames(studentId);
      const localFrameUnlocks = loadFrameUnlocks(studentId);
      if (!publicly && hasAlreadySubmitted(record, completedGames, publicly, localFrameUnlocks)) return;

      const { doc, getDoc, setDoc, Timestamp, db } = await loadFirestoreSdk();
      const studentDoc = doc(db, HIGHSCORE_COLLECTION, leaderboardDocumentId(studentId, publicly));

      try {
        const existingSnapshot = await getDoc(studentDoc);
        const existingData = existingSnapshot.exists()
          ? existingSnapshot.data() as Record<string, unknown>
          : null;

        const mergedFrameUnlocks = mergeFrameUnlocks(studentId, {
          rahmenB: existingData?.RahmenB === true || localFrameUnlocks.rahmenB,
          rahmenS: existingData?.RahmenS === true || localFrameUnlocks.rahmenS,
          rahmenG: existingData?.RahmenG === true || localFrameUnlocks.rahmenG
        });

        await setDoc(studentDoc, {
          studentId,
          name,
          klasse: record.className?.trim() || null,
          punkte: record.score,
          completedGames,
          stern1: recordWithStars.stern1 === true,
          stern2: recordWithStars.stern2 === true,
          stern3: recordWithStars.stern3 === true,
          RahmenB: mergedFrameUnlocks.rahmenB,
          RahmenS: mergedFrameUnlocks.rahmenS,
          RahmenG: mergedFrameUnlocks.rahmenG,
          öffentlich: publicly,
          timestamp: Timestamp.fromDate(timestamp)
        });

        markLeaderboardSubmitted(record, completedGames, publicly, mergedFrameUnlocks);
        invalidateLeaderboardCaches();
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";
        if (code === "permission-denied") return;
        throw error;
      }
    },

    async top(useCache = true, publishedOnly = true) {
      const cachedEntries = publishedOnly ? latestLeaderboardEntries : latestAllLeaderboardEntries;
      if (useCache && cachedEntries) {
        return cachedEntries;
      }

      const { getDocs, collection, orderBy, query, db } = await loadFirestoreSdk();
      const snapshot = await getDocs(query(collection(db, HIGHSCORE_COLLECTION), orderBy("punkte", "desc")));

      const studentId = loadStudentIdentity().studentId;
      const allEntries = snapshot.docs
        .map((document, index) => validateFirestoreEntry(document.data() as Record<string, unknown>, index + 1))
        .sort((a, b) => b.score - a.score);

      const filteredEntries = publishedOnly
        ? allEntries.filter((entry) => entry.öffentlich)
        : allEntries;

      const entries = deduplicateLeaderboardEntries(filteredEntries)
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
          ...stripLeaderboardMetadata(entry),
          rank: index + 1
        }));

      const ownEntry = entries.find((entry) => entry.studentId === studentId);
      if (ownEntry) {
        const mergedLocal = mergeFrameUnlocks(studentId, {
          rahmenB: ownEntry.rahmenB,
          rahmenS: ownEntry.rahmenS,
          rahmenG: ownEntry.rahmenG
        });
        ownEntry.rahmenB = mergedLocal.rahmenB;
        ownEntry.rahmenS = mergedLocal.rahmenS;
        ownEntry.rahmenG = mergedLocal.rahmenG;
      }

      if (publishedOnly) {
        latestLeaderboardEntries = entries;
      } else {
        latestAllLeaderboardEntries = entries;
      }
      installLeaderboardPortraitObserver();
      applyLeaderboardPortraits();
      return entries;
    }
  };
}

function createLegacyHttpClient(endpoint: string, fetcher: typeof fetch): LeaderboardClient {
  return {
    async submit(record, publicly = false) {
      const completedGames = loadCompletedGames(record.studentId);
      const frameUnlocks = loadFrameUnlocks(record.studentId);
      if (!publicly && hasAlreadySubmitted(record, completedGames, publicly, frameUnlocks)) return;

      const response = await fetcher(`${endpoint}/scores`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...record,
          completedGames,
          RahmenB: frameUnlocks.rahmenB,
          RahmenS: frameUnlocks.rahmenS,
          RahmenG: frameUnlocks.rahmenG,
          öffentlich: publicly
        })
      });
      if (!response.ok) throw new Error(`Leaderboard submit failed: ${response.status}`);
      markLeaderboardSubmitted(record, completedGames, publicly, frameUnlocks);
      invalidateLeaderboardCaches();
    },

    async top(useCache = true, publishedOnly = true) {
      const cachedEntries = publishedOnly ? latestLeaderboardEntries : latestAllLeaderboardEntries;
      if (useCache && cachedEntries) {
        return cachedEntries;
      }

      const response = await fetcher(`${endpoint}/scores`, {
        method: "GET",
        headers: { accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Leaderboard fetch failed: ${response.status}`);
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error("Leaderboard response must be an array.");

      const allEntries = payload
        .map(validateLegacyEntry)
        .sort((a, b) => b.score - a.score);
      const filteredEntries = publishedOnly ? allEntries.filter((entry) => entry.öffentlich) : allEntries;
      const entries = deduplicateLeaderboardEntries(filteredEntries)
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({
          ...stripLeaderboardMetadata(entry),
          rank: index + 1
        }));
      if (publishedOnly) {
        latestLeaderboardEntries = entries;
      } else {
        latestAllLeaderboardEntries = entries;
      }
      installLeaderboardPortraitObserver();
      applyLeaderboardPortraits();
      return entries;
    }
  };
}

function validateFirestoreEntry(
  value: Record<string, unknown>,
  rank: number
): InternalLeaderboardEntry {
  const studentIdValue = value.studentId;
  const nameValue = value.name;
  const classNameValue = value.klasse;
  const scoreValue = value.punkte;
  const completedGamesValue = value.completedGames;
  const stern1Value = value.stern1;
  const stern2Value = value.stern2;
  const stern3Value = value.stern3;
  const rahmenBValue = value.RahmenB;
  const rahmenSValue = value.RahmenS;
  const rahmenGValue = value.RahmenG;
  const öffentlichValue = value.öffentlich;
  const timestampValue = value.timestamp;

  if (
    typeof studentIdValue !== "string" ||
    !studentIdValue.trim() ||
    typeof nameValue !== "string" ||
    !nameValue.trim() ||
    typeof scoreValue !== "number" ||
    !Number.isInteger(scoreValue) ||
    scoreValue < 0 ||
    (classNameValue !== null && classNameValue !== undefined && typeof classNameValue !== "string") ||
    (completedGamesValue !== undefined && (typeof completedGamesValue !== "number" || !Number.isFinite(completedGamesValue))) ||
    (stern1Value !== undefined && typeof stern1Value !== "boolean") ||
    (stern2Value !== undefined && typeof stern2Value !== "boolean") ||
    (stern3Value !== undefined && typeof stern3Value !== "boolean") ||
    (rahmenBValue !== undefined && typeof rahmenBValue !== "boolean") ||
    (rahmenSValue !== undefined && typeof rahmenSValue !== "boolean") ||
    (rahmenGValue !== undefined && typeof rahmenGValue !== "boolean")
  ) throw new Error("Invalid leaderboard entry.");

  return {
    rank,
    studentId: studentIdValue.trim(),
    name: nameValue,
    className: typeof classNameValue === "string" ? classNameValue : null,
    score: scoreValue,
    stern1: stern1Value === true,
    stern2: stern2Value === true,
    stern3: stern3Value === true,
    completedGames: typeof completedGamesValue === "number" && Number.isFinite(completedGamesValue)
      ? Math.max(0, Math.floor(completedGamesValue))
      : 0,
    rahmenB: rahmenBValue === true,
    rahmenS: rahmenSValue === true,
    rahmenG: rahmenGValue === true,
    öffentlich: öffentlichValue !== false,
    timestampMs: timestampToMillis(timestampValue)
  };
}

function validateLegacyEntry(value: unknown): InternalLeaderboardEntry {
  if (!value || typeof value !== "object") throw new Error("Invalid leaderboard entry.");
  const entry = value as Record<string, unknown>;
  const rankValue = entry.rank;
  const studentIdValue = entry.studentId;
  const nameValue = entry.name;
  const scoreValue = entry.score;
  const classNameValue = entry.className;
  const completedGamesValue = entry.completedGames;
  const stern1Value = entry.stern1;
  const stern2Value = entry.stern2;
  const stern3Value = entry.stern3;
  const rahmenBValue = entry.RahmenB;
  const rahmenSValue = entry.RahmenS;
  const rahmenGValue = entry.RahmenG;
  const öffentlichValue = entry.öffentlich;
  const timestampValue = entry.timestamp ?? entry.achievedAt;

  if (
    typeof rankValue !== "number" ||
    !Number.isInteger(rankValue) ||
    rankValue < 1 ||
    typeof studentIdValue !== "string" ||
    !studentIdValue.trim() ||
    typeof nameValue !== "string" ||
    typeof scoreValue !== "number" ||
    !Number.isInteger(scoreValue) ||
    scoreValue < 0 ||
    (completedGamesValue !== undefined && (typeof completedGamesValue !== "number" || !Number.isFinite(completedGamesValue))) ||
    (stern1Value !== undefined && typeof stern1Value !== "boolean") ||
    (stern2Value !== undefined && typeof stern2Value !== "boolean") ||
    (stern3Value !== undefined && typeof stern3Value !== "boolean") ||
    (rahmenBValue !== undefined && typeof rahmenBValue !== "boolean") ||
    (rahmenSValue !== undefined && typeof rahmenSValue !== "boolean") ||
    (rahmenGValue !== undefined && typeof rahmenGValue !== "boolean")
  ) throw new Error("Invalid leaderboard entry.");

  return {
    rank: rankValue,
    studentId: studentIdValue.trim(),
    name: nameValue,
    className: typeof classNameValue === "string" ? classNameValue : null,
    score: scoreValue,
    stern1: stern1Value === true,
    stern2: stern2Value === true,
    stern3: stern3Value === true,
    completedGames: typeof completedGamesValue === "number" && Number.isFinite(completedGamesValue)
      ? Math.max(0, Math.floor(completedGamesValue))
      : 0,
    rahmenB: rahmenBValue === true,
    rahmenS: rahmenSValue === true,
    rahmenG: rahmenGValue === true,
    öffentlich: öffentlichValue !== false,
    timestampMs: timestampToMillis(timestampValue)
  };
}

installGameLeaderboardReadObserver();
