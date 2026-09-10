interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN?: string;
}

interface ScorePayload {
  studentId?: unknown;
  name?: unknown;
  className?: unknown;
  score?: unknown;
  achievedAt?: unknown;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN ?? "*";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400"
        }
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/scores") {
      return json({ error: "Not found." }, 404, origin);
    }

    if (request.method === "POST") {
      return submitScore(request, env, origin);
    }

    if (request.method === "GET") {
      return listScores(url, env, origin);
    }

    return json({ error: "Method not allowed." }, 405, origin, {
      allow: "GET,POST,OPTIONS"
    });
  }
};

async function submitScore(request: Request, env: Env, origin: string): Promise<Response> {
  let payload: ScorePayload;
  try {
    payload = (await request.json()) as ScorePayload;
  } catch {
    return json({ error: "Invalid JSON." }, 400, origin);
  }

  if (
    typeof payload.studentId !== "string" ||
    !payload.studentId.trim() ||
    typeof payload.name !== "string" ||
    !payload.name.trim() ||
    (payload.className !== null && payload.className !== undefined && typeof payload.className !== "string") ||
    typeof payload.score !== "number" ||
    !Number.isInteger(payload.score) ||
    payload.score < 0 ||
    typeof payload.achievedAt !== "string" ||
    !payload.achievedAt.trim()
  ) {
    return json({ error: "Invalid score payload." }, 400, origin);
  }

  const studentId = payload.studentId.trim();
  const name = payload.name.trim();
  const className = typeof payload.className === "string" ? payload.className.trim() || null : null;
  const score = payload.score;
  const achievedAt = payload.achievedAt.trim();

  await env.DB.prepare(
    `INSERT INTO scores (student_id, name, class_name, score, achieved_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(student_id) DO UPDATE SET
       name = excluded.name,
       class_name = excluded.class_name,
       score = excluded.score,
       achieved_at = excluded.achieved_at
     WHERE excluded.score > scores.score`
  )
    .bind(studentId, name, className, score, achievedAt)
    .run();

  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      ...jsonHeaders
    }
  });
}

async function listScores(url: URL, env: Env, origin: string): Promise<Response> {
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 10;

  const result = await env.DB.prepare(
    `SELECT student_id AS studentId,
            name,
            class_name AS className,
            score,
            achieved_at AS achievedAt
     FROM scores
     ORDER BY score DESC, achieved_at ASC, student_id ASC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  const entries = result.results.map((row, index) => ({
    rank: index + 1,
    name: String(row.name),
    className: row.className === null ? null : String(row.className),
    score: Number(row.score)
  }));

  return json(entries, 200, origin);
}

function json(payload: unknown, status: number, origin: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...jsonHeaders,
      "access-control-allow-origin": origin,
      ...extraHeaders
    }
  });
}
