import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { AppStep, PhotoResult, Purpose, ProcessingProgress } from '../types';
import { isSupportedFile } from '../lib/fileTypes';
import { createInitialPhotoResults } from '../lib/pipeline';

interface AppState {
  step: AppStep;
  photos: PhotoResult[];
  rejectedFileNames: string[];
  targetCount: number;
  purpose: Purpose;
  progress: ProcessingProgress;
  showAll: boolean;
}

type Action =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_TARGET_COUNT'; count: number }
  | { type: 'SET_PURPOSE'; purpose: Purpose }
  | { type: 'GO_TO_CONFIG' }
  | { type: 'BACK_TO_UPLOAD' }
  | { type: 'START_PROCESSING' }
  | { type: 'SET_PROGRESS'; progress: ProcessingProgress }
  | { type: 'SET_RESULTS'; photos: PhotoResult[] }
  | { type: 'TOGGLE_SELECTED'; id: string }
  | { type: 'SET_SHOW_ALL'; showAll: boolean }
  | { type: 'RESET' };

const initialState: AppState = {
  step: 'upload',
  photos: [],
  rejectedFileNames: [],
  targetCount: 20,
  purpose: 'kunde',
  progress: { done: 0, total: 0 },
  showAll: false,
};

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
    case 'GO_TO_CONFIG':
      return { ...state, step: 'config' };
    case 'BACK_TO_UPLOAD':
      return { ...state, step: 'upload' };
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
    case 'RESET':
      for (const photo of state.photos) {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      }
      return initialState;
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
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
