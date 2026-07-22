import type {
  PhotoResult,
  PreferenceEventRecord,
  PreferenceFeatures,
  PreferenceProfileKey,
  PreferenceProfileState,
  PreferenceSignal,
  PreferenceStatus,
  Purpose,
} from '../types';
import { PREFERENCE_PROFILE_KEYS } from '../types';

/** Maps the app's selection profiles onto the smaller set of Learn-My-Style profiles — purposes without a dedicated preference profile (video/presse/favoriten/sonstiges) feed the general one instead of being silently dropped. */
export function toPreferenceProfileKey(purpose: Purpose): PreferenceProfileKey {
  switch (purpose) {
    case 'kunde':
    case 'instagram':
    case 'portfolio':
    case 'sport':
    case 'event':
      return purpose;
    default:
      return 'general';
  }
}

const DB_NAME = 'foto-selecter-preferences';
const DB_VERSION = 1;
const PROFILES_STORE = 'profiles';
const EVENTS_STORE = 'events';
const MAX_EVENTS = 5000;

const STATUS_THRESHOLDS: Record<PreferenceStatus, number> = {
  insufficient: 0,
  early: 10,
  usable: 30,
  wellPersonalized: 100,
};

function tagConfidence(photo: PhotoResult, key: string): number {
  return photo.semanticTags?.find((t) => t.key === key)?.confidence ?? 0;
}

/**
 * Extracts a fixed, named feature vector from signals the pipeline
 * already computed — no embeddings, no extra model. Values are
 * normalized to roughly 0-1 so a plain weighted dot-product between a
 * photo's vector and a liked/disliked centroid is a meaningful
 * similarity measure.
 */
export function extractFeatures(photo: PhotoResult): PreferenceFeatures {
  return {
    sharpness: (photo.sharpnessScore ?? 50) / 100,
    exposure: (photo.exposureScore ?? 50) / 100,
    faces: (photo.faceScore ?? 100) / 100,
    portrait: photo.orientation === 'portrait' ? 1 : 0,
    landscape: photo.orientation === 'landscape' ? 1 : 0,
    square: photo.orientation === 'square' ? 1 : 0,
    bw: tagConfidence(photo, 'bw'),
    color: tagConfidence(photo, 'color'),
    emotion: tagConfidence(photo, 'emotion'),
    crowd: tagConfidence(photo, 'crowdLikely'),
    portraitLikely: tagConfidence(photo, 'portraitLikely'),
    groupPhoto: tagConfidence(photo, 'groupPhotoLikely'),
    warm: tagConfidence(photo, 'warmColor'),
    cool: tagConfidence(photo, 'coolColor'),
    highContrast: tagConfidence(photo, 'highContrast'),
  };
}

function zeroFeatures(): PreferenceFeatures {
  return {
    sharpness: 0,
    exposure: 0,
    faces: 0,
    portrait: 0,
    landscape: 0,
    square: 0,
    bw: 0,
    color: 0,
    emotion: 0,
    crowd: 0,
    portraitLikely: 0,
    groupPhoto: 0,
    warm: 0,
    cool: 0,
    highContrast: 0,
  };
}

function addInto(sum: PreferenceFeatures, features: PreferenceFeatures): PreferenceFeatures {
  const result = { ...sum };
  for (const key of Object.keys(features) as (keyof PreferenceFeatures)[]) {
    result[key] += features[key];
  }
  return result;
}

function dot(a: PreferenceFeatures, b: PreferenceFeatures): number {
  let sum = 0;
  for (const key of Object.keys(a) as (keyof PreferenceFeatures)[]) sum += a[key] * b[key];
  return sum;
}

function magnitude(v: PreferenceFeatures): number {
  return Math.sqrt(dot(v, v));
}

function cosineSimilarity(a: PreferenceFeatures, b: PreferenceFeatures): number {
  const denom = magnitude(a) * magnitude(b);
  return denom === 0 ? 0 : dot(a, b) / denom;
}

function centroid(sum: PreferenceFeatures, count: number): PreferenceFeatures {
  if (count === 0) return zeroFeatures();
  const result = { ...sum };
  for (const key of Object.keys(result) as (keyof PreferenceFeatures)[]) result[key] /= count;
  return result;
}

function emptyProfileState(profileKey: PreferenceProfileKey): PreferenceProfileState {
  return {
    profileKey,
    likedSum: zeroFeatures(),
    likedCount: 0,
    dislikedSum: zeroFeatures(),
    dislikedCount: 0,
    updatedAt: Date.now(),
  };
}

const LIKE_SIGNALS: PreferenceSignal[] = ['selected', 'favorite', 'seriesWinner', 'carouselUsed'];
const DISLIKE_SIGNALS: PreferenceSignal[] = ['rejected', 'unfavorite'];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore(PROFILES_STORE, { keyPath: 'profileKey' });
      const events = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
      events.createIndex('recordedAt', 'recordedAt');
      events.createIndex('profileKey', 'profileKey');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getProfileState(db: IDBDatabase, profileKey: PreferenceProfileKey): Promise<PreferenceProfileState> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROFILES_STORE, 'readonly');
    const req = tx.objectStore(PROFILES_STORE).get(profileKey);
    req.onsuccess = () => resolve(req.result ?? emptyProfileState(profileKey));
    req.onerror = () => reject(req.error);
  });
}

