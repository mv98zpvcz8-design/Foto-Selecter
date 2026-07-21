import { useEffect, useRef } from 'react';
import { AppStateProvider, useAppState } from './state/AppState';
import { UploadScreen } from './components/UploadScreen';
import { ConfigScreen } from './components/ConfigScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { runPipeline } from './lib/pipeline';

const STEP_LABELS: Record<string, string> = {
  upload: '1. Upload',
  config: '2. Einstellungen',
  processing: '3. Analyse',
  results: '4. Auswahl',
};

function AppContent() {
  const { state, dispatch } = useAppState();
  const startedRef = useRef(false);

  useEffect(() => {
    if (state.step !== 'processing') {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    runPipeline(state.photos, state.purpose, state.targetCount, (done, total) => {
      dispatch({ type: 'SET_PROGRESS', progress: { done, total } });
    }).then((result) => {
      dispatch({ type: 'SET_RESULTS', photos: result });
    });
  }, [state.step, state.photos, state.purpose, state.targetCount, dispatch]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">opticsbydom</span>
          <span className="brand-tag">Foto-Selecter</span>
        </div>
        <div className="step-indicator">
          {Object.entries(STEP_LABELS).map(([key, label]) => (
            <span key={key} className={state.step === key ? 'active' : ''}>
              {label}
            </span>
          ))}
        </div>
      </header>

      {state.step === 'upload' && <UploadScreen />}
      {state.step === 'config' && <ConfigScreen />}
      {state.step === 'processing' && <ProcessingScreen />}
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
