import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  orderBy,
  query,
  fromDate
} = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  fromDate: vi.fn((date: Date) => date)
}));

vi.mock("firebase/firestore", () => ({
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp: { fromDate }
}));

vi.mock("../src/firebase", () => ({ db: {} }));

import { createLeaderboardClient } from "../src/game/leaderboard";

const record = {
  studentId: "student-1",
  name: "Max",
  className: "M8",
  score: 500,
  achievedAt: "2026-09-10T10:00:00.000Z",
  stern1: true,
  stern2: false,
  stern3: true
};

describe("school leaderboard client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doc.mockReturnValue("student-doc-ref");
    getDoc.mockResolvedValue({
      exists: () => false,
      data: () => undefined
    });
    collection.mockReturnValue("highscores-ref");
    orderBy.mockReturnValue("order-by-ref");
    query.mockReturnValue("query-ref");
    setDoc.mockResolvedValue(undefined);
    getDocs.mockReset();
  });

  it("writes a Firestore highscore to the student's document ID without storing a portrait", async () => {
    const client = createLeaderboardClient();

    await client.submit(record);

    expect(doc).toHaveBeenCalledWith({}, "highscores", "student-1");
    expect(getDoc).toHaveBeenCalledWith("student-doc-ref");
    expect(fromDate).toHaveBeenCalledWith(new Date(record.achievedAt));
    expect(setDoc).toHaveBeenCalledWith(
      "student-doc-ref",
      {
        studentId: "student-1",
        name: "Max",
        klasse: "M8",
        punkte: 500,
        completedGames: 0,
        stern1: true,
        stern2: false,
        stern3: true,
        RahmenB: false,
        RahmenS: false,
        RahmenG: false,
        timestamp: new Date(record.achievedAt)
      }
    );
  });

  it("preserves remote frame unlocks when synchronizing the highscore", async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        studentId: "student-1",
        RahmenB: true,
        RahmenS: false,
        RahmenG: true
      })
    });

    const client = createLeaderboardClient();
    const syncRecord = { ...record, score: 501 };
    await client.submit(syncRecord);

    expect(setDoc).toHaveBeenCalledWith(
      "student-doc-ref",
      expect.objectContaining({
        RahmenB: true,
        RahmenS: false,
        RahmenG: true
      })
    );
  });

  it("treats Firestore permission-denied write failures as an unpublished highscore", async () => {
    setDoc.mockRejectedValue({ code: "permission-denied" });

    const client = createLeaderboardClient();
    const failingRecord = { ...record, score: 502 };

    await expect(client.submit(failingRecord)).resolves.toBeUndefined();
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it("propagates other Firestore write failures", async () => {
    setDoc.mockRejectedValue(new Error("network-error"));

    const client = createLeaderboardClient();
    const failingRecord = { ...record, score: 503 };

    await expect(client.submit(failingRecord)).rejects.toThrow("network-error");
  });

  it("loads the complete school list ordered by points without a client-side limit", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-2",
            name: "Sophie",
            klasse: "M2",
            punkte: 700,
            completedGames: 50,
            stern1: true,
            stern2: true,
            stern3: false,
            RahmenB: true,
            RahmenS: false,
            RahmenG: true
          })
        },
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: "M1",
            punkte: 500,
            completedGames: 10,
            stern1: true,
            stern2: false,
            stern3: false,
            RahmenB: false,
            RahmenS: true,
            RahmenG: false
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top(false);

    expect(query).toHaveBeenCalledWith("highscores-ref", "order-by-ref");
    expect(orderBy).toHaveBeenCalledWith("punkte", "desc");
    expect(getDocs).toHaveBeenCalledWith("query-ref");
    expect(entries).toEqual([
      {
        rank: 1,
        studentId: "student-2",
        name: "Sophie",
        className: "M2",
        score: 700,
        stern1: true,
        stern2: true,
        stern3: false,
        completedGames: 50,
        rahmenB: true,
        rahmenS: false,
        rahmenG: true
      },
      {
        rank: 2,
        studentId: "student-1",
        name: "Max",
        className: "M1",
        score: 500,
        stern1: true,
        stern2: false,
        stern3: false,
        completedGames: 10,
        rahmenB: false,
        rahmenS: true,
        rahmenG: false
      }
    ]);
  });

  it("treats missing completed games, star fields, and frame fields as fallback values", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-3",
            name: "Lea",
            klasse: "M3",
            punkte: 400
          })
        }
      ]
    });

    const client = createLeaderboardClient();

    await expect(client.top(false)).resolves.toEqual([
      {
        rank: 1,
        studentId: "student-3",
        name: "Lea",
        className: "M3",
        score: 400,
        stern1: false,
        stern2: false,
        stern3: false,
        completedGames: 0,
        rahmenB: false,
        rahmenS: false,
        rahmenG: false
      }
    ]);
  });

  it("rejects malformed Firestore data", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: "4a",
            punkte: -1
          })
        }
      ]
    });

    const client = createLeaderboardClient();

    await expect(client.top(false)).rejects.toThrow("Invalid leaderboard entry.");
  });
});
