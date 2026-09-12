import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  fromDate
} = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  fromDate: vi.fn((date: Date) => date)
}));

vi.mock("firebase/firestore", () => ({
  addDoc,
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
  className: "4a",
  score: 500,
  achievedAt: "2026-09-10T10:00:00.000Z",
  stern1: true,
  stern2: false,
  stern3: true
};

describe("school leaderboard client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.mockReturnValue("highscores-ref");
    orderBy.mockReturnValue("order-by-ref");
    query.mockReturnValue("query-ref");
    addDoc.mockResolvedValue({ id: "new-entry" });
  });

  it("creates a Firestore highscore entry with the expected fields", async () => {
    const client = createLeaderboardClient();

    await client.submit(record);

    expect(collection).toHaveBeenCalledWith({}, "highscores");
    expect(fromDate).toHaveBeenCalledWith(new Date(record.achievedAt));
    expect(addDoc).toHaveBeenCalledWith(
      "highscores-ref",
      {
        name: "Max",
        klasse: "4a",
        punkte: 500,
        stern1: true,
        stern2: false,
        stern3: true,
        timestamp: new Date(record.achievedAt)
      }
    );
  });

  it("loads the complete school list ordered by points without a client-side limit", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            name: "Sophie",
            klasse: "4a",
            punkte: 700,
            stern1: true,
            stern2: true,
            stern3: false
          })
        },
        {
          data: () => ({
            name: "Max",
            klasse: "4b",
            punkte: 500,
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
        name: "Sophie",
        className: "4a",
        score: 700,
        stern1: true,
        stern2: true,
        stern3: false
      },
      {
        rank: 2,
        name: "Max",
        className: "4b",
        score: 500,
        stern1: true,
        stern2: false,
        stern3: false
      }
    ]);
  });

  it("treats missing star fields as false", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            name: "Lea",
            klasse: "4c",
            punkte: 400
          })
        }
      ]
    });

    const client = createLeaderboardClient();

    await expect(client.top()).resolves.toEqual([
      {
        rank: 1,
        name: "Lea",
        className: "4c",
        score: 400,
        stern1: false,
        stern2: false,
        stern3: false
      }
    ]);
  });

  it("rejects malformed Firestore data", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
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

  it("propagates Firestore write failures", async () => {
    addDoc.mockRejectedValue(new Error("permission-denied"));

    const client = createLeaderboardClient();

    await expect(client.submit(record)).rejects.toThrow("permission-denied");
  });
});
