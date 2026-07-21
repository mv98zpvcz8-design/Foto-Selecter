import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { classifyReasoning } from '../lib/reasoning';
import { formatReasoning, formatSuggestionNote } from '../i18n/format';

export function PhotoCard({ photo }: { photo: PhotoResult }) {
  const { dispatch } = useAppState();
  const t = useT();

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
        {photo.overallScore != null && <span className="score-badge">{photo.overallScore}</span>}
        {(photo.groupSize ?? 1) > 1 && (
          <span className="group-badge">
            {t('photo.seriesBadge', { rank: photo.groupRank ?? 1, size: photo.groupSize ?? 1 })}
          </span>
        )}
      </div>
      <div className="photo-info">
        <span className="photo-name">{photo.name}</span>
        <span className="photo-reasoning">{formatReasoning(classifyReasoning(photo), t)}</span>
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
  );
}
