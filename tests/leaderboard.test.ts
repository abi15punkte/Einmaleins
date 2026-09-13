import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  doc,
  setDoc,
  collection,
  getDocs,
  orderBy,
  query,
  fromDate
} = vi.hoisted(() => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  fromDate: vi.fn((date: Date) => date)
}));

vi.mock("firebase/firestore", () => ({
  doc,
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
    collection.mockReturnValue("highscores-ref");
    orderBy.mockReturnValue("order-by-ref");
    query.mockReturnValue("query-ref");
    setDoc.mockResolvedValue(undefined);
  });

  it("writes a Firestore highscore to the student's document ID without storing a portrait", async () => {
    const client = createLeaderboardClient();

    await client.submit(record);

    expect(doc).toHaveBeenCalledWith({}, "highscores", "student-1");
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
        timestamp: new Date(record.achievedAt)
      }
    );
  });

  it("propagates Firestore permission-denied write failures", async () => {
    setDoc.mockRejectedValue({ code: "permission-denied" });

    const client = createLeaderboardClient();

    await expect(client.submit(record)).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("propagates other Firestore write failures", async () => {
    setDoc.mockRejectedValue(new Error("network-error"));

    const client = createLeaderboardClient();

    await expect(client.submit(record)).rejects.toThrow("network-error");
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
            stern3: false
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
            stern3: false
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top();

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
        completedGames: 50
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
        completedGames: 10
      }
    ]);
  });

  it("treats missing completed games and star fields as fallback values", async () => {
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

    await expect(client.top()).resolves.toEqual([
      {
        rank: 1,
        studentId: "student-3",
        name: "Lea",
        className: "M3",
        score: 400,
        stern1: false,
        stern2: false,
        stern3: false,
        completedGames: 0
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

    await expect(client.top()).rejects.toThrow("Invalid leaderboard entry.");
  });
});
