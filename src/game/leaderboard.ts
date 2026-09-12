import type { HighscoreRecord } from "./highscore";

type HighscoreRecordWithStars = HighscoreRecord & {
  stern1?: boolean;
  stern2?: boolean;
  stern3?: boolean;
};

type FirestoreSdk = typeof import("firebase/firestore") & {
  db: typeof import("../firebase").db;
};

let firestoreSdkPromise: Promise<FirestoreSdk> | null = null;

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
}

export interface LeaderboardClient {
  submit(record: HighscoreRecord): Promise<void>;
  top(): Promise<LeaderboardEntry[]>;
}

export interface LeaderboardConfig {
  endpoint: string | null;
}

const HIGHSCORE_COLLECTION = "highscores";

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
    async submit(record) {
      if (!Number.isInteger(record.score) || record.score < 0) {
        throw new Error("Leaderboard score must be a non-negative integer.");
      }

      const studentId = record.studentId.trim();
      if (!studentId) throw new Error("Leaderboard student id is required.");

      const name = record.name.trim();
      if (!name) throw new Error("Leaderboard name is required.");

      const recordWithStars = record as HighscoreRecordWithStars;
      const timestamp = new Date(record.achievedAt);
      if (Number.isNaN(timestamp.getTime())) throw new Error("Leaderboard timestamp is invalid.");

      const { doc, getDoc, setDoc, Timestamp, db } = await loadFirestoreSdk();
      const studentDoc = doc(db, HIGHSCORE_COLLECTION, studentId);
      const existing = await getDoc(studentDoc);

      if (existing.exists()) {
        const existingData = existing.data();
        const existingScore = existingData.punkte;
        if (typeof existingScore === "number" && Number.isInteger(existingScore) && existingScore >= record.score) {
          return;
        }
      }

      await setDoc(studentDoc, {
        studentId,
        name,
        klasse: record.className?.trim() || null,
        punkte: record.score,
        stern1: recordWithStars.stern1 === true,
        stern2: recordWithStars.stern2 === true,
        stern3: recordWithStars.stern3 === true,
        timestamp: Timestamp.fromDate(timestamp)
      });
    },

    async top() {
      const { getDocs, collection, orderBy, query, db } = await loadFirestoreSdk();
      const snapshot = await getDocs(query(collection(db, HIGHSCORE_COLLECTION), orderBy("punkte", "desc")));

      return snapshot.docs
        .map((document, index) => validateFirestoreEntry(document.data() as Record<string, unknown>, index + 1))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
  };
}

function createLegacyHttpClient(endpoint: string, fetcher: typeof fetch): LeaderboardClient {
  return {
    async submit(record) {
      const response = await fetcher(`${endpoint}/scores`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(record)
      });
      if (!response.ok) throw new Error(`Leaderboard submit failed: ${response.status}`);
    },

    async top() {
      const response = await fetcher(`${endpoint}/scores`, {
        method: "GET",
        headers: { accept: "application/json" }
      });
      if (!response.ok) throw new Error(`Leaderboard fetch failed: ${response.status}`);
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error("Leaderboard response must be an array.");

      return payload
        .map(validateLegacyEntry)
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
  };
}

function validateFirestoreEntry(
  value: Record<string, unknown>,
  rank: number
): LeaderboardEntry {
  const studentIdValue = value.studentId;
  const nameValue = value.name;
  const classNameValue = value.klasse;
  const scoreValue = value.punkte;
  const stern1Value = value.stern1;
  const stern2Value = value.stern2;
  const stern3Value = value.stern3;

  if (
    typeof studentIdValue !== "string" ||
    !studentIdValue.trim() ||
    typeof nameValue !== "string" ||
    !nameValue.trim() ||
    typeof scoreValue !== "number" ||
    !Number.isInteger(scoreValue) ||
    scoreValue < 0 ||
    (classNameValue !== null && classNameValue !== undefined && typeof classNameValue !== "string") ||
    (stern1Value !== undefined && typeof stern1Value !== "boolean") ||
    (stern2Value !== undefined && typeof stern2Value !== "boolean") ||
    (stern3Value !== undefined && typeof stern3Value !== "boolean")
  ) throw new Error("Invalid leaderboard entry.");

  return {
    rank,
    studentId: studentIdValue.trim(),
    name: nameValue,
    className: typeof classNameValue === "string" ? classNameValue : null,
    score: scoreValue,
    stern1: stern1Value === true,
    stern2: stern2Value === true,
    stern3: stern3Value === true
  };
}

function validateLegacyEntry(value: unknown): LeaderboardEntry {
  if (!value || typeof value !== "object") throw new Error("Invalid leaderboard entry.");
  const entry = value as Record<string, unknown>;
  const rankValue = entry.rank;
  const studentIdValue = entry.studentId;
  const nameValue = entry.name;
  const scoreValue = entry.score;
  const classNameValue = entry.className;

  if (
    typeof rankValue !== "number" ||
    !Number.isInteger(rankValue) ||
    rankValue < 1 ||
    typeof studentIdValue !== "string" ||
    !studentIdValue.trim() ||
    typeof nameValue !== "string" ||
    typeof scoreValue !== "number" ||
    !Number.isInteger(scoreValue) ||
    scoreValue < 0
  ) throw new Error("Invalid leaderboard entry.");

  return {
    rank: rankValue,
    studentId: studentIdValue.trim(),
    name: nameValue,
    className: typeof classNameValue === "string" ? classNameValue : null,
    score: scoreValue,
    stern1: false,
    stern2: false,
    stern3: false
  };
}
