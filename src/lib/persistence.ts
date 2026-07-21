import type { ProfileRef, SelectionMode } from '../types';

const DB_NAME = 'foto-selecter-autosave';
const DB_VERSION = 1;
const STORE_NAME = 'session';
const SESSION_KEY = 'current';

export interface SessionSnapshot {
  files: File[];
  targetCount: number;
  profileRef: ProfileRef;
  selectionMode: SelectionMode;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Snapshots the current upload + config to IndexedDB so an accidental
 * reload or tab crash doesn't lose the file selection. Computed analysis
 * (previews, scores) is deliberately not persisted — object URLs die on
 * reload anyway, and re-running the analysis on restored files is cheap
 * compared to re-picking dozens/hundreds of files from the OS dialog.
 * Failures are swallowed: auto-save is a convenience, never a blocker.
 */
export async function saveSession(snapshot: SessionSnapshot): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(snapshot, SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Auto-save failed:', err);
  }
}

export async function loadSession(): Promise<SessionSnapshot | null> {
  try {
    const db = await openDb();
    const result = await new Promise<SessionSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SESSION_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (err) {
    console.warn('Loading auto-save failed:', err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Clearing auto-save failed:', err);
  }
}
