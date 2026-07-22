import type { CustomPreset, ShootingSnapshot } from '../types';
import type { Lang } from '../i18n/translations';
import { clearShootingHistory, loadShootingHistory, saveShootingSnapshot } from './shootingHistory';
import {
  clearAllPreferenceData,
  exportPreferenceData,
  importPreferenceData,
  type PreferenceBackupData,
} from './preferenceLearning';

export const BACKUP_FORMAT_VERSION = 1;

export interface LocalBackupV1 {
  formatVersion: 1;
  app: 'foto-selecter';
  exportedAt: number;
  lang: Lang;
  customPresets: CustomPreset[];
  shootingHistory: ShootingSnapshot[];
  preferenceData: PreferenceBackupData;
}

const LANG_STORAGE_KEY = 'foto-selecter-lang';
const PRESETS_STORAGE_KEY = 'foto-selecter-presets';

/**
 * Everything genuinely worth preserving across a browser reset/device
 * change. Deliberately excludes:
 * - raw photo files / previews / thumbnails — never retained past a
 *   session in the first place (the standing privacy principle), so
 *   there's nothing to back up there beyond filenames already folded
 *   into shootingHistory's aggregates
 * - the analysis cache (analysisCache.ts) — a pure performance
 *   optimization, fully regenerable from source photos, would bloat the
 *   backup for no benefit
 * - the in-progress session autosave — transient by design, not
 *   meaningful to restore onto a different device/session
 */
export async function exportLocalBackup(): Promise<LocalBackupV1> {
  const lang = (localStorage.getItem(LANG_STORAGE_KEY) as Lang | null) ?? 'de';
  let customPresets: CustomPreset[] = [];
  try {
    customPresets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) ?? '[]');
  } catch {
    customPresets = [];
  }
  const shootingHistory = await loadShootingHistory();
  const preferenceData = await exportPreferenceData();

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    app: 'foto-selecter',
    exportedAt: Date.now(),
    lang,
    customPresets,
    shootingHistory,
    preferenceData,
  };
}

export function downloadBackup(backup: LocalBackupV1): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date(backup.exportedAt).toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foto-selecter-backup-v${backup.formatVersion}-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface BackupValidation {
  valid: boolean;
  errors: string[];
  summary?: {
    exportedAt: number;
    presetCount: number;
    shootingCount: number;
    preferenceEventCount: number;
  };
}

/** Validates a parsed backup file's shape before touching any storage — rejects anything that isn't a recognizable, intact backup. */
export function validateBackup(data: unknown): BackupValidation {
  const errors: string[] = [];
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Keine gültige JSON-Datei.'] };
  }
  const backup = data as Partial<LocalBackupV1>;

  if (backup.app !== 'foto-selecter') errors.push('Datei stammt nicht aus dieser App.');
  if (typeof backup.formatVersion !== 'number') errors.push('Fehlende Format-Version.');
  else if (backup.formatVersion > BACKUP_FORMAT_VERSION) {
    errors.push(`Backup-Version ${backup.formatVersion} ist neuer als die unterstützte Version ${BACKUP_FORMAT_VERSION}.`);
  }
  if (!Array.isArray(backup.customPresets)) errors.push('Fehlende oder ungültige Presets.');
  if (!Array.isArray(backup.shootingHistory)) errors.push('Fehlender oder ungültiger Shooting-Verlauf.');
  if (!backup.preferenceData || !Array.isArray(backup.preferenceData.profiles) || !Array.isArray(backup.preferenceData.events)) {
    errors.push('Fehlende oder ungültige Learn-My-Style-Daten.');
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: [],
    summary: {
      exportedAt: backup.exportedAt ?? 0,
      presetCount: backup.customPresets!.length,
      shootingCount: backup.shootingHistory!.length,
      preferenceEventCount: backup.preferenceData!.events.length,
    },
  };
}

export type ImportMode = 'merge' | 'replace';

/**
 * Applies a validated backup. "merge" adds to what's already stored
 * locally (presets/history deduped by id, preference centroids summed
 * together); "replace" wipes the relevant local stores first. Either way
 * this never touches photos currently loaded in the app — it only
 * affects the persisted stores (presets, shooting history, preference
 * profiles).
 */
export async function importLocalBackup(backup: LocalBackupV1, mode: ImportMode): Promise<void> {
  if (mode === 'replace') {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(backup.customPresets));
  } else {
    let existing: CustomPreset[] = [];
    try {
      existing = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) ?? '[]');
    } catch {
      existing = [];
    }
    const byId = new Map(existing.map((p) => [p.id, p]));
    for (const preset of backup.customPresets) byId.set(preset.id, preset);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify([...byId.values()]));
  }
  localStorage.setItem(LANG_STORAGE_KEY, backup.lang);

  if (mode === 'replace') {
    await clearShootingHistory();
  }
  for (const snapshot of backup.shootingHistory) {
    await saveShootingSnapshot(snapshot);
  }

  if (mode === 'replace') {
    await clearAllPreferenceData();
  }
  await importPreferenceData(backup.preferenceData);
}
