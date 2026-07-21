import type { PhotoResult } from '../types';

export interface ScoreNote {
  key: string; // translation key, e.g. "excellence.sharpness"
  vars?: Record<string, string | number>;
}

const EXCELLENCE_THRESHOLD = 92;
const DIMENSION_EXCELLENCE_THRESHOLD = 95;
const POTENTIAL_STRONG_THRESHOLD = 85;
const POTENTIAL_WEAK_THRESHOLD = 70;

/**
 * Flags when a photo is exceptionally strong in some dimension (worth
 * calling out explicitly, not just a number) or has clear headroom — a
 * fixable weak spot while everything else about the shot is already
 * working. Pure/language-free; the UI resolves `key` via `t()`.
 */
export function getScoreNotes(photo: PhotoResult): ScoreNote[] {
  const notes: ScoreNote[] = [];
  const sharpness = photo.sharpnessScore ?? 0;
  const exposure = photo.exposureScore ?? 0;
  const faces = photo.faceScore ?? 100;
  const facesDetected = photo.facesDetected ?? 0;

  if ((photo.overallScore ?? 0) >= EXCELLENCE_THRESHOLD) {
    notes.push({ key: 'excellence.overall' });
  }
  if (sharpness >= DIMENSION_EXCELLENCE_THRESHOLD) {
    notes.push({ key: 'excellence.sharpness' });
  }
  if (exposure >= DIMENSION_EXCELLENCE_THRESHOLD) {
    notes.push({ key: 'excellence.exposure' });
  }
  if (facesDetected >= 2 && faces === 100) {
    notes.push({ key: 'excellence.faces', vars: { count: facesDetected } });
  }

  if (sharpness < POTENTIAL_WEAK_THRESHOLD && exposure >= POTENTIAL_STRONG_THRESHOLD && faces >= POTENTIAL_STRONG_THRESHOLD) {
    notes.push({ key: 'potential.sharpness' });
  } else if (
    exposure < POTENTIAL_WEAK_THRESHOLD &&
    sharpness >= POTENTIAL_STRONG_THRESHOLD &&
    faces >= POTENTIAL_STRONG_THRESHOLD
  ) {
    notes.push({ key: 'potential.exposure' });
  }

  return notes;
}
