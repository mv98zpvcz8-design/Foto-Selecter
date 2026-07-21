import type { PhotoResult } from '../types';

type Orientation = 'portrait' | 'landscape' | 'square';

function getOrientation(photo: PhotoResult): Orientation {
  const w = photo.previewWidth ?? 0;
  const h = photo.previewHeight ?? 0;
  if (w === h) return 'square';
  return w > h ? 'landscape' : 'portrait';
}

/**
 * Orders a set of already-selected photos for an Instagram carousel:
 * the highest-scoring shot leads as the cover, then the rest follow
 * capture-time chronology while breaking up runs of 3+ same-orientation
 * frames in a row (looking a few frames ahead for a different
 * orientation to pull forward) so the carousel doesn't read as a wall of
 * portrait or landscape crops.
 */
export function computeCarouselOrder(photos: PhotoResult[]): PhotoResult[] {
  if (photos.length === 0) return [];

  const byScore = [...photos].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
  const cover = byScore[0];
  const rest = photos.filter((p) => p.id !== cover.id);

  rest.sort((a, b) => {
    const ta = a.captureTime?.getTime();
    const tb = b.captureTime?.getTime();
    if (ta != null && tb != null) return ta - tb;
    if (ta != null) return -1;
    if (tb != null) return 1;
    return 0;
  });

  const result = [cover];
  const pool = rest;
  let lastOrientation = getOrientation(cover);
  let sameRun = 1;
  const LOOKAHEAD = 3;

  while (pool.length > 0) {
    const nextOrientation = getOrientation(pool[0]);
    if (nextOrientation === lastOrientation && sameRun >= 2) {
      const swapIndex = pool.findIndex((p, idx) => idx > 0 && idx <= LOOKAHEAD && getOrientation(p) !== lastOrientation);
      if (swapIndex > 0) {
        const [item] = pool.splice(swapIndex, 1);
        result.push(item);
        lastOrientation = getOrientation(item);
        sameRun = 1;
        continue;
      }
    }

    const item = pool.shift() as PhotoResult;
    const itemOrientation = getOrientation(item);
    if (itemOrientation === lastOrientation) sameRun++;
    else {
      lastOrientation = itemOrientation;
      sameRun = 1;
    }
    result.push(item);
  }

  return result;
}

/**
 * Computes and stamps `carouselPosition` (1-based) on every preselected
 * photo, in place. Clears it on everything else so stale positions don't
 * linger if the selection or purpose changes.
 */
export function assignCarouselPositions(photos: PhotoResult[]): void {
  const preselected = photos.filter((p) => p.status === 'done' && p.isPreselected);
  const ordered = computeCarouselOrder(preselected);
  const positionById = new Map(ordered.map((p, i) => [p.id, i + 1]));

  for (const photo of photos) {
    photo.carouselPosition = positionById.get(photo.id);
  }
}
