export type IdentitySource = "jamf" | "manual" | "local";

export interface StudentIdentity {
  studentId: string;
  name: string;
  className: string | null;
  source: IdentitySource;
}

export interface EarnedStars {
  stern1?: boolean;
  stern2?: boolean;
  stern3?: boolean;
}

export interface HighscoreRecord extends EarnedStars {
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

export interface CompletedGamesRecord {
  studentId: string;
  completedGames: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PROFILE_KEY = "einmaleins.student.profile.v1";
const HIGHSCORE_KEY = "einmaleins.student.highscore.v1";
const COMPLETED_GAMES_KEY = "einmaleins.student.completed-games.v1";
const SYNC_QUEUE_KEY = "einmaleins.highscore.sync-queue.v1";

const PERSONAL_BACKGROUND_THRESHOLDS = [
  { games: 10000, asset: "10000.png" },
  { games: 200, asset: "200.png" },
  { games: 100, asset: "100.png" },
  { games: 50, asset: "50.png" },
  { games: 10, asset: "10.png" }
] as const;

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

export function getPersonalBackgroundAsset(completedGames: number): string | null {
  const threshold = PERSONAL_BACKGROUND_THRESHOLDS.find((entry) => completedGames >= entry.games);
  return threshold?.asset ?? null;
}

export function loadCompletedGames(studentId = loadStudentIdentity().studentId): number {
  const record = readJson<CompletedGamesRecord>(COMPLETED_GAMES_KEY);

  if (!record || record.studentId !== studentId) {
    return 0;
  }

  const completedGames = Number.isFinite(record.completedGames)
    ? Math.max(0, Math.floor(record.completedGames))
    : 0;

  if (completedGames !== record.completedGames) {
    writeJson(COMPLETED_GAMES_KEY, { studentId, completedGames });
  }

  return completedGames;
}

export function recordCompletedGame(studentId: string, score: number): number {
  const previousCompletedGames = loadCompletedGames(studentId);
  const completedGames = score >= 10000
    ? Math.max(previousCompletedGames + 1, 10000)
    : previousCompletedGames + 1;

  writeJson<CompletedGamesRecord>(COMPLETED_GAMES_KEY, {
    studentId,
    completedGames
  });

  return completedGames;
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

  const sanitizedRecord: HighscoreRecord = {
    ...record,
    stern1: record.stern1 === true,
    stern2: false,
    stern3: record.stern3 === true
  };

  if (record.stern2 === true) {
    writeJson(HIGHSCORE_KEY, sanitizedRecord);
  }

  return sanitizedRecord;
}

export function evaluateResult(
  student: StudentIdentity,
  score: number,
  achievedAtOrStars: string | EarnedStars = new Date().toISOString(),
  additionalStars: EarnedStars = {}
): HighscoreEvaluation {
  if (!Number.isInteger(score) || score < 0) {
    throw new Error("Score must be a non-negative integer.");
  }

  const achievedAt = typeof achievedAtOrStars === "string"
    ? achievedAtOrStars
    : new Date().toISOString();
  const earnedStars: EarnedStars = typeof achievedAtOrStars === "string"
    ? additionalStars
    : achievedAtOrStars;

  const previousBest = loadPersonalHighscore(student.studentId);
  const isNewPersonalBest = previousBest === null || score > previousBest.score;

  const mergedStars: EarnedStars = {
    stern1: previousBest?.stern1 === true || earnedStars.stern1 === true,
    stern2: false,
    stern3: previousBest?.stern3 === true || earnedStars.stern3 === true
  };

  const starsChanged = previousBest === null
    || mergedStars.stern1 !== (previousBest.stern1 === true)
    || mergedStars.stern2 !== false
    || mergedStars.stern3 !== (previousBest.stern3 === true);

  const personalBest: HighscoreRecord = isNewPersonalBest
    ? {
        studentId: student.studentId,
        name: student.name.trim(),
        className: student.className?.trim() || null,
        score,
        achievedAt,
        ...mergedStars
      }
    : starsChanged
      ? {
          ...previousBest!,
          ...mergedStars
        }
      : previousBest!;

  if (isNewPersonalBest || starsChanged) {
    writeJson(HIGHSCORE_KEY, personalBest);
  }

  recordCompletedGame(student.studentId, score);

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
    if (existing.record.score > record.score) {
      existing.record = {
        ...existing.record,
        stern1: existing.record.stern1 === true || record.stern1 === true,
        stern2: false,
        stern3: existing.record.stern3 === true || record.stern3 === true
      };
      existing.queuedAt = queuedAt;
    } else {
      existing.record = {
        ...record,
        stern1: existing.record.stern1 === true || record.stern1 === true,
        stern2: false,
        stern3: existing.record.stern3 === true || record.stern3 === true
      };
      existing.queuedAt = queuedAt;
    }
  } else {
    queue.push({ record: { ...record, stern2: false }, queuedAt });
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
