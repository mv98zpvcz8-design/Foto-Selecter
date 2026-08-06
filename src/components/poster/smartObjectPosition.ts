import type { PhotoResult } from '../../types';

/**
 * CSS object-position for an object-fit:cover image that keeps the photo's
 * actual subject in frame instead of a blind center-crop — reuses the face
 * bounding-box center the pipeline already computes (see faceAnalysis.ts),
 * it just wasn't threaded through to anything before. Falls back to a
 * slightly-above-center point (subjects are rarely in the bottom third of a
 * frame) when no face was detected on this photo.
 *
 * For the Y axis, prefers the midpoint of `subjectYExtent` (the span from
 * the topmost to bottommost detected face) over the plain average center:
 * with two people at different heights in frame — one crouching, one
 * standing — the average center can sit closer to whichever face is larger
 * or more central, leaving the other one's head near the crop edge. Centering
 * on the whole span gives both faces an equal share of whatever margin a
 * tight-aspect template can spare, instead of protecting one at the other's
 * expense.
 */
export function smartObjectPosition(photo: PhotoResult): string {
  const center = photo.subjectCenter;
  if (!center) return '50% 42%';
  const clamp = (v: number) => Math.max(0, Math.min(1, v)) * 100;
  const extent = photo.subjectYExtent;
  const y = extent ? (extent.top + extent.bottom) / 2 : center.y;
  return `${clamp(center.x)}% ${clamp(y)}%`;
}
