import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { PURPOSE_VALUES } from '../types';

export function ConfigScreen() {
  const { state, dispatch } = useAppState();
  const t = useT();

  return (
    <div className="config-panel">
      <div className="config-field">
        <label htmlFor="target-count">{t('config.targetLabel')}</label>
        <input
          id="target-count"
          type="number"
          min={1}
          max={state.photos.length}
          className="number-input"
          value={state.targetCount}
          onChange={(e) => dispatch({ type: 'SET_TARGET_COUNT', count: Number(e.target.value) || 1 })}
        />
        <p className="config-hint">{t('config.targetHint', { total: state.photos.length })}</p>
      </div>

      <div className="config-field">
        <label>{t('config.purposeLabel')}</label>
        <div className="segmented-control">
          {PURPOSE_VALUES.map((purpose) => (
            <button
              key={purpose}
              type="button"
              className={`segment-btn${state.purpose === purpose ? ' selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_PURPOSE', purpose })}
            >
              {t(`purpose.${purpose}`)}
            </button>
          ))}
        </div>
        <p className="purpose-description">{t(`purpose.${state.purpose}.desc`)}</p>
      </div>

      <div className="actions-row">
        <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'GO_TO_STEP', step: 'upload' })}>
          {t('config.back')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'START_PROCESSING' })}>
          {t('config.start')}
        </button>
      </div>
    </div>
  );
}
