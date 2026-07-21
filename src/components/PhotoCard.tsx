import { useState } from 'react';
import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { classifyReasoning } from '../lib/reasoning';
import { formatReasoning, formatSuggestionNote } from '../i18n/format';
import { ScoreBreakdown } from './ScoreBreakdown';

export function PhotoCard({ photo }: { photo: PhotoResult }) {
  const { dispatch } = useAppState();
  const t = useT();
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (photo.status === 'error') {
    return (
      <div className="photo-card">
        <div className="photo-thumb">
          <div className="thumb-error">
            ⚠ {t('photo.previewFailed')}
            <br />
            {photo.errorKey ? t(photo.errorKey) : ''}
          </div>
        </div>
        <div className="photo-info">
          <span className="photo-name">{photo.name}</span>
          <span className="photo-error-text">{t('photo.excludedNote')}</span>
        </div>
      </div>
    );
  }

  const cardClass = [
    'photo-card',
    photo.isPreselected ? 'preselected' : '',
    !photo.isSelected ? 'deselected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      <div className="photo-thumb">
        <input
          type="checkbox"
          className="select-checkbox"
          checked={!!photo.isSelected}
          onChange={() => dispatch({ type: 'TOGGLE_SELECTED', id: photo.id })}
          aria-label={t('photo.selectAria', { name: photo.name })}
        />
        {photo.previewUrl && <img src={photo.previewUrl} alt={photo.name} loading="lazy" />}
        {photo.overallScore != null && (
          <button
            type="button"
            className="score-badge"
            title={t('photo.scoreHint')}
            onClick={() => setShowBreakdown(true)}
          >
            {photo.overallScore}
          </button>
        )}
        {(photo.facesWithClosedEyes ?? 0) > 0 && (
          <span className="eyes-closed-badge">{t('photo.eyesClosedBadge')}</span>
        )}
        {(photo.groupSize ?? 1) > 1 && (
          <span className="group-badge">
            {t('photo.seriesBadge', { rank: photo.groupRank ?? 1, size: photo.groupSize ?? 1 })}
          </span>
        )}
      </div>
      <div className="photo-info">
        <span className="photo-name">{photo.name}</span>
        <div className="photo-reasoning-row">
          <span className="photo-reasoning">{formatReasoning(classifyReasoning(photo), t)}</span>
          <button
            type="button"
            className="info-icon-btn"
            title={t('photo.scoreHint')}
            aria-label={t('photo.scoreHint')}
            onClick={() => setShowBreakdown(true)}
          >
            ⓘ
          </button>
        </div>
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

      {showBreakdown && <ScoreBreakdown photo={photo} onClose={() => setShowBreakdown(false)} />}
    </div>
  );
}
