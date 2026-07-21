import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';

export function ProcessingScreen({ onCancel }: { onCancel: () => void }) {
  const { state } = useAppState();
  const t = useT();
  const { done, total } = state.progress;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="processing-panel">
      <h2>{t('processing.title')}</h2>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="progress-label">{t('processing.label', { done, total })}</p>
      <div style={{ marginTop: 24 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t('processing.cancel')}
        </button>
      </div>
    </div>
  );
}