async function putProfileState(db: IDBDatabase, state: PreferenceProfileState): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROFILES_STORE, 'readwrite');
    tx.objectStore(PROFILES_STORE).put(state);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Same file-identity convention used elsewhere (analysisCache, upload dedup). */
export function preferencePhotoKey(photo: PhotoResult): string {
  return `${photo.file.name}-${photo.file.size}`;
}

const excludedKeysCache = new Set<string>();
let excludedKeysLoaded = false;

async function loadExcludedKeys(db: IDBDatabase): Promise<Set<string>> {
  if (excludedKeysLoaded) return excludedKeysCache;
  const all = await getAllEvents(db);
  for (const e of all) if (e.excluded) excludedKeysCache.add(e.photoKey);
  excludedKeysLoaded = true;
  return excludedKeysCache;
}

function getAllEvents(db: IDBDatabase): Promise<PreferenceEventRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(EVENTS_STORE, 'readonly');
    const req = tx.objectStore(EVENTS_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Records one preference decision as a training signal: adds the photo's
 * feature vector into the liked or disliked running centroid for the
 * given profile, and appends an entry to the (capped) event log so
 * individual decisions stay deletable/excludable later. Silently no-ops
 * for a photo the user has explicitly excluded from learning.
 */
export async function recordSignal(
  profileKey: PreferenceProfileKey,
  photo: PhotoResult,
  signal: PreferenceSignal,
): Promise<void> {
  try {
    const db = await openDb();
    const photoKey = preferencePhotoKey(photo);
    const excluded = await loadExcludedKeys(db);
    if (excluded.has(photoKey)) {
      db.close();
      return;
    }

    const features = extractFeatures(photo);
    const state = await getProfileState(db, profileKey);

    if (LIKE_SIGNALS.includes(signal)) {
      state.likedSum = addInto(state.likedSum, features);
      state.likedCount += 1;
    } else if (DISLIKE_SIGNALS.includes(signal)) {
      state.dislikedSum = addInto(state.dislikedSum, features);
      state.dislikedCount += 1;
    }
    state.updatedAt = Date.now();
    await putProfileState(db, state);

    const event: PreferenceEventRecord = {
      id: crypto.randomUUID(),
      profileKey,
      signal,
      photoKey,
      recordedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readwrite');
      tx.objectStore(EVENTS_STORE).put(event);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    void evictOldEvents();
  } catch (err) {
    console.warn('Recording preference signal failed:', err);
  }
}

async function evictOldEvents(): Promise<void> {
  try {
    const db = await openDb();
    const count = await new Promise<number>((resolve, reject) => {
      const req = db.transaction(EVENTS_STORE, 'readonly').objectStore(EVENTS_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count > MAX_EVENTS) {
      const toRemove = count - MAX_EVENTS;
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(EVENTS_STORE, 'readwrite');
        const index = tx.objectStore(EVENTS_STORE).index('recordedAt');
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
    console.warn('Evicting old preference events failed:', err);
  }
}

export interface PreferenceScoreResult {
  score: number; // 0-100
  status: PreferenceStatus;
  decisionCount: number;
}

/**
 * "Dominik Preference Score": how similar a photo's feature vector is to
 * this profile's liked centroid vs. its disliked centroid, expressed as
 * 0-100. Returns null status info alongside so the UI never presents a
 * thin, unreliable profile as if it were confident — see
 * getPersonalizationStatus.
 */
export async function computePreferenceScore(
  profileKey: PreferenceProfileKey,
  photo: PhotoResult,
): Promise<PreferenceScoreResult> {
  const db = await openDb();
  const state = await getProfileState(db, profileKey);
  db.close();

  const decisionCount = state.likedCount + state.dislikedCount;
  const status = getPersonalizationStatus(decisionCount);

  if (state.likedCount === 0) {
    return { score: 50, status, decisionCount };
  }

  const features = extractFeatures(photo);
  const likedCentroid = centroid(state.likedSum, state.likedCount);
  const likedSim = cosineSimilarity(features, likedCentroid);

  if (state.dislikedCount === 0) {
    // only positive signal so far — just report similarity to what's been liked
    return { score: Math.round(clamp01((likedSim + 1) / 2) * 100), status, decisionCount };
  }

  const dislikedCentroid = centroid(state.dislikedSum, state.dislikedCount);
  const dislikedSim = cosineSimilarity(features, dislikedCentroid);
  // map the liked-vs-disliked margin from roughly [-2, 2] onto 0-100
  const margin = likedSim - dislikedSim;
  const score = Math.round(clamp01((margin + 2) / 4) * 100);
  return { score, status, decisionCount };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function getPersonalizationStatus(decisionCount: number): PreferenceStatus {
  if (decisionCount >= STATUS_THRESHOLDS.wellPersonalized) return 'wellPersonalized';
  if (decisionCount >= STATUS_THRESHOLDS.usable) return 'usable';
  if (decisionCount >= STATUS_THRESHOLDS.early) return 'early';
  return 'insufficient';
}

export interface PreferenceSummary {
  profileKey: PreferenceProfileKey;
  decisionCount: number;
  status: PreferenceStatus;
  topLikedFeatures: { key: keyof PreferenceFeatures; weight: number }[];
}

/** Human-facing summary for the Learn My Style screen: decision count, status, and which features dominate the liked centroid. */
export async function getPreferenceSummary(profileKey: PreferenceProfileKey): Promise<PreferenceSummary> {
  const db = await openDb();
  const state = await getProfileState(db, profileKey);
  db.close();

  const decisionCount = state.likedCount + state.dislikedCount;
  const likedCentroid = centroid(state.likedSum, state.likedCount);
  const topLikedFeatures = (Object.keys(likedCentroid) as (keyof PreferenceFeatures)[])
    .map((key) => ({ key, weight: likedCentroid[key] }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  return {
    profileKey,
    decisionCount,
    status: getPersonalizationStatus(decisionCount),
    topLikedFeatures,
  };
}

export async function getAllPreferenceSummaries(): Promise<PreferenceSummary[]> {
  return Promise.all(PREFERENCE_PROFILE_KEYS.map((key) => getPreferenceSummary(key)));
}

export async function resetProfile(profileKey: PreferenceProfileKey): Promise<void> {
  try {
    const db = await openDb();
    await putProfileState(db, emptyProfileState(profileKey));
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    const index = tx.objectStore(EVENTS_STORE).index('profileKey');
    const cursorReq = index.openCursor(IDBKeyRange.only(profileKey));
    await new Promise<void>((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    db.close();
  } catch (err) {
    console.warn('Resetting preference profile failed:', err);
  }
}

export async function listEvents(profileKey?: PreferenceProfileKey): Promise<PreferenceEventRecord[]> {
  try {
    const db = await openDb();
    const all = await getAllEvents(db);
    db.close();
    const filtered = profileKey ? all.filter((e) => e.profileKey === profileKey) : all;
    return filtered.sort((a, b) => b.recordedAt - a.recordedAt);
  } catch (err) {
    console.warn('Listing preference events failed:', err);
    return [];
  }
}

/**
 * Deletes one recorded decision and subtracts its contribution back out
 * of the profile's centroid — deleting an event doesn't just hide it, it
 * actually un-learns it.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  try {
    const db = await openDb();
    const event = await new Promise<PreferenceEventRecord | undefined>((resolve, reject) => {
      const req = db.transaction(EVENTS_STORE, 'readonly').objectStore(EVENTS_STORE).get(eventId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (event) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(EVENTS_STORE, 'readwrite');
        tx.objectStore(EVENTS_STORE).delete(eventId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    db.close();
  } catch (err) {
    console.warn('Deleting preference event failed:', err);
  }
}

/** Marks a photo as excluded from all future learning; does not retroactively remove past contributions (delete the specific events for that instead). */
export async function excludePhotoFromLearning(photoKey: string): Promise<void> {
  excludedKeysCache.add(photoKey);
  try {
    const db = await openDb();
    const event: PreferenceEventRecord = {
      id: crypto.randomUUID(),
      profileKey: 'general',
      signal: 'selected',
      photoKey,
      recordedAt: Date.now(),
      excluded: true,
    };
    const tx = db.transaction(EVENTS_STORE, 'readwrite');
    tx.objectStore(EVENTS_STORE).put(event);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Excluding photo from learning failed:', err);
  }
}

export interface PreferenceBackupData {
  profiles: PreferenceProfileState[];
  events: PreferenceEventRecord[];
}

export async function exportPreferenceData(): Promise<PreferenceBackupData> {
  const db = await openDb();
  const profiles = await Promise.all(PREFERENCE_PROFILE_KEYS.map((key) => getProfileState(db, key)));
  const events = await getAllEvents(db);
  db.close();
  return { profiles, events };
}

export async function importPreferenceData(data: PreferenceBackupData): Promise<void> {
  const db = await openDb();
  for (const profile of data.profiles) await putProfileState(db, profile);
  const tx = db.transaction(EVENTS_STORE, 'readwrite');
  for (const event of data.events) tx.objectStore(EVENTS_STORE).put(event);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  excludedKeysLoaded = false;
  excludedKeysCache.clear();
}

export async function clearAllPreferenceData(): Promise<void> {
  try {
    const db = await openDb();
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PROFILES_STORE, 'readwrite');
        tx.objectStore(PROFILES_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(EVENTS_STORE, 'readwrite');
        tx.objectStore(EVENTS_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
    ]);
    db.close();
    excludedKeysLoaded = false;
    excludedKeysCache.clear();
  } catch (err) {
    console.warn('Clearing preference data failed:', err);
  }
}
