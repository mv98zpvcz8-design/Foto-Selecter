import type { PhotoResult } from '../../types';
import type { PosterEnergy } from '../../lib/posterData';

/**
 * Every single-hero template defaulted to the exact same top-scored photo,
 * so a whole poster set for one shoot showed the identical picture in every
 * tile of the grid -- no variety across templates that are visually built
 * for different registers (a loud sports-editorial crop vs. a quiet
 * gallery print). Picks among the best-scored candidates (not literally
 * the single best, and not the whole pool -- a technically weaker photo
 * shouldn't win a slot just because its expression happens to match)
 * for whichever one's own detected expression best fits this template's
 * design register.
 */
export function pickHeroPhoto(photos: PhotoResult[], targetEnergy: PosterEnergy, poolSize = 3): PhotoResult {
  const candidates = photos.slice(0, Math.min(poolSize, photos.length));
  const withEmotion = candidates.filter((p) => p.emotionScores);
  if (withEmotion.length === 0) return candidates[0];

  const scored = withEmotion.map((photo) => {
    const expressiveness = 1 - (photo.emotionScores!.neutral ?? 0);
    const fitScore = targetEnergy === 'expressive' ? expressiveness : 1 - expressiveness;
    return { photo, fitScore };
  });
  scored.sort((a, b) => b.fitScore - a.fitScore);
  return scored[0].photo;
}
