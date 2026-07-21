import { createPortal } from 'react-dom';
import type { PhotoResult } from '../types';
import { useT } from '../i18n/useT';
import { getScoreNotes } from '../lib/scoreNotes';

export function ScoreBreakdown({ photo, onClose }: { photo: PhotoResult; onClose: () => void }) {
  const t = useT();
  const weights = photo.appliedWeights;
  const notes = getScoreNotes(photo);

  const rows = weights
    ? [
        { key: 'sharpness', label: t('breakdown.sharpness'), score: photo.sharpnessScore ?? 0, weight: weights.sharpness },
        { key: 'exposure', label: t('breakdown.exposure'), score: photo.exposureScore ?? 0, weight: weights.exposure },
        { key: 'group', label: t('breakdown.group'), score: photo.groupBonusScore ?? 0, weight: weights.group },
        { key: 'faces', label: t('breakdown.faces'), score: photo.faceScore ?? 100, weight: weights.faces },
      ]
    : [];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{t('breakdown.title')}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('breakdown.close')}
          </button>
        </div>

        <div className="breakdown-total">
          <span>{t('breakdown.total')}</span>
          <span className="breakdown-total-value">{photo.overallScore ?? 0}</span>
        </div>

        <table className="breakdown-table">
          <thead>
            <tr>
              <th></th>
              <th>{t('breakdown.rawScore')}</th>
              <th>{t('breakdown.weight')}</th>
              <th>{t('breakdown.contribution')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td>{row.score}</td>
                <td>{Math.round(row.weight * 100)}%</td>
                <td>{Math.round(row.score * row.weight)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(photo.facesDetected ?? 0) === 0 && <p className="breakdown-hint">{t('breakdown.noFaces')}</p>}

        {notes.length > 0 && (
          <div className="breakdown-notes">
            {notes.map((note, i) => (
              <p key={i}>{t(note.key, note.vars)}</p>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
