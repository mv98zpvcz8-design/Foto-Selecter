import { useAppState } from '../state/AppState';

export function ProcessingScreen() {
  const { state } = useAppState();
  const { done, total } = state.progress;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="processing-panel">
      <h2>Fotos werden analysiert…</h2>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="progress-label">
        {done} von {total} Fotos verarbeitet — Vorschau-Extraktion, Schärfe- & Belichtungsanalyse, Duplikat-Erkennung
      </p>
    </div>
  );
}
