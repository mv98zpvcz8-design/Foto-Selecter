import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';

export function PhotoCard({ photo }: { photo: PhotoResult }) {
  const { dispatch } = useAppState();

  if (photo.status === 'error') {
    return (
      <div className="photo-card">
        <div className="photo-thumb">
          <div className="thumb-error">
            ⚠ Vorschau fehlgeschlagen
            <br />
            {photo.error}
          </div>
        </div>
        <div className="photo-info">
          <span className="photo-name">{photo.name}</span>
          <span className="photo-error-text">Wurde nicht in die Bewertung einbezogen.</span>
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
          aria-label={`${photo.name} auswählen`}
        />
        {photo.previewUrl && <img src={photo.previewUrl} alt={photo.name} loading="lazy" />}
        {photo.overallScore != null && <span className="score-badge">{photo.overallScore}</span>}
        {(photo.groupSize ?? 1) > 1 && (
          <span className="group-badge">
            Serie {photo.groupRank}/{photo.groupSize}
          </span>
        )}
      </div>
      <div className="photo-info">
        <span className="photo-name">{photo.name}</span>
        {photo.reasoning && <span className="photo-reasoning">{photo.reasoning}</span>}
        {photo.lightroomSuggestions && photo.lightroomSuggestions.length > 0 && (
          <div className="lr-suggestions">
            <div className="lr-suggestions-heading">Lightroom-Feinschliff</div>
            <ul>
              {photo.lightroomSuggestions.map((s, idx) => (
                <li key={idx}>
                  <span className="lr-slider">{s.slider}</span>
                  <span className="lr-note">{s.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
