import type { HighscoreRecord } from "./highscore";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  className: string | null;
  score: number;
}

export interface LeaderboardClient {
  submit(record: HighscoreRecord): Promise<void>;
  top(): Promise<LeaderboardEntry[]>;
}

export interface LeaderboardConfig {
  endpoint: string | null;
}

export function loadLeaderboardConfig(): LeaderboardConfig {
  const endpoint =
    typeof import.meta !== "undefined" &&
    typeof import.meta.env?.VITE_LEADERBOARD_URL === "string"
      ? import.meta.env.VITE_LEADERBOARD_URL.trim()
      : "";

  return {
    endpoint: endpoint || null
  };
}

export function createLeaderboardClient(
  config: LeaderboardConfig = loadLeaderboardConfig(),
  fetcher: typeof fetch = fetch
): LeaderboardClient | null {
  const endpoint = config.endpoint?.trim().replace(/\/$/, "") ?? "";

  if (!endpoint) {
    return null;
  }

  return {
    async submit(record) {
      const response = await fetcher(`${endpoint}/scores`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          studentId: record.studentId,
          name: record.name,
          className: record.className,
          score: record.score,
          achievedAt: record.achievedAt
        })
      });

      if (!response.ok) {
        throw new Error(`Leaderboard submit failed: ${response.status}`);
      }
    },

    async top() {
      const response = await fetcher(`${endpoint}/scores`, {
        method: "GET",
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Leaderboard fetch failed: ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error("Leaderboard response must be an array.");
      }

      return payload.map(validateLeaderboardEntry);
    }
  };
}

function validateLeaderboardEntry(value: unknown): LeaderboardEntry {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid leaderboard entry.");
  }

  const entry = value as Record<string, unknown>;
  const rankValue = entry.rank;
  const nameValue = entry.name;
  const scoreValue = entry.score;
  const classNameValue = entry.className;

  if (
    typeof rankValue !== "number" ||
    !Number.isInteger(rankValue) ||
    rankValue < 1 ||
    typeof nameValue !== "string" ||
    typeof scoreValue !== "number" ||
    !Number.isInteger(scoreValue) ||
    scoreValue < 0
  ) {
    throw new Error("Invalid leaderboard entry.");
  }

  return {
    rank: rankValue,
    name: nameValue,
    className: typeof classNameValue === "string" ? classNameValue : null,
    score: scoreValue
  };
}
