import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingSyncRecords,
  evaluateResult,
  loadPendingSyncRecords,
  loadPersonalHighscore,
  loadStudentIdentity,
  saveStudentIdentity,
  type StudentIdentity
} from "../src/game/highscore";

const student: StudentIdentity = {
  studentId: "student-1",
  name: "Max",
  className: "4a"
};

describe("highscore storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    saveStudentIdentity(student);
    clearPendingSyncRecords();
  });

  it("keeps the highest personal score", () => {
    const first = evaluateResult(student, 250, "2026-01-01T10:00:00.000Z");
    const second = evaluateResult(student, 180, "2026-01-01T10:05:00.000Z");

    expect(first.isNewPersonalBest).toBe(true);
    expect(second.isNewPersonalBest).toBe(false);
    expect(loadPersonalHighscore(student.studentId)?.score).toBe(250);
  });

  it("stores a new personal best in the pending sync queue", () => {
    evaluateResult(student, 400, "2026-01-01T10:00:00.000Z");

    expect(loadPendingSyncRecords()).toHaveLength(1);
    expect(loadPendingSyncRecords()[0]?.record.score).toBe(400);
  });

  it("does not queue a lower score after a better result", () => {
    evaluateResult(student, 400, "2026-01-01T10:00:00.000Z");
    evaluateResult(student, 300, "2026-01-01T10:05:00.000Z");

    expect(loadPendingSyncRecords()).toHaveLength(1);
    expect(loadPendingSyncRecords()[0]?.record.score).toBe(400);
  });

  it("creates a stable local identity once", () => {
    const first = loadStudentIdentity();
    const second = loadStudentIdentity();

    expect(second.studentId).toBe(first.studentId);
    expect(second.name).toBe(first.name);
  });
});
