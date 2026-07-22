import { loadShootingHistory } from './shootingHistory';
import { getAllPreferenceSummaries } from './preferenceLearning';
import { loadSession } from './persistence';

export interface StorageOverview {
  usageBytes: number | null; // null if the browser doesn't support the Storage API
  quotaBytes: number | null;
  shootingHistoryCount: number;
  hasPendingSession: boolean;
  pendingSessionPhotoCount: number;
  preferenceDecisionCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export { formatBytes };

/**
 * A lightweight, honest snapshot of what's actually stored locally — not
 * a full admin/diagnostics system (there's no error-logging
 * infrastructure to report on yet), just the numbers a solo user
 * genuinely needs before deciding to back up or clear something.
 */
export async function getStorageOverview(): Promise<StorageOverview> {
  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage ?? null;
      quotaBytes = estimate.quota ?? null;
    } catch {
      // Storage API present but estimate failed (e.g. private browsing) — leave as null, UI treats that as "unknown"
    }
  }

  const [history, preferenceSummaries, session] = await Promise.all([
    loadShootingHistory(),
    getAllPreferenceSummaries(),
    loadSession(),
  ]);

  return {
    usageBytes,
    quotaBytes,
    shootingHistoryCount: history.length,
    hasPendingSession: !!session && session.files.length > 0,
    pendingSessionPhotoCount: session?.files.length ?? 0,
    preferenceDecisionCount: preferenceSummaries.reduce((sum, s) => sum + s.decisionCount, 0),
  };
}
