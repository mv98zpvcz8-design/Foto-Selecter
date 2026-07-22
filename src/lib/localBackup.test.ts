import { beforeEach, describe, expect, it } from 'vitest';
import { validateBackup, importLocalBackup, exportLocalBackup, BACKUP_FORMAT_VERSION, type LocalBackupV1 } from './localBackup';
import { clearShootingHistory, loadShootingHistory } from './shootingHistory';
import { clearAllPreferenceData } from './preferenceLearning';

function emptyBackup(overrides: Partial<LocalBackupV1> = {}): LocalBackupV1 {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    app: 'foto-selecter',
    exportedAt: Date.now(),
    lang: 'de',
    customPresets: [],
    shootingHistory: [],
    preferenceData: { profiles: [], events: [] },
    ...overrides,
  };
}

describe('validateBackup', () => {
  it('rejects non-object input', () => {
    expect(validateBackup(null).valid).toBe(false);
    expect(validateBackup('a string').valid).toBe(false);
  });

  it('rejects a file from a different app', () => {
    const result = validateBackup(emptyBackup({ app: 'some-other-app' as 'foto-selecter' }));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a backup with a newer format version than this build supports', () => {
    const result = validateBackup(emptyBackup({ formatVersion: (BACKUP_FORMAT_VERSION + 1) as 1 }));
    expect(result.valid).toBe(false);
  });

  it('rejects a backup missing required arrays', () => {
    const result = validateBackup({ app: 'foto-selecter', formatVersion: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('accepts a well-formed empty backup and reports zeroed counts', () => {
    const result = validateBackup(emptyBackup());
    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      exportedAt: expect.any(Number),
      presetCount: 0,
      shootingCount: 0,
      preferenceEventCount: 0,
    });
  });
});

describe('exportLocalBackup / importLocalBackup round-trip', () => {
  beforeEach(async () => {
    await clearShootingHistory();
    await clearAllPreferenceData();
  });

  it('round-trips an empty local state without throwing', async () => {
    const backup = await exportLocalBackup();
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    await importLocalBackup(backup, 'merge');
    const history = await loadShootingHistory();
    expect(history).toEqual([]);
  });

  it('merge mode does not duplicate an already-imported shoot on re-import (id-based upsert)', async () => {
    const snapshot = {
      id: 'snap-1',
      completedAt: Date.now(),
      purpose: 'kunde' as const,
      photoCount: 10,
      selectedCount: 3,
      selectionRate: 0.3,
      avgSharpnessScore: 70,
      avgExposureScore: 65,
      portraitShare: 0.4,
      emotionShare: 0.2,
    };
    const backup = emptyBackup({ shootingHistory: [snapshot as unknown as LocalBackupV1['shootingHistory'][number]] });

    await importLocalBackup(backup, 'merge');
    await importLocalBackup(backup, 'merge');

    const history = await loadShootingHistory();
    expect(history).toHaveLength(1);
  });

  it('replace mode wipes existing shooting history before importing', async () => {
    const first = emptyBackup({
      shootingHistory: [
        {
          id: 'a',
          completedAt: Date.now(),
          purpose: 'kunde',
          photoCount: 5,
          selectedCount: 1,
          selectionRate: 0.2,
          avgSharpnessScore: 50,
          avgExposureScore: 50,
          portraitShare: 0,
          emotionShare: 0,
        } as unknown as LocalBackupV1['shootingHistory'][number],
      ],
    });
    await importLocalBackup(first, 'merge');
    expect(await loadShootingHistory()).toHaveLength(1);

    const second = emptyBackup({ shootingHistory: [] });
    await importLocalBackup(second, 'replace');
    expect(await loadShootingHistory()).toHaveLength(0);
  });
});
