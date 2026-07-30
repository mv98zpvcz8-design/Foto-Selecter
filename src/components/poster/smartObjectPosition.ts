import type { PhotoResult } from '../../types';

/**
 * CSS object-position for an object-fit:cover image that keeps the photo's
 * actual subject in frame instead of a blind center-crop — reuses the face
 * bounding-box center the pipeline already computes (see faceAnalysis.ts),
 * it just wasn't threaded through to anything before. Falls back to a
 * slightly-above-center point (subjects are rarely in the bottom third of a
 * frame) when no face was detected on this photo.
 */
export function smartObjectPosition(photo: PhotoResult): string {
  const center = photo.subjectCenter;
  if (!center) return '50% 42%';
  const clamp = (v: number) => Math.max(0, Math.min(1, v)) * 100;
  return `${clamp(center.x)}% ${clamp(center.y)}%`;
}
