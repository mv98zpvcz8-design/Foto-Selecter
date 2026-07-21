import { createPortal } from 'react-dom';
import type { PhotoResult } from '../types';
import { useT } from '../i18n/useT';
import { getScoreNotes } from '../lib/scoreNotes';
import { classifyReasoning } from '../lib/reasoning';
import { formatReasoning, formatSuggestionNote } from '../i18n/format';

/**
 * Full-detail lightbox for a single photo: large preview plus every
 * piece of information the app has about it in one place (score
 * breakdown with exact weights, reasoning, Lightroom suggestions,
 * excellence/potential notes) — opened by clicking the photo itself, the
 * score badge, the info icon, or the expand icon under the Lightroom
 * suggestions.
 */
export function PhotoDetailView({ photo, onClose }: { photo: PhotoResult; onClose: () => void }) {
  const t = useT();
  const weights = photo.appliedWeights;
  const notes = getScoreNotes(photo);
  const reasoningText = formatReasoning(classifyReasoning(photo), t);

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
      <div className="detail-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="detail-close" onClick={onClose} aria-label={t('breakdown.close')}>
          ✕
        </button>

        <div className="detail-image">{photo.previewUrl && <img src={photo.previewUrl} alt={photo.name} />}</div>

        <div className="detail-body">
          <h3 className="detail-name">{photo.name}</h3>
          <p className="detail-reasoning">{reasoningText}</p>

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
                  <td>{row.weight.toFixed(2)}</td>
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

          {photo.lightroomSuggestions && photo.lightroomSuggestions.length > 0 && (
            <div className="lr-suggestions">
              <div className="lr-suggestions-heading">{t('photo.lightroomHeading')}</div>
              <ul>
                {photo.lightroomSuggestions.map((s, idx) => (
                  <li key={idx}>
                    <span className="lr-slider">{s.slider}</span>
                    <span className="lr-note">{formatSuggestionNote(s, t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
