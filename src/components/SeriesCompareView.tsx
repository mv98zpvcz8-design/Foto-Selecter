import { createPortal } from 'react-dom';
import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { classifyReasoning } from '../lib/reasoning';
import { formatReasoning } from '../i18n/format';

const MAX_SHOWN = 3;

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
      </div>
    </div>,
    document.body,
  );
}
