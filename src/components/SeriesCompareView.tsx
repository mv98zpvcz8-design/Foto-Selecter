import { createPortal } from 'react-dom';
import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { classifyReasoning } from '../lib/reasoning';
import { formatReasoning } from '../i18n/format';

const MAX_SHOWN = 3;

interface MetricRow {
  key: string;
  labelKey: string;
  values: (number | null)[]; // null = no data for this photo (e.g. no faces detected)
  higherIsBetter: boolean;
}

/** Builds the structured metric comparison rows so "why is this one better" is visible at a glance, not just asserted. */
function buildMetricRows(photos: PhotoResult[]): MetricRow[] {
  const rows: MetricRow[] = [
    { key: 'overall', labelKey: 'breakdown.total', values: photos.map((p) => p.overallScore ?? null), higherIsBetter: true },
    { key: 'sharpness', labelKey: 'breakdown.sharpness', values: photos.map((p) => p.sharpnessScore ?? null), higherIsBetter: true },
    { key: 'exposure', labelKey: 'breakdown.exposure', values: photos.map((p) => p.exposureScore ?? null), higherIsBetter: true },
  ];

  if (photos.some((p) => (p.facesDetected ?? 0) > 0)) {
    rows.push({
      key: 'eyesOpen',
      labelKey: 'series.compareEyesOpen',
      values: photos.map((p) => (p.facesDetected ? p.facesDetected - (p.facesWithClosedEyes ?? 0) : null)),
      higherIsBetter: true,
    });
    rows.push({
      key: 'emotion',
      labelKey: 'series.compareEmotion',
      values: photos.map((p) => {
        const scores = Object.entries(p.emotionScores ?? {}).filter(([k]) => k !== 'neutral');
        const strongest = scores.sort((a, b) => b[1] - a[1])[0];
        return strongest ? Math.round(strongest[1] * 100) : null;
      }),
      higherIsBetter: true,
    });
  }

  return rows;
}

/** Index of the best value in a row (ties: all tied values count as best), or -1 if there's no comparable data. */
function bestIndices(row: MetricRow): Set<number> {
  const present = row.values.filter((v): v is number => v != null);
  if (present.length < 2) return new Set();
  const best = row.higherIsBetter ? Math.max(...present) : Math.min(...present);
  return new Set(row.values.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0));
}

/**
 * Side-by-side comparison of a burst/series' top frames, so the user can
 * override the automatic "best of series" pick instead of trusting it
 * blindly. Picking one makes it the sole selected photo from that group;
 * the others in the group are deselected (they're still visible via
 * "show all", just not part of the export).
 */
export function SeriesCompareView({ groupPhotos, onClose }: { groupPhotos: PhotoResult[]; onClose: () => void }) {
  const { dispatch } = useAppState();
  const t = useT();

  const sorted = [...groupPhotos].sort((a, b) => (a.groupRank ?? 1) - (b.groupRank ?? 1)).slice(0, MAX_SHOWN);
  const groupId = groupPhotos[0]?.groupId;
  const metricRows = buildMetricRows(sorted);

  function pick(id: string) {
    if (groupId == null) return;
    dispatch({ type: 'SELECT_FROM_GROUP', groupId, id });
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="series-compare-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header-row">
          <h3>{t('series.compareTitle', { size: groupPhotos.length })}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('breakdown.close')}
          </button>
        </div>
        <div className="series-compare-grid">
          {sorted.map((photo) => (
            <div key={photo.id} className={`series-compare-item${photo.isSelected ? ' selected' : ''}`}>
              <div className="series-compare-thumb">
                {photo.previewUrl && <img src={photo.previewUrl} alt={photo.name} />}
                {photo.overallScore != null && <span className="score-badge">{photo.overallScore}</span>}
              </div>
              <div className="series-compare-info">
                <span className="photo-name">{photo.name}</span>
                <span className="photo-reasoning">{formatReasoning(classifyReasoning(photo), t)}</span>
                <button
                  type="button"
                  className={`btn btn-sm${photo.isSelected ? ' btn-primary' : ''}`}
                  onClick={() => pick(photo.id)}
                >
                  {photo.isSelected ? t('series.thisOneSelected') : t('series.pickThisOne')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <table className="series-compare-table">
          <thead>
            <tr>
              <th></th>
              {sorted.map((photo) => (
                <th key={photo.id}>{photo.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row) => {
              const best = bestIndices(row);
              return (
                <tr key={row.key}>
                  <td>{t(row.labelKey)}</td>
                  {row.values.map((value, i) => (
                    <td key={i} className={best.has(i) ? 'series-compare-best' : ''}>
                      {value == null ? '—' : row.key === 'emotion' ? `${value}%` : value}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>,
    document.body,
  );
}
