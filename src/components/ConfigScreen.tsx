import { useAppState } from '../state/AppState';
import { PURPOSE_LABELS, type Purpose } from '../types';

const PURPOSE_DESCRIPTIONS: Record<Purpose, string> = {
  instagram: 'Belichtung & Wirkung im Feed zählen mehr als reine Detailschärfe',
  kunde: 'Ausgewogen, mit Fokus auf Verlässlichkeit und Vielfalt der Momente',
  portfolio: 'Höchste Ansprüche an Schärfe & technische Qualität',
  sonstiges: 'Ausgewogene Standard-Gewichtung',
};

export function ConfigScreen() {
  const { state, dispatch } = useAppState();

  return (
    <div className="config-panel">
      <div className="config-field">
        <label htmlFor="target-count">Zielanzahl Fotos</label>
        <input
          id="target-count"
          type="number"
          min={1}
          max={state.photos.length}
          className="number-input"
          value={state.targetCount}
          onChange={(e) => dispatch({ type: 'SET_TARGET_COUNT', count: Number(e.target.value) || 1 })}
        />
        <p className="config-hint">
          Wie viele Fotos sollen am Ende zur Bearbeitung vorgeschlagen werden? (von {state.photos.length}{' '}
          hochgeladenen)
        </p>
      </div>

      <div className="config-field">
        <label>Verwendungszweck</label>
        <div className="segmented-control">
          {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((purpose) => (
            <button
              key={purpose}
              type="button"
              className={`segment-btn${state.purpose === purpose ? ' selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_PURPOSE', purpose })}
            >
              {PURPOSE_LABELS[purpose]}
            </button>
          ))}
        </div>
        <p className="purpose-description">{PURPOSE_DESCRIPTIONS[state.purpose]}</p>
      </div>

      <div className="actions-row">
        <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'BACK_TO_UPLOAD' })}>
          Zurück
        </button>
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'START_PROCESSING' })}>
          Analyse starten
        </button>
      </div>
    </div>
  );
}
