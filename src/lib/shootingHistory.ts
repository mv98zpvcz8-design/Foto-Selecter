import type { PhotoResult, Purpose, ShootingSnapshot } from '../types';
import { focalLengthBucket } from './exifMeta';
import { computeShotAnalytics } from './analytics';

const DB_NAME = 'foto-selecter-history';
const DB_VERSION = 1;
const STORE_NAME = 'shootings';
const MAX_HISTORY_ENTRIES = 30;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Builds the aggregated, anonymized snapshot for one completed shoot —
 * counts, rates, and averages only, never photos, previews, file names,
 * or face crops — so cross-shoot trend comparison doesn't require storing
 * anything privacy-sensitive long-term.
 */
export function buildShootingSnapshot(photos: PhotoResult[], purpose: Purpose): ShootingSnapshot {
  const analytics = computeShotAnalytics(photos, purpose);
  const analyzed = photos.filter((p) => p.status === 'done');

  const focalLengthBuckets: Record<string, { count: number; avgSharpnessScore: number }> = {};
  for (const p of analyzed) {
    if (p.focalLengthMm == null) continue;
    const bucket = focalLengthBucket(p.focalLengthMm);
    if (!focalLengthBuckets[bucket]) focalLengthBuckets[bucket] = { count: 0, avgSharpnessScore: 0 };
    const entry = focalLengthBuckets[bucket];
    entry.avgSharpnessScore = (entry.avgSharpnessScore * entry.count + (p.sharpnessScore ?? 0)) / (entry.count + 1);
    entry.count += 1;
  }

  return {
    id: crypto.randomUUID(),
    completedAt: Date.now(),
    purpose,
    photoCount: analytics.analyzedCount,
    selectedCount: analytics.selectedCount,
    selectionRate: analytics.selectionRate,
    groupCount: analytics.groupCount,
    avgGroupSize: analytics.avgGroupSize,
    avgOverallScore: analytics.avgOverallScore,
    avgSharpnessScore: analytics.avgSharpnessScore,
    avgExposureScore: analytics.avgExposureScore,
    portraitShare: analytics.portraitShare,
    landscapeShare: analytics.landscapeShare,
    bwShare: analytics.bwShare,
    colorShare: analytics.colorShare,
    closedEyesShare: analytics.closedEyesShare,
    overexposedShare: analytics.overexposedShare,
    underexposedShare: analytics.underexposedShare,
    motionBlurShare: analytics.motionBlurShare,
    emotionShare: analytics.emotionShare,
    focalLengthBuckets,
  };
}

export async function saveShootingSnapshot(snapshot: ShootingSnapshot): Promise<void> {
  try {
    const db = await openDb();
    const all = await getAllSnapshotsFromDb(db);
    // Upsert by id — re-importing a backup, or re-saving the same shoot,
    // replaces the existing entry instead of duplicating it.
    const withoutDuplicate = all.filter((s) => s.id !== snapshot.id);
    const trimmed = [...withoutDuplicate, snapshot]
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, MAX_HISTORY_ENTRIES);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const s of trimmed) store.put(s);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Saving shooting history failed:', err);
  }
}

function getAllSnapshotsFromDb(db: IDBDatabase): Promise<ShootingSnapshot[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function loadShootingHistory(): Promise<ShootingSnapshot[]> {
  try {
    const db = await openDb();
    const all = await getAllSnapshotsFromDb(db);
    db.close();
    return all.sort((a, b) => b.completedAt - a.completedAt);
  } catch (err) {
    console.warn('Loading shooting history failed:', err);
    return [];
  }
}

/** Full, explicit deletion of all stored shooting history — the privacy "clear history" control. */
export async function clearShootingHistory(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Clearing shooting history failed:', err);
  }
}
