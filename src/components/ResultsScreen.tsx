import { useMemo } from 'react';
import { useAppState } from '../state/AppState';
import { PhotoCard } from './PhotoCard';
import { exportAsCsv, exportAsTxt } from '../lib/exportResults';
import { PURPOSE_LABELS } from '../types';

export function ResultsScreen() {
  const { state, dispatch } = useAppState();
  const { photos, showAll, purpose } = state;

  const donePhotos = useMemo(() => photos.filter((p) => p.status === 'done'), [photos]);
  const errorPhotos = useMemo(() => photos.filter((p) => p.status === 'error'), [photos]);
  const preselected = useMemo(() => donePhotos.filter((p) => p.isPreselected), [donePhotos]);
  const selectedCount = useMemo(() => photos.filter((p) => p.isSelected).length, [photos]);

  const visiblePhotos = showAll ? donePhotos : preselected;
  const sortedVisible = useMemo(
    () => [...visiblePhotos].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)),
    [visiblePhotos],
  );

  return (
    <div>
      <div className="results-toolbar">
        <div className="results-stats">
          <div>
            <strong>{selectedCount}</strong>
            <div>ausgewählt</div>
          </div>
          <div>
            <strong>{preselected.length}</strong>
            <div>Vorschlag ({PURPOSE_LABELS[purpose]})</div>
          </div>
          <div>
            <strong>{donePhotos.length}</strong>
            <div>gesamt analysiert</div>
          </div>
        </div>
        <div className="toolbar-actions">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => dispatch({ type: 'SET_SHOW_ALL', showAll: e.target.checked })}
            />
            Alle anzeigen
          </label>
          <button type="button" className="btn btn-sm" onClick={() => exportAsTxt(photos)}>
            .txt exportieren
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportAsCsv(photos)}>
            .csv exportieren
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'RESET' })}>
            Neuer Durchlauf
          </button>
        </div>
      </div>

      {sortedVisible.length === 0 ? (
        <div className="empty-state">Keine Fotos in dieser Ansicht.</div>
      ) : (
        <div className="photo-grid">
          {sortedVisible.map((p) => (
            <PhotoCard key={p.id} photo={p} />
          ))}
        </div>
      )}

      {errorPhotos.length > 0 && (
        <>
          <div className="section-heading">Nicht auswertbare Dateien ({errorPhotos.length})</div>
          <div className="photo-grid">
            {errorPhotos.map((p) => (
              <PhotoCard key={p.id} photo={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
