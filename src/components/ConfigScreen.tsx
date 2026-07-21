import { useState } from 'react';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { PURPOSE_VALUES } from '../types';
import type { CustomPreset, Purpose, WeightProfile } from '../types';
import { normalizeWeights, PURPOSE_WEIGHTS, resolveCustomPreset } from '../lib/profiles';

const RAW_SLIDER_MAX = 100;

function toRawSliders(weights: WeightProfile): WeightProfile {
  return {
    sharpness: Math.round(weights.sharpness * RAW_SLIDER_MAX),
    exposure: Math.round(weights.exposure * RAW_SLIDER_MAX),
    group: Math.round(weights.group * RAW_SLIDER_MAX),
    faces: Math.round(weights.faces * RAW_SLIDER_MAX),
  };
}

export function ConfigScreen() {
  const { state, dispatch } = useAppState();
  const t = useT();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [formName, setFormName] = useState('');
  const [formStyleHint, setFormStyleHint] = useState<Purpose>('sonstiges');
  const [formWeights, setFormWeights] = useState<WeightProfile>(toRawSliders(PURPOSE_WEIGHTS.sonstiges));

  const activePreset =
    state.profileRef.kind === 'custom' ? resolveCustomPreset(state.profileRef, state.customPresets) : undefined;

  function openNewPresetForm() {
    setEditingPreset(null);
    setFormName('');
    setFormStyleHint('sonstiges');
    setFormWeights(toRawSliders(PURPOSE_WEIGHTS.sonstiges));
    setFormOpen(true);
  }

  function openEditPresetForm(preset: CustomPreset) {
    setEditingPreset(preset);
    setFormName(preset.name);
    setFormStyleHint(preset.styleHint);
    setFormWeights(toRawSliders(preset.weights));
    setFormOpen(true);
  }

  function closeForm() {
    setEditingPreset(null);
    setFormName('');
    setFormOpen(false);
  }

  function savePreset() {
    if (!formName.trim()) return;
    const preset: CustomPreset = {
      id: editingPreset?.id ?? crypto.randomUUID(),
      name: formName.trim(),
      weights: normalizeWeights(formWeights),
      styleHint: formStyleHint,
    };
    dispatch({ type: 'SAVE_PRESET', preset });
    closeForm();
  }

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
              className={`segment-btn${state.profileRef.kind === 'builtin' && state.profileRef.purpose === purpose ? ' selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_PROFILE_REF', profileRef: { kind: 'builtin', purpose } })}
            >
              {t(`purpose.${purpose}`)}
            </button>
          ))}
        </div>
        {state.profileRef.kind === 'builtin' && (
          <p className="purpose-description">{t(`purpose.${state.profileRef.purpose}.desc`)}</p>
        )}
      </div>

      <div className="config-field">
        <label>{t('config.presetsLabel')}</label>
        <p className="config-hint" style={{ marginTop: 0, marginBottom: 12 }}>
          {t('config.presetsHint')}
        </p>

        {state.customPresets.length > 0 && (
          <div className="preset-list">
            {state.customPresets.map((preset) => (
              <div
                key={preset.id}
                className={`preset-chip${activePreset?.id === preset.id ? ' selected' : ''}`}
                onClick={() => dispatch({ type: 'SET_PROFILE_REF', profileRef: { kind: 'custom', presetId: preset.id } })}
              >
                <span>{preset.name}</span>
                <button
                  type="button"
                  className="preset-chip-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditPresetForm(preset);
                  }}
                  aria-label={t('config.presetEdit')}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="preset-chip-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'DELETE_PRESET', id: preset.id });
                  }}
                  aria-label={t('config.presetDelete')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!formOpen ? (
          <button type="button" className="btn btn-sm" onClick={openNewPresetForm}>
            {t('config.newPreset')}
          </button>
        ) : (
          <div className="preset-form">
            <input
              type="text"
              className="number-input"
              style={{ width: '100%', fontSize: 14, fontWeight: 500 }}
              placeholder={t('config.presetNamePlaceholder')}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />

            <div className="weight-sliders">
              {(['sharpness', 'exposure', 'group', 'faces'] as const).map((key) => (
                <div className="weight-slider-row" key={key}>
                  <span className="weight-slider-label">{t(`config.weight${key.charAt(0).toUpperCase()}${key.slice(1)}`)}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={formWeights[key]}
                    onChange={(e) => setFormWeights({ ...formWeights, [key]: Number(e.target.value) })}
                  />
                  <span className="weight-slider-value">
                    {Math.round(
                      (formWeights[key] /
                        Math.max(1, formWeights.sharpness + formWeights.exposure + formWeights.group + formWeights.faces)) *
                        100,
                    )}
                    %
                  </span>
                </div>
              ))}
            </div>

            <div className="config-field" style={{ gap: 8 }}>
              <label style={{ marginBottom: 6 }}>{t('config.presetStyleLabel')}</label>
              <div className="segmented-control">
                {PURPOSE_VALUES.map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    className={`segment-btn${formStyleHint === purpose ? ' selected' : ''}`}
                    onClick={() => setFormStyleHint(purpose)}
                  >
                    {t(`purpose.${purpose}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="actions-row" style={{ marginTop: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeForm}>
                {t('config.presetCancel')}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!formName.trim()} onClick={savePreset}>
                {t('config.presetSave')}
              </button>
            </div>
          </div>
        )}
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
