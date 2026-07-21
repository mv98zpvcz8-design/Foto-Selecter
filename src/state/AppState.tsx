import { createContext, useContext, useEffect, useReducer, type ReactNode, type Dispatch } from 'react';
import type { AppStep, PhotoResult, Purpose, ProcessingProgress } from '../types';
import type { Lang } from '../i18n/translations';
import { isSupportedFile } from '../lib/fileTypes';
import { createInitialPhotoResults } from '../lib/pipeline';

const LANG_STORAGE_KEY = 'foto-selecter-lang';

function getInitialLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to default
  }
  if (typeof navigator !== 'undefined' && !navigator.language?.toLowerCase().startsWith('de')) {
    return 'en';
  }
  return 'de';
}

interface AppState {
  step: AppStep;
  photos: PhotoResult[];
  rejectedFileNames: string[];
  targetCount: number;
  purpose: Purpose;
  progress: ProcessingProgress;
  showAll: boolean;
  lang: Lang;
}

type Action =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_TARGET_COUNT'; count: number }
  | { type: 'SET_PURPOSE'; purpose: Purpose }
  | { type: 'GO_TO_STEP'; step: AppStep }
  | { type: 'START_PROCESSING' }
  | { type: 'SET_PROGRESS'; progress: ProcessingProgress }
  | { type: 'SET_RESULTS'; photos: PhotoResult[] }
  | { type: 'TOGGLE_SELECTED'; id: string }
  | { type: 'SET_SHOW_ALL'; showAll: boolean }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'RESET' };

function createInitialState(): AppState {
  return {
    step: 'upload',
    photos: [],
    rejectedFileNames: [],
    targetCount: 20,
    purpose: 'kunde',
    progress: { done: 0, total: 0 },
    showAll: false,
    lang: getInitialLang(),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_FILES': {
      const accepted: File[] = [];
      const rejected: string[] = [];
      const existingKeys = new Set(state.photos.map((p) => `${p.name}-${p.file.size}`));
      for (const file of action.files) {
        const key = `${file.name}-${file.size}`;
        if (!isSupportedFile(file.name)) {
          rejected.push(file.name);
        } else if (!existingKeys.has(key)) {
          accepted.push(file);
          existingKeys.add(key);
        }
      }
      return {
        ...state,
        photos: [...state.photos, ...createInitialPhotoResults(accepted)],
        rejectedFileNames: [...state.rejectedFileNames, ...rejected],
      };
    }
    case 'REMOVE_FILE':
      return { ...state, photos: state.photos.filter((p) => p.id !== action.id) };
    case 'CLEAR_FILES':
      return { ...state, photos: [], rejectedFileNames: [] };
    case 'SET_TARGET_COUNT':
      return { ...state, targetCount: Math.max(1, Math.round(action.count)) };
    case 'SET_PURPOSE':
      return { ...state, purpose: action.purpose };
    case 'GO_TO_STEP':
      return { ...state, step: action.step };
    case 'START_PROCESSING':
      return { ...state, step: 'processing', progress: { done: 0, total: state.photos.length } };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'SET_RESULTS':
      return { ...state, step: 'results', photos: action.photos, showAll: false };
    case 'TOGGLE_SELECTED':
      return {
        ...state,
        photos: state.photos.map((p) => (p.id === action.id ? { ...p, isSelected: !p.isSelected } : p)),
      };
    case 'SET_SHOW_ALL':
      return { ...state, showAll: action.showAll };
    case 'SET_LANG':
      return { ...state, lang: action.lang };
    case 'RESET': {
      for (const photo of state.photos) {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      }
      return { ...createInitialState(), lang: state.lang };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, state.lang);
    } catch {
      // localStorage unavailable — language choice just won't persist
    }
  }, [state.lang]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
