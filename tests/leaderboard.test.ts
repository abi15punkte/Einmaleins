import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  getDocsFromServer: getDocs,
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

    expect(doc).toHaveBeenCalledWith({}, "highscores", "student-1__private");
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
        öffentlich: false,
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

  it("publishes the current highscore only when explicitly requested", async () => {
    const client = createLeaderboardClient();

    await client.submit(record, true);

    expect(doc).toHaveBeenCalledWith({}, "highscores", "student-1__public");
    expect(setDoc).toHaveBeenCalledWith(
      "student-doc-ref",
      expect.objectContaining({ öffentlich: true })
    );
  });

  it("keeps private and public submissions in separate Firestore documents", async () => {
    const client = createLeaderboardClient();
    const newerRecord = { ...record, score: 504, achievedAt: "2026-09-10T10:04:00.000Z" };

    await client.submit(newerRecord);
    await client.submit(newerRecord, true);

    expect(doc.mock.calls.map((call) => call[2])).toEqual([
      "student-1__private",
      "student-1__public"
    ]);
    expect(setDoc).toHaveBeenCalledTimes(2);
    expect(setDoc.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ öffentlich: false, punkte: 504 }));
    expect(setDoc.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ öffentlich: true, punkte: 504 }));
  });

  it("allows an explicit public resubmission of the same highscore", async () => {
    const client = createLeaderboardClient();

    await client.submit(record, true);
    await client.submit(record, true);

    expect(doc).toHaveBeenNthCalledWith(1, {}, "highscores", "student-1__public");
    expect(doc).toHaveBeenNthCalledWith(2, {}, "highscores", "student-1__public");
    expect(setDoc).toHaveBeenCalledTimes(2);
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
            RahmenG: true,
            öffentlich: true
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
            RahmenG: false,
            öffentlich: true
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top(false);

    expect(query).toHaveBeenCalledWith("highscores-ref", "order-by-ref");
    expect(orderBy).toHaveBeenCalledWith("punkte", "desc");
    expect(getDocsFromServer).toHaveBeenCalledWith("query-ref");
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
        rahmenG: true,
        öffentlich: true
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
        rahmenG: false,
        öffentlich: true
      }
    ]);
  });

  it("carries a newly added class from another duplicate student document when the selected record has no class", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: null,
            punkte: 700,
            öffentlich: true,
            timestamp: new Date("2026-09-12T12:00:00.000Z")
          })
        },
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: "M7",
            punkte: 650,
            öffentlich: true,
            timestamp: new Date("2026-09-11T12:00:00.000Z")
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top(false);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(expect.objectContaining({
      studentId: "student-1",
      score: 700,
      className: "M7"
    }));
  });

  it("carries a class from a private counterpart into the public row without exposing the private score", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: null,
            punkte: 700,
            öffentlich: true,
            timestamp: new Date("2026-09-12T12:00:00.000Z")
          })
        },
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: "M7",
            punkte: 900,
            öffentlich: false,
            timestamp: new Date("2026-09-13T12:00:00.000Z")
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top(false, true);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(expect.objectContaining({
      studentId: "student-1",
      score: 700,
      className: "M7",
      öffentlich: true
    }));
  });

  it("does not show a student who only has private entries in the public leaderboard", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "private-only",
            name: "Max",
            klasse: "M7",
            punkte: 900,
            öffentlich: false,
            timestamp: new Date("2026-09-13T12:00:00.000Z")
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top(false, true);

    expect(entries).toEqual([]);
  });

  it("keeps an existing class on the newest record and does not overwrite it with an older duplicate", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: "M8",
            punkte: 700,
            öffentlich: true,
            timestamp: new Date("2026-09-12T12:00:00.000Z")
          })
        },
        {
          data: () => ({
            studentId: "student-1",
            name: "Max",
            klasse: "M7",
            punkte: 650,
            öffentlich: true,
            timestamp: new Date("2026-09-11T12:00:00.000Z")
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const entries = await client.top(false);

    expect(entries[0]).toEqual(expect.objectContaining({
      studentId: "student-1",
      score: 700,
      className: "M8"
    }));
  });

  it("uses the newest timestamp per student in the teacher view while keeping the newest public entry in the public view", async () => {
    const privateData = {
      studentId: "student-1",
      name: "Max",
      klasse: "M1",
      punkte: 550,
      completedGames: 12,
      stern1: true,
      stern2: false,
      stern3: false,
      RahmenB: false,
      RahmenS: true,
      RahmenG: false,
      öffentlich: false,
      timestamp: new Date("2026-09-10T12:00:00.000Z")
    };
    const publicData = {
      ...privateData,
      punkte: 600,
      öffentlich: true,
      timestamp: new Date("2026-09-10T11:00:00.000Z")
    };
    const otherStudent = {
      studentId: "student-2",
      name: "Sophie",
      klasse: "M2",
      punkte: 700,
      completedGames: 30,
      öffentlich: true,
      timestamp: new Date("2026-09-10T10:00:00.000Z")
    };

    getDocs.mockResolvedValue({
      docs: [
        { data: () => privateData },
        { data: () => publicData },
        { data: () => otherStudent }
      ]
    });

    const client = createLeaderboardClient();
    const teacherEntries = await client.top(false, false);

    expect(teacherEntries).toHaveLength(2);
    expect(teacherEntries.find((entry) => entry.studentId === "student-1")).toEqual(
      expect.objectContaining({ score: 550, öffentlich: false })
    );

    getDocs.mockResolvedValue({
      docs: [
        { data: () => privateData },
        { data: () => publicData },
        { data: () => otherStudent }
      ]
    });

    const publicEntries = await client.top(false);
    expect(publicEntries.find((entry) => entry.studentId === "student-1")).toEqual(
      expect.objectContaining({ score: 600, öffentlich: true })
    );
  });

  it("hides unpublished entries from the public list but keeps them in the complete list", async () => {
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            studentId: "student-public",
            name: "Sophie",
            klasse: "M2",
            punkte: 700,
            RahmenB: true,
            RahmenS: false,
            RahmenG: true,
            öffentlich: true
          })
        },
        {
          data: () => ({
            studentId: "student-private",
            name: "Max",
            klasse: "M1",
            punkte: 650,
            RahmenB: false,
            RahmenS: true,
            RahmenG: false,
            öffentlich: false
          })
        }
      ]
    });

    const client = createLeaderboardClient();
    const publicEntries = await client.top(false);
    expect(publicEntries.map((entry) => entry.studentId)).toEqual(["student-public"]);

    const allEntries = await client.top(false, false);
    expect(allEntries.map((entry) => entry.studentId)).toEqual(["student-public", "student-private"]);
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
        rahmenG: false,
        öffentlich: true
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
