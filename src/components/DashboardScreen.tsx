import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n/useT';
import { loadShootingHistory } from '../lib/shootingHistory';
import {
  getAllPreferenceSummaries,
  resetProfile,
  type PreferenceSummary,
} from '../lib/preferenceLearning';
import { getStorageOverview, formatBytes, type StorageOverview } from '../lib/diagnostics';
import { exportLocalBackup, downloadBackup, validateBackup, importLocalBackup, type LocalBackupV1, type BackupValidation } from '../lib/localBackup';
import { PREFERENCE_PROFILE_KEYS, type ShootingSnapshot } from '../types';

const TREND_MIN_SHOOTS = 2;
const RECENT_SHOOTS_SHOWN = 8;

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function DashboardScreen({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [history, setHistory] = useState<ShootingSnapshot[] | null>(null);
  const [preferenceSummaries, setPreferenceSummaries] = useState<PreferenceSummary[] | null>(null);
  const [storage, setStorage] = useState<StorageOverview | null>(null);
  const [importState, setImportState] = useState<{ backup: LocalBackupV1; validation: BackupValidation } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  function refreshAll() {
    loadShootingHistory().then(setHistory);
    getAllPreferenceSummaries().then(setPreferenceSummaries);
    getStorageOverview().then(setStorage);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const groupedByPurpose = useMemo(() => {
    if (!history) return new Map<string, ShootingSnapshot[]>();
    const map = new Map<string, ShootingSnapshot[]>();
    for (const h of history) {
      if (!map.has(h.purpose)) map.set(h.purpose, []);
      map.get(h.purpose)!.push(h);
    }
    for (const list of map.values()) list.sort((a, b) => a.completedAt - b.completedAt);
    return map;
  }, [history]);

  async function handleExport() {
    const backup = await exportLocalBackup();
    downloadBackup(backup);
    setStatusNote(t('dashboard.backupExported'));
  }

  function handleImportFile(file: File) {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const validation = validateBackup(data);
        if (!validation.valid) {
          setImportError(validation.errors.join(' '));
          return;
        }
        setImportState({ backup: data as LocalBackupV1, validation });
      } catch {
        setImportError(t('dashboard.backupInvalidJson'));
      }
    };
    reader.readAsText(file);
  }

  async function confirmImport(mode: 'merge' | 'replace') {
    if (!importState) return;
    await importLocalBackup(importState.backup, mode);
    setImportState(null);
    setStatusNote(t('dashboard.backupImported'));
    refreshAll();
  }

  async function handleResetProfile(profileKey: (typeof PREFERENCE_PROFILE_KEYS)[number]) {
    await resetProfile(profileKey);
    getAllPreferenceSummaries().then(setPreferenceSummaries);
  }

  return (
    <div className="dashboard-screen">
      <div className="results-toolbar">
        <h2 className="dashboard-title">{t('dashboard.title')}</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {t('breakdown.close')}
        </button>
      </div>

      <p className="analytics-scope-note">{t('dashboard.privacyNote')}</p>

      {storage && (
        <div className="analytics-stats-grid">
          <div className="analytics-stat">
            <strong>{storage.shootingHistoryCount}</strong>
            <div>{t('dashboard.shootingsStored')}</div>
          </div>
          <div className="analytics-stat">
            <strong>{storage.preferenceDecisionCount}</strong>
            <div>{t('dashboard.learningDecisions')}</div>
          </div>
          <div className="analytics-stat">
            <strong>{storage.usageBytes != null ? formatBytes(storage.usageBytes) : '—'}</strong>
            <div>{t('dashboard.storageUsed')}</div>
          </div>
          {storage.hasPendingSession && (
            <div className="analytics-stat">
              <strong>{storage.pendingSessionPhotoCount}</strong>
              <div>{t('dashboard.pendingSession')}</div>
            </div>
          )}
        </div>
      )}

      {storage?.hasPendingSession && (
        <p className="dashboard-pending-note">{t('dashboard.pendingSessionHint')}</p>
      )}

      <div className="section-heading">{t('dashboard.recentShoots')}</div>
      {history == null ? (
        <div className="empty-state">{t('dashboard.loading')}</div>
      ) : history.length === 0 ? (
        <div className="empty-state">{t('dashboard.noShoots')}</div>
      ) : (
        <table className="analytics-table dashboard-shoots-table">
          <thead>
            <tr>
              <th>{t('dashboard.colDate')}</th>
              <th>{t('dashboard.colProfile')}</th>
              <th>{t('dashboard.colPhotos')}</th>
              <th>{t('dashboard.colSelected')}</th>
              <th>{t('dashboard.colSharpness')}</th>
              <th>{t('dashboard.colExposure')}</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, RECENT_SHOOTS_SHOWN).map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.completedAt)}</td>
                <td>{t(`purpose.${h.purpose}`)}</td>
                <td>{h.photoCount}</td>
                <td>
                  {h.selectedCount} ({pct(h.selectionRate)})
                </td>
                <td>{h.avgSharpnessScore}</td>
                <td>{h.avgExposureScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="section-heading">{t('dashboard.trendsHeading')}</div>
      <p className="analytics-scope-note">{t('dashboard.trendsScopeNote')}</p>
      {[...groupedByPurpose.entries()].filter(([, list]) => list.length >= TREND_MIN_SHOOTS).length === 0 ? (
        <div className="empty-state">{t('dashboard.notEnoughForTrends')}</div>
      ) : (
        [...groupedByPurpose.entries()]
          .filter(([, list]) => list.length >= TREND_MIN_SHOOTS)
          .map(([purpose, list]) => (
            <table className="analytics-table dashboard-trend-table" key={purpose}>
              <caption>{t(`purpose.${purpose}`)}</caption>
              <thead>
                <tr>
                  <th>{t('dashboard.colDate')}</th>
                  <th>{t('dashboard.colExposure')}</th>
                  <th>{t('analytics.portraitShare')}</th>
                  <th>{t('dashboard.colEmotion')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((h) => (
                  <tr key={h.id}>
                    <td>{formatDate(h.completedAt)}</td>
                    <td>{h.avgExposureScore}</td>
                    <td>{pct(h.portraitShare)}</td>
                    <td>{pct(h.emotionShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))
      )}

      <div className="section-heading">{t('dashboard.learnMyStyleHeading')}</div>
      <p className="analytics-scope-note">{t('dashboard.learnMyStyleScopeNote')}</p>
      {preferenceSummaries == null ? (
        <div className="empty-state">{t('dashboard.loading')}</div>
      ) : (
        <div className="learn-my-style-grid">
          {preferenceSummaries.map((summary) => (
            <div className="learn-my-style-card" key={summary.profileKey}>
              <div className="learn-my-style-card-title">{t(`purpose.${summary.profileKey === 'general' ? 'sonstiges' : summary.profileKey}`)}</div>
              <div className={`preference-status preference-status-${summary.status}`}>
                {t(`dashboard.preferenceStatus.${summary.status}`)}
              </div>
              <div className="learn-my-style-count">
                {t('dashboard.decisionsBasedOn', { count: summary.decisionCount })}
              </div>
              {summary.topLikedFeatures.length > 0 && summary.decisionCount > 0 && (
                <ul className="learn-my-style-features">
                  {summary.topLikedFeatures
                    .filter((f) => f.weight > 0.15)
                    .slice(0, 3)
                    .map((f) => (
                      <li key={f.key}>{t(`dashboard.feature.${f.key}`)}</li>
                    ))}
                </ul>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleResetProfile(summary.profileKey)}>
                {t('dashboard.resetProfile')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="section-heading">{t('dashboard.backupHeading')}</div>
      <p className="analytics-scope-note">{t('dashboard.backupScopeNote')}</p>
      <div className="dashboard-backup-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={handleExport}>
          {t('dashboard.exportBackup')}
        </button>
        <label className="btn btn-ghost btn-sm dashboard-import-label">
          {t('dashboard.importBackup')}
          <input
            type="file"
            accept="application/json"
            className="file-input-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {statusNote && <p className="dashboard-status-note">{statusNote}</p>}
      {importError && <p className="dashboard-error-note">{importError}</p>}

      {importState && (
        <div className="modal-backdrop" onClick={() => setImportState(null)}>
          <div className="series-compare-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header-row">
              <h3>{t('dashboard.importPreviewTitle')}</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImportState(null)}>
                {t('breakdown.close')}
              </button>
            </div>
            <ul className="dashboard-import-summary">
              <li>{t('dashboard.importPreviewPresets', { count: importState.validation.summary?.presetCount ?? 0 })}</li>
              <li>{t('dashboard.importPreviewShoots', { count: importState.validation.summary?.shootingCount ?? 0 })}</li>
              <li>{t('dashboard.importPreviewEvents', { count: importState.validation.summary?.preferenceEventCount ?? 0 })}</li>
            </ul>
            <div className="actions-row">
              <button type="button" className="btn btn-ghost" onClick={() => confirmImport('merge')}>
                {t('dashboard.importMerge')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => confirmImport('replace')}>
                {t('dashboard.importReplace')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
