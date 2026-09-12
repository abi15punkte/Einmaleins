import { describe, expect, it, vi } from "vitest";

import {
  createLeaderboardClient,
  type LeaderboardConfig
} from "../src/game/leaderboard";

const record = {
  studentId: "student-1",
  name: "Max",
  className: "4a",
  score: 500,
  achievedAt: "2026-09-10T10:00:00.000Z"
};

function config(endpoint: string | null): LeaderboardConfig {
  return { endpoint };
}

describe("school leaderboard client", () => {
  it("is disabled without a configured endpoint", () => {
    expect(createLeaderboardClient(config(null))).toBeNull();
    expect(createLeaderboardClient(config("   "))).toBeNull();
  });

  it("submits only the required leaderboard fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 201 })
    );
    const client = createLeaderboardClient(
      config("https://example.test/api/"),
      fetcher
    );

    await client?.submit(record);

    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/api/scores",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(record)
      })
    );
  });

  it("loads the complete school list without a client-side limit", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([{ rank: 1, name: "Max", className: "4a", score: 500 }]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const client = createLeaderboardClient(config("https://example.test"), fetcher);

    await client?.top();

    expect(fetcher).toHaveBeenCalledWith(
      "https://example.test/scores",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("rejects malformed leaderboard responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ rank: 0, name: "Max", score: -1 }]), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = createLeaderboardClient(config("https://example.test"), fetcher);

    await expect(client?.top()).rejects.toThrow("Invalid leaderboard entry.");
  });

  it("propagates failed submissions so the caller can keep the local result", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 503 })
    );
    const client = createLeaderboardClient(config("https://example.test"), fetcher);

    await expect(client?.submit(record)).rejects.toThrow(
      "Leaderboard submit failed: 503"
    );
  });
});
