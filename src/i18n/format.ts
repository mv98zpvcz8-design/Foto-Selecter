import type { ReasoningInfo } from '../lib/reasoning';
import type { LightroomSuggestion } from '../types';

type T = (key: string, vars?: Record<string, string | number>) => string;

export function formatReasoning(info: ReasoningInfo, t: T): string {
  const parts = [t(`reasoning.sharpness.${info.sharpness}`), t(`reasoning.exposure.${info.exposure}`)];

  if ((info.groupSize ?? 1) > 1) {
    if (info.groupRank === 1) {
      parts.push(t('reasoning.groupBest', { size: info.groupSize ?? 1 }));
    } else {
      parts.push(t('reasoning.groupRank', { rank: info.groupRank ?? 1, size: info.groupSize ?? 1 }));
    }
  }

  if ((info.facesDetected ?? 0) > 0) {
    if (info.facesWithClosedEyes) {
      parts.push(t('reasoning.eyesClosed', { count: info.facesWithClosedEyes }));
    } else {
      parts.push(t('reasoning.eyesOpen'));
    }
  }

  return parts.join(', ');
}

export function formatSuggestionNote(suggestion: LightroomSuggestion, t: T): string {
  return t(`lr.${suggestion.kind}`, suggestion.params);
}
