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
  achievedAt: "2026-09-10T10:00:00.000Z",
  stern1: true,
  stern2: false,
  stern3: true
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

  it("does not submit the same record again after a successful sync", async () => {
    queuePendingSyncRecord(record, record.achievedAt);
    const client: LeaderboardClient = {
      submit: vi.fn().mockResolvedValue(undefined),
      top: vi.fn().mockResolvedValue([])
    };

    await syncPendingHighscores(client);
    const secondResult = await syncPendingHighscores(client);

    expect(secondResult).toEqual({ attempted: 0, synced: 0, failed: 0 });
    expect(client.submit).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight synchronization across concurrent callers", async () => {
    queuePendingSyncRecord(record, record.achievedAt);
    let releaseSubmit: (() => void) | undefined;
    const client: LeaderboardClient = {
      submit: vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          releaseSubmit = resolve;
        })
      ),
      top: vi.fn().mockResolvedValue([])
    };

    const firstSync = syncPendingHighscores(client);
    const secondSync = syncPendingHighscores(client);

    expect(secondSync).toBe(firstSync);
    expect(client.submit).toHaveBeenCalledTimes(1);

    const release = releaseSubmit;
    if (release === undefined) {
      throw new Error("Expected the submit promise to be pending.");
    }
    release();

    await expect(firstSync).resolves.toEqual({ attempted: 1, synced: 1, failed: 0 });
    await expect(secondSync).resolves.toEqual({ attempted: 1, synced: 1, failed: 0 });
    expect(loadPendingSyncRecords()).toHaveLength(0);
  });

  it("keeps the higher queued score when a lower score arrives later", () => {
    queuePendingSyncRecord(record, record.achievedAt);
    queuePendingSyncRecord(
      { ...record, score: 300, achievedAt: "2026-09-10T10:05:00.000Z" },
      "2026-09-10T10:05:00.000Z"
    );

    const pending = loadPendingSyncRecords();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.record.score).toBe(500);
    expect(pending[0]?.record.achievedAt).toBe(record.achievedAt);
  });

  it("keeps a newer higher score when an older queued score is synchronized", async () => {
    const lowerRecord = { ...record, score: 300, achievedAt: "2026-09-10T09:00:00.000Z" };
    const higherRecord = { ...record, score: 600, achievedAt: "2026-09-10T10:00:00.000Z" };
    queuePendingSyncRecord(lowerRecord, lowerRecord.achievedAt);

    let releaseSubmit: (() => void) | undefined;
    const client: LeaderboardClient = {
      submit: vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          releaseSubmit = resolve;
        })
      ),
      top: vi.fn().mockResolvedValue([])
    };

    const syncPromise = syncPendingHighscores(client);
    queuePendingSyncRecord(higherRecord, higherRecord.achievedAt);

    const release = releaseSubmit;
    if (release === undefined) {
      throw new Error("Expected the submit promise to be pending.");
    }
    release();
    await syncPromise;

    expect(loadPendingSyncRecords()).toHaveLength(1);
    expect(loadPendingSyncRecords()[0]?.record.score).toBe(600);
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
