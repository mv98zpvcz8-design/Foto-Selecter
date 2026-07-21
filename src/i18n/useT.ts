import { useAppState } from '../state/AppState';
import { translate } from './translations';

export function useT() {
  const { state } = useAppState();
  return (key: string, vars?: Record<string, string | number>) => translate(state.lang, key, vars);
}
