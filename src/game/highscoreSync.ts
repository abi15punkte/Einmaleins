import type { LeaderboardClient } from "./leaderboard";
import {
  loadPendingSyncRecords,
  removePendingSyncRecord,
  queuePendingSyncRecord,
  type PendingSyncRecord
} from "./highscore";

export interface SyncResult {
  attempted: number;
  synced: number;
  failed: number;
}

export async function syncPendingHighscores(
  client: LeaderboardClient
): Promise<SyncResult> {
  const pending: PendingSyncRecord[] = loadPendingSyncRecords();
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      await client.submit(entry.record);
      removePendingSyncRecord(entry.record.studentId, entry.record.score);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    attempted: pending.length,
    synced,
    failed
  };
}

export function queueHighscoreForSync(record: PendingSyncRecord["record"]): void {
  queuePendingSyncRecord(record, new Date().toISOString());
}
