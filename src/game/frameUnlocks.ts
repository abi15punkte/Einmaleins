export type FrameId = "B" | "S" | "G";

export interface FrameUnlocks {
  rahmenB: boolean;
  rahmenS: boolean;
  rahmenG: boolean;
}

interface StoredFrameUnlocks extends FrameUnlocks {
  studentId: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const FRAME_UNLOCKS_KEY = "einmaleins.student.frame-unlocks.v1";
const memoryStorage = new Map<string, string>();
let latestFrameUnlockDebug: { errorRate: number | null; unlocks: FrameUnlocks } | null = null;

const memoryStorageAdapter: StorageLike = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => { memoryStorage.set(key, value); }
};

function getStorage(): StorageLike {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return memoryStorageAdapter;
}

function loadStoredFrameUnlocks(): StoredFrameUnlocks[] {
  try {
    const raw = getStorage().getItem(FRAME_UNLOCKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is StoredFrameUnlocks => {
      if (!entry || typeof entry !== "object") return false;
      const value = entry as Record<string, unknown>;
      return typeof value.studentId === "string"
        && typeof value.rahmenB === "boolean"
        && typeof value.rahmenS === "boolean"
        && typeof value.rahmenG === "boolean";
    });
  } catch {
    return [];
  }
}

function saveStoredFrameUnlocks(records: StoredFrameUnlocks[]): void {
  getStorage().setItem(FRAME_UNLOCKS_KEY, JSON.stringify(records));
}

export function evaluateFrameUnlocks(errorRate: number | null, reachedLevel: number): FrameUnlocks {
  if (errorRate === null || reachedLevel < 2) {
    return { rahmenB: false, rahmenS: false, rahmenG: false };
  }

  return {
    rahmenB: errorRate < 0.10,
    rahmenS: errorRate < 0.05,
    rahmenG: errorRate === 0
  };
}

export function loadFrameUnlocks(studentId: string): FrameUnlocks {
  const record = loadStoredFrameUnlocks().find((entry) => entry.studentId === studentId);
  return {
    rahmenB: record?.rahmenB === true,
    rahmenS: record?.rahmenS === true,
    rahmenG: record?.rahmenG === true
  };
}

export function mergeFrameUnlocks(studentId: string, remoteUnlocks: Partial<FrameUnlocks>): FrameUnlocks {
  const records = loadStoredFrameUnlocks();
  const existing = records.find((entry) => entry.studentId === studentId);
  const merged: StoredFrameUnlocks = {
    studentId,
    rahmenB: existing?.rahmenB === true || remoteUnlocks.rahmenB === true,
    rahmenS: existing?.rahmenS === true || remoteUnlocks.rahmenS === true,
    rahmenG: existing?.rahmenG === true || remoteUnlocks.rahmenG === true
  };

  if (existing) {
    Object.assign(existing, merged);
  } else {
    records.push(merged);
  }

  saveStoredFrameUnlocks(records);
  return {
    rahmenB: merged.rahmenB,
    rahmenS: merged.rahmenS,
    rahmenG: merged.rahmenG
  };
}

export function recordFrameUnlocks(
  studentId: string,
  errorRate: number | null,
  reachedLevel: number
): FrameUnlocks {
  const records = loadStoredFrameUnlocks();
  const existing = records.find((entry) => entry.studentId === studentId);
  const earned = evaluateFrameUnlocks(errorRate, reachedLevel);
  const merged: StoredFrameUnlocks = {
    studentId,
    rahmenB: existing?.rahmenB === true || earned.rahmenB,
    rahmenS: existing?.rahmenS === true || earned.rahmenS,
    rahmenG: existing?.rahmenG === true || earned.rahmenG
  };

  if (existing) {
    Object.assign(existing, merged);
  } else {
    records.push(merged);
  }

  saveStoredFrameUnlocks(records);
  const unlocks = {
    rahmenB: merged.rahmenB,
    rahmenS: merged.rahmenS,
    rahmenG: merged.rahmenG
  };
  latestFrameUnlockDebug = { errorRate, unlocks };
  return unlocks;
}

export function highestUnlockedFrame(unlocks: FrameUnlocks): FrameId | null {
  if (unlocks.rahmenG) return "G";
  if (unlocks.rahmenS) return "S";
  if (unlocks.rahmenB) return "B";
  return null;
}

function installFrameUnlockDebugOutput(): void {
  if (typeof document === "undefined") return;

  const render = (): void => {
    if (!latestFrameUnlockDebug) return;
    const resultCard = document.querySelector<HTMLElement>(".result-screen .result-card");
    if (!resultCard || resultCard.querySelector(".frame-unlock-debug")) return;

    const { errorRate, unlocks } = latestFrameUnlockDebug;
    const debug = document.createElement("div");
    debug.className = "frame-unlock-debug";
    debug.style.cssText = "margin-bottom:16px;padding:10px 12px;border:1px dashed #777;border-radius:10px;font:600 14px/1.45 monospace;text-align:left;background:#fff;";
    debug.textContent = `TEST – Fehlerquotient: ${errorRate === null ? "n/a" : `${(errorRate * 100).toFixed(2)}%`} | RahmenB: ${String(unlocks.rahmenB)} | RahmenS: ${String(unlocks.rahmenS)} | RahmenG: ${String(unlocks.rahmenG)}`;
    resultCard.prepend(debug);
  };

  const observer = new MutationObserver(render);
  observer.observe(document.body, { childList: true, subtree: true });
  render();
}

installFrameUnlockDebugOutput();

export type LeaderboardEntry = import("./leaderboard").LeaderboardEntry;
