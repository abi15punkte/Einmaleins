import { beforeEach, describe, expect, it } from "vitest";
import {
  evaluateResult,
  loadPendingSyncRecords,
  loadPersonalHighscore,
  loadStudentIdentity,
  queuePendingSyncRecord,
  resetHighscoreStorageForTests,
  saveStudentIdentity,
  type StudentIdentity
} from "../src/game/highscore";

const student: StudentIdentity = {
  studentId: "student-1",
  name: "Max",
  className: "4a",
  source: "manual"
};

describe("highscore storage", () => {
  beforeEach(() => {
    resetHighscoreStorageForTests();
    saveStudentIdentity(student);
  });

  it("keeps the highest personal score", () => {
    const first = evaluateResult(student, 250, "2026-01-01T10:00:00.000Z");
    const second = evaluateResult(student, 180, "2026-01-01T10:05:00.000Z");

    expect(first.isNewPersonalBest).toBe(true);
    expect(second.isNewPersonalBest).toBe(false);
    expect(loadPersonalHighscore(student.studentId)?.score).toBe(250);
  });

  it("initializes all three star flags to false", () => {
    const result = evaluateResult(student, 250, "2026-01-01T10:00:00.000Z");

    expect(result.personalBest.stern1).toBe(false);
    expect(result.personalBest.stern2).toBe(false);
    expect(result.personalBest.stern3).toBe(false);
  });

  it("does not queue a new personal best without explicit school-list opt-in", () => {
    evaluateResult(student, 400, "2026-01-01T10:00:00.000Z");

    expect(loadPendingSyncRecords()).toHaveLength(0);
  });

  it("keeps the highest queued score per student", () => {
    queuePendingSyncRecord({
      studentId: student.studentId,
      name: student.name,
      className: student.className,
      score: 400,
      achievedAt: "2026-01-01T10:00:00.000Z",
      stern1: false,
      stern2: false,
      stern3: false
    }, "2026-01-01T10:00:00.000Z");
    queuePendingSyncRecord({
      studentId: student.studentId,
      name: student.name,
      className: student.className,
      score: 300,
      achievedAt: "2026-01-01T10:05:00.000Z",
      stern1: false,
      stern2: false,
      stern3: false
    }, "2026-01-01T10:05:00.000Z");

    expect(loadPendingSyncRecords()).toHaveLength(1);
    expect(loadPendingSyncRecords()[0]?.record.score).toBe(400);
  });

  it("creates a stable local identity once", () => {
    const first = loadStudentIdentity();
    const second = loadStudentIdentity();

    expect(second.studentId).toBe(first.studentId);
    expect(second.name).toBe(first.name);
    expect(second.source).toBe("manual");
  });

  it("normalizes and persists profile changes", () => {
    saveStudentIdentity({
      studentId: student.studentId,
      name: "  Anna  ",
      className: "  4b  ",
      source: "manual"
    });

    const identity = loadStudentIdentity();
    expect(identity.name).toBe("Anna");
    expect(identity.className).toBe("4b");
  });
});
