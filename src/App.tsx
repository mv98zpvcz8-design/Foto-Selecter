import { useEffect, useRef } from 'react';
import { AppStateProvider, useAppState } from './state/AppState';
import { useT } from './i18n/useT';
import type { Lang } from './i18n/translations';
import { UploadScreen } from './components/UploadScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { runPipeline, type CancelToken } from './lib/pipeline';
import { resolveStyleHint, resolveWeights } from './lib/profiles';
import type { AppStep, SelectionConfig } from './types';

const STEP_ORDER: AppStep[] = ['upload', 'config', 'processing', 'results'];
const STEP_LABEL_KEYS: Record<AppStep, string> = {
  upload: 'header.stepUpload',
  config: 'header.stepConfig',
  processing: 'header.stepProcessing',
  results: 'header.stepResults',
};
// Only these steps make sense as an explicit "jump back to" target —
// processing/results are only ever reached by moving forward.
const BACK_NAVIGABLE_STEPS: AppStep[] = ['upload', 'config'];

function useWindowDropGuard() {
  useEffect(() => {
    // Without this, dropping a file slightly outside the dropzone makes
    // the browser navigate away to display the raw image, wiping app state.
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);
}

function LanguageSwitch() {
  const { state, dispatch } = useAppState();
  return (
    <div className="lang-switch">
      {(['de', 'en'] as Lang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          className={`lang-btn${state.lang === lang ? ' selected' : ''}`}
          onClick={() => dispatch({ type: 'SET_LANG', lang })}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function AppContent() {
  const { state, dispatch } = useAppState();
  const t = useT();
  const startedRef = useRef(false);
  const cancelTokenRef = useRef<CancelToken>({ cancelled: false });

  useWindowDropGuard();

  useEffect(() => {
    if (state.step !== 'processing') {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const token: CancelToken = { cancelled: false };
    cancelTokenRef.current = token;

    const weights = resolveWeights(state.profileRef, state.customPresets);
    const styleHint = resolveStyleHint(state.profileRef, state.customPresets);
    const selection: SelectionConfig =
      state.selectionMode === 'triage' ? { mode: 'triage' } : { mode: 'topN', targetCount: state.targetCount };

    runPipeline(
      state.photos,
      weights,
      styleHint,
      selection,
      (done, total) => {
        if (!token.cancelled) dispatch({ type: 'SET_PROGRESS', progress: { done, total } });
      },
      token,
    ).then((result) => {
      if (!token.cancelled) dispatch({ type: 'SET_RESULTS', photos: result });
    });
  }, [state.step, state.photos, state.profileRef, state.customPresets, state.selectionMode, state.targetCount, dispatch]);

  function handleCancelProcessing() {
    cancelTokenRef.current.cancelled = true;
    dispatch({ type: 'GO_TO_STEP', step: 'config' });
  }

  function handleStepClick(step: AppStep) {
    if (step === state.step) return;
    if (state.step === 'processing') {
      cancelTokenRef.current.cancelled = true;
    }
    dispatch({ type: 'GO_TO_STEP', step });
  }

  const currentIndex = STEP_ORDER.indexOf(state.step);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">opticsbydom</span>
          <span className="brand-tag">Foto-Selecter</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="step-indicator">
            {STEP_ORDER.map((step) => {
              const clickable = BACK_NAVIGABLE_STEPS.includes(step) && STEP_ORDER.indexOf(step) < currentIndex;
              return (
                <span
                  key={step}
                  className={[state.step === step ? 'active' : '', clickable ? 'clickable' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={clickable ? () => handleStepClick(step) : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                >
                  {t(STEP_LABEL_KEYS[step])}
                </span>
              );
            })}
          </div>
          <LanguageSwitch />
        </div>
      </header>

      {state.step === 'upload' && <UploadScreen />}
      {state.step === 'config' && <ConfigScreen />}
      {state.step === 'processing' && <ProcessingScreen onCancel={handleCancelProcessing} />}
      {state.step === 'results' && <ResultsScreen />}
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

export default App;
