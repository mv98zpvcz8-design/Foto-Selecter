import type { PhotoResult } from '../types';

export type SharpnessLevel = 'excellent' | 'good' | 'soft' | 'blurry';
export type ExposureLevel = 'good' | 'acceptable' | 'underexposed' | 'overexposed';

export interface ReasoningInfo {
  sharpness: SharpnessLevel;
  exposure: ExposureLevel;
  selectiveFocus: boolean;
  groupRank?: number;
  groupSize?: number;
  facesDetected?: number;
  facesWithClosedEyes?: number;
}

/**
 * Classifies a photo's technical scores into level buckets. Kept
 * language-free so the UI can render the actual sentence in whichever
 * language is active via `t('reasoning.sharpness.<level>')` etc.
 */
export function classifyReasoning(photo: PhotoResult): ReasoningInfo {
  const s = photo.sharpnessScore ?? 0;
  const sharpness: SharpnessLevel = s >= 80 ? 'excellent' : s >= 60 ? 'good' : s >= 40 ? 'soft' : 'blurry';

  const e = photo.exposureScore ?? 0;
  const shadowHeavy = (photo.shadowClipping ?? 0) > (photo.highlightClipping ?? 0);
  const exposure: ExposureLevel = e >= 80 ? 'good' : e >= 60 ? 'acceptable' : shadowHeavy ? 'underexposed' : 'overexposed';

  return {
    sharpness,
    exposure,
    selectiveFocus: !!photo.selectiveFocusDetected,
    groupRank: photo.groupRank,
    groupSize: photo.groupSize,
    facesDetected: photo.facesDetected,
    facesWithClosedEyes: photo.facesWithClosedEyes,
  };
}
