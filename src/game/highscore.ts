export interface StudentIdentity {
  studentId: string;
  name: string;
  className: string | null;
}

export interface HighscoreRecord {
  studentId: string;
  name: string;
  className: string | null;
  score: number;
  achievedAt: string;
}

export interface PendingSyncRecord {
  record: HighscoreRecord;
  queuedAt: string;
}

export interface HighscoreEvaluation {
  previousBest: HighscoreRecord | null;
  isNewPersonalBest: boolean;
  personalBest: HighscoreRecord;
}

const PROFILE_KEY = "einmaleins.student.profile.v1";
const HIGHSCORE_KEY = "einmaleins.student.highscore.v1";
const SYNC_QUEUE_KEY = "einmaleins.highscore.sync-queue.v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createStudentId(): string {
  const cryptoApi = window.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadStudentIdentity(): StudentIdentity {
  const stored = readJson<StudentIdentity>(PROFILE_KEY);

  if (stored?.studentId && stored.name) {
    return stored;
  }

  const identity: StudentIdentity = {
    studentId: createStudentId(),
    name: "Schüler",
    className: null
  };

  writeJson(PROFILE_KEY, identity);
  return identity;
}

export function saveStudentIdentity(identity: StudentIdentity): void {
  if (!identity.studentId || !identity.name.trim()) {
    throw new Error("A student id and name are required.");
  }

  writeJson(PROFILE_KEY, {
    ...identity,
    name: identity.name.trim(),
    className: identity.className?.trim() || null
  });
}

export function loadPersonalHighscore(studentId = loadStudentIdentity().studentId): HighscoreRecord | null {
  const record = readJson<HighscoreRecord>(HIGHSCORE_KEY);

  if (!record || record.studentId !== studentId) {
    return null;
  }

  return record;
}

export function evaluateResult(
  student: StudentIdentity,
  score: number,
  achievedAt = new Date().toISOString()
): HighscoreEvaluation {
  if (!Number.isInteger(score) || score < 0) {
    throw new Error("Score must be a non-negative integer.");
  }

  const previousBest = loadPersonalHighscore(student.studentId);
  const isNewPersonalBest = previousBest === null || score > previousBest.score;

  const personalBest = isNewPersonalBest
    ? {
        studentId: student.studentId,
        name: student.name.trim(),
        className: student.className?.trim() || null,
        score,
        achievedAt
      }
    : previousBest;

  if (isNewPersonalBest) {
    writeJson(HIGHSCORE_KEY, personalBest);
    enqueueForSync(personalBest, achievedAt);
  }

  return {
    previousBest,
    isNewPersonalBest,
    personalBest
  };
}

export function loadPendingSyncRecords(): PendingSyncRecord[] {
  return readJson<PendingSyncRecord[]>(SYNC_QUEUE_KEY) ?? [];
}

export function clearPendingSyncRecords(): void {
  window.localStorage.removeItem(SYNC_QUEUE_KEY);
}

function enqueueForSync(record: HighscoreRecord, queuedAt: string): void {
  const queue = loadPendingSyncRecords();
  const existing = queue.find((entry) => entry.record.studentId === record.studentId);

  if (existing) {
    if (existing.record.score >= record.score) {
      return;
    }

    existing.record = record;
    existing.queuedAt = queuedAt;
  } else {
    queue.push({ record, queuedAt });
  }

  writeJson(SYNC_QUEUE_KEY, queue);
}
