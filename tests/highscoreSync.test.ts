import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  evaluateResult,
  loadPendingSyncRecords,
  queuePendingSyncRecord,
  resetHighscoreStorageForTests,
  saveStudentIdentity,
  type StudentIdentity
} from "../src/game/highscore";
import { queueHighscoreForSync, syncPendingHighscores } from "../src/game/highscoreSync";
import type { LeaderboardClient } from "../src/game/leaderboard";

const student: StudentIdentity = {
  studentId: "student-1",
  name: "Max",
  className: "4a",
  source: "manual"
};

const record = {
  studentId: student.studentId,
  name: student.name,
  className: student.className,
  score: 500,
  achievedAt: "2026-09-10T10:00:00.000Z"
};

describe("highscore sync", () => {
  beforeEach(() => {
    resetHighscoreStorageForTests();
    saveStudentIdentity(student);
  });

  it("does not queue a new personal best automatically", () => {
    evaluateResult(student, 500, record.achievedAt);
    expect(loadPendingSyncRecords()).toHaveLength(0);
  });

  it("queues a school submission only after explicit opt-in", () => {
    queueHighscoreForSync(record);
    expect(loadPendingSyncRecords()).toHaveLength(1);
    expect(loadPendingSyncRecords()[0]?.record.score).toBe(500);
  });

  it("removes a successfully synchronized record", async () => {
    queuePendingSyncRecord(record, record.achievedAt);
    const client: LeaderboardClient = {
      submit: vi.fn().mockResolvedValue(undefined),
      top: vi.fn().mockResolvedValue([])
    };

    const result = await syncPendingHighscores(client);

    expect(result).toEqual({ attempted: 1, synced: 1, failed: 0 });
    expect(loadPendingSyncRecords()).toHaveLength(0);
    expect(client.submit).toHaveBeenCalledWith(record);
  });

  it("keeps a failed synchronization queued for retry", async () => {
    queuePendingSyncRecord(record, record.achievedAt);
    const client: LeaderboardClient = {
      submit: vi.fn().mockRejectedValue(new Error("offline")),
      top: vi.fn().mockResolvedValue([])
    };

    const result = await syncPendingHighscores(client);

    expect(result).toEqual({ attempted: 1, synced: 0, failed: 1 });
    expect(loadPendingSyncRecords()).toHaveLength(1);
  });
});
