import type { EmotionKey, PhotoResult } from '../types';

const DB_NAME = 'foto-selecter-analysis-cache';
const DB_VERSION = 1;
const STORE_NAME = 'photoAnalysis';
// Generous but bounded — this is a resume aid for an interrupted session,
// not a permanent archive, so entries are capped and expire on their own.
const MAX_ENTRIES = 3000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

export interface CachedPhotoAnalysis {
  key: string;
  savedAt: number;
  captureTime: Date | null;
  camera?: string;
  lens?: string;
  focalLengthMm?: number;
  iso?: number;
  shutterSpeedSec?: number;
  aperture?: number;
  sharpnessRaw?: number;
  subjectSharpnessRaw?: number;
  selectiveFocusDetected?: boolean;
  shadowClipping?: number;
  highlightClipping?: number;
  meanLuminance?: number;
  colorStats?: PhotoResult['colorStats'];
  motionBlurRatio?: number;
  hash?: bigint;
  facesDetected?: number;
  facesWithClosedEyes?: number;
  facesLookingAtCamera?: number;
  emotionScores?: Partial<Record<EmotionKey, number>>;
  subjectCenter?: { x: number; y: number };
  subjectYExtent?: { top: number; bottom: number };
}

/** Same file-identity convention used for upload dedup — good enough to recognize "this is the same photo" across a reload. */
export function analysisCacheKey(file: File): string {
  return `${file.name}-${file.size}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      store.createIndex('savedAt', 'savedAt');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persists the expensive, purely per-photo measurements (pixel analysis,
 * face/emotion detection, EXIF) as soon as a photo finishes analyzing —
 * not the batch-relative scores (those depend on percentile normalization
 * across the whole shoot and are cheap to recompute). If the browser tab
 * closes or crashes mid-shoot, reopening and re-running the analysis
 * skips straight past every already-analyzed photo instead of redoing
 * hours of face detection on a 1000+ photo batch.
 */
export async function saveAnalysis(photo: PhotoResult): Promise<void> {
  try {
    const entry: CachedPhotoAnalysis = {
      key: analysisCacheKey(photo.file),
      savedAt: Date.now(),
      captureTime: photo.captureTime ?? null,
      camera: photo.camera,
      lens: photo.lens,
      focalLengthMm: photo.focalLengthMm,
      iso: photo.iso,
      shutterSpeedSec: photo.shutterSpeedSec,
      aperture: photo.aperture,
      sharpnessRaw: photo.sharpnessRaw,
      subjectSharpnessRaw: photo.subjectSharpnessRaw,
      selectiveFocusDetected: photo.selectiveFocusDetected,
      shadowClipping: photo.shadowClipping,
      highlightClipping: photo.highlightClipping,
      meanLuminance: photo.meanLuminance,
      colorStats: photo.colorStats,
      motionBlurRatio: photo.motionBlurRatio,
      hash: photo.hash,
      facesDetected: photo.facesDetected,
      facesWithClosedEyes: photo.facesWithClosedEyes,
      facesLookingAtCamera: photo.facesLookingAtCamera,
      emotionScores: photo.emotionScores,
      subjectCenter: photo.subjectCenter,
      subjectYExtent: photo.subjectYExtent,
    };

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    void evictOldEntries();
  } catch (err) {
    console.warn('Caching photo analysis failed:', err);
  }
}

export async function loadAnalysis(key: string): Promise<CachedPhotoAnalysis | null> {
  try {
    const db = await openDb();
    const entry = await new Promise<CachedPhotoAnalysis | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (entry && Date.now() - entry.savedAt > MAX_AGE_MS) return null;
    return entry;
  } catch (err) {
    console.warn('Reading cached photo analysis failed:', err);
    return null;
  }
}

async function evictOldEntries(): Promise<void> {
  try {
    const db = await openDb();
    const count = await new Promise<number>((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count > MAX_ENTRIES) {
      const toRemove = count - MAX_ENTRIES;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const index = tx.objectStore(STORE_NAME).index('savedAt');
        let removed = 0;
        const cursorReq = index.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && removed < toRemove) {
            cursor.delete();
            removed++;
            cursor.continue();
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    db.close();
  } catch (err) {
    console.warn('Evicting old cached analysis failed:', err);
  }
}

/** Full, explicit deletion of every cached per-photo analysis result. */
export async function clearAnalysisCache(): Promise<void> {
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
    console.warn('Clearing cached analysis failed:', err);
  }
}

/** Applies a cached analysis result onto a fresh PhotoResult, skipping the expensive re-analysis entirely. */
export function applyCachedAnalysis(photo: PhotoResult, cached: CachedPhotoAnalysis): void {
  photo.captureTime = cached.captureTime;
  photo.camera = cached.camera;
  photo.lens = cached.lens;
  photo.focalLengthMm = cached.focalLengthMm;
  photo.iso = cached.iso;
  photo.shutterSpeedSec = cached.shutterSpeedSec;
  photo.aperture = cached.aperture;
  photo.sharpnessRaw = cached.sharpnessRaw;
  photo.subjectSharpnessRaw = cached.subjectSharpnessRaw;
  photo.selectiveFocusDetected = cached.selectiveFocusDetected;
  photo.shadowClipping = cached.shadowClipping;
  photo.highlightClipping = cached.highlightClipping;
  photo.meanLuminance = cached.meanLuminance;
  photo.colorStats = cached.colorStats;
  photo.motionBlurRatio = cached.motionBlurRatio;
  photo.hash = cached.hash;
  photo.facesDetected = cached.facesDetected;
  photo.facesWithClosedEyes = cached.facesWithClosedEyes;
  photo.facesLookingAtCamera = cached.facesLookingAtCamera;
  photo.emotionScores = cached.emotionScores;
  photo.subjectCenter = cached.subjectCenter;
  photo.subjectYExtent = cached.subjectYExtent;
}
