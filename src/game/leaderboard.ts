import { addDoc, collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";

import { db } from "../firebase";
import type { HighscoreRecord } from "./highscore";

export interface LeaderboardEntry {
  rank: number;
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

const HIGHSCORE_COLLECTION = "highscores";

export function createLeaderboardClient(): LeaderboardClient {
  return {
    async submit(record) {
      if (!Number.isInteger(record.score) || record.score < 0) {
        throw new Error("Leaderboard score must be a non-negative integer.");
      }

      const name = record.name.trim();
      if (!name) {
        throw new Error("Leaderboard name is required.");
      }

      await addDoc(collection(db, HIGHSCORE_COLLECTION), {
        name,
        klasse: record.className?.trim() || null,
        punkte: record.score,
        stern1: record.stern1 === true,
        stern2: record.stern2 === true,
        stern3: record.stern3 === true,
        timestamp: Timestamp.fromDate(new Date(record.achievedAt))
      });
    },

    async top() {
      const snapshot = await getDocs(
        query(
          collection(db, HIGHSCORE_COLLECTION),
          orderBy("punkte", "desc")
        )
      );

      return snapshot.docs.map((document, index) => {
        const data = document.data() as Record<string, unknown>;
        return validateLeaderboardEntry(data, index + 1);
      });
    }
  };
}

function validateLeaderboardEntry(
  value: Record<string, unknown>,
  rank: number
): LeaderboardEntry {
  const nameValue = value.name;
  const classNameValue = value.klasse;
  const scoreValue = value.punkte;
  const stern1Value = value.stern1;
  const stern2Value = value.stern2;
  const stern3Value = value.stern3;

  if (
    typeof nameValue !== "string" ||
    !nameValue.trim() ||
    typeof scoreValue !== "number" ||
    !Number.isInteger(scoreValue) ||
    scoreValue < 0 ||
    (classNameValue !== null && classNameValue !== undefined && typeof classNameValue !== "string") ||
    (stern1Value !== undefined && typeof stern1Value !== "boolean") ||
    (stern2Value !== undefined && typeof stern2Value !== "boolean") ||
    (stern3Value !== undefined && typeof stern3Value !== "boolean")
  ) {
    throw new Error("Invalid leaderboard entry.");
  }

  return {
    rank,
    name: nameValue,
    className: typeof classNameValue === "string" ? classNameValue : null,
    score: scoreValue,
    stern1: stern1Value === true,
    stern2: stern2Value === true,
    stern3: stern3Value === true
  };
}
