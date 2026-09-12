export type IdentitySource = "jamf" | "manual" | "local";

export interface StudentIdentity {
  studentId: string;
  name: string;
  className: string | null;
  source: IdentitySource;
}

export interface HighscoreRecord {
  studentId: string;
  name: string;
  className: string | null;
  score: number;
  achievedAt: string;
  stern1: boolean;
  stern2: boolean;
  stern3: boolean;
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

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PROFILE_KEY = "einmaleins.student.profile.v1";
const HIGHSCORE_KEY = "einmaleins.student.highscore.v1";
const SYNC_QUEUE_KEY = "einmaleins.highscore.sync-queue.v1";

const memoryStorage = new Map<string, string>();

const memoryStorageAdapter: StorageLike = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, value),
  removeItem: (key) => memoryStorage.delete(key)
};

function getStorage(): StorageLike {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return memoryStorageAdapter;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = getStorage().getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  getStorage().setItem(key, JSON.stringify(value));
}

function createStudentId(): string {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadStudentIdentity(): StudentIdentity {
  const stored = readJson<StudentIdentity>(PROFILE_KEY);

  if (stored?.studentId && stored.name) {
    return {
      ...stored,
      source: stored.source ?? "local"
    };
  }

  const identity: StudentIdentity = {
    studentId: createStudentId(),
    name: "Schüler",
    className: null,
    source: "local"
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

  return {
    ...record,
    stern1: record.stern1 === true,
    stern2: record.stern2 === true,
    stern3: record.stern3 === true
  };
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
        achievedAt,
        stern1: previousBest?.stern1 ?? false,
        stern2: previousBest?.stern2 ?? false,
        stern3: previousBest?.stern3 ?? false
      }
    : previousBest;

  if (isNewPersonalBest) {
    writeJson(HIGHSCORE_KEY, personalBest);
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

export function queuePendingSyncRecord(record: HighscoreRecord, queuedAt = new Date().toISOString()): void {
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

export function removePendingSyncRecord(studentId: string, score: number): void {
  const queue = loadPendingSyncRecords();
  const remaining = queue.filter(
    (entry) => !(entry.record.studentId === studentId && entry.record.score === score)
  );

  if (remaining.length === 0) {
    clearPendingSyncRecords();
    return;
  }

  writeJson(SYNC_QUEUE_KEY, remaining);
}

export function clearPendingSyncRecords(): void {
  getStorage().removeItem(SYNC_QUEUE_KEY);
}

export function resetHighscoreStorageForTests(): void {
  memoryStorage.clear();
}
