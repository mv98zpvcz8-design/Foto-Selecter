import type { PhotoResult, Purpose } from '../types';
import { buildPalette, type PosterPalette, type RgbColor } from './colorPalette';

export type PosterMood = 'monochrome' | 'colorful' | 'warm' | 'cool' | 'minimal';
export type PosterPeopleFormat = 'single' | 'couple' | 'group' | 'none';

export interface PosterData {
  purpose: Purpose;
  titleText: string;
  dateText: string | null;
  photoCountText: string;
  mood: PosterMood;
  peopleFormat: PosterPeopleFormat;
  palette: PosterPalette;
  heroPhoto: PhotoResult;
  galleryPhotos: PhotoResult[];
}

const MAX_GALLERY_PHOTOS = 6;
// Long enough to span a whole wedding/concert/match without splitting it,
// short enough to separate genuinely different shoots uploaded together.
const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

/**
 * Restricts the candidate pool to one coherent shoot before gallery photos
 * are picked. Multi-photo templates (filmstrip, scrapbook, grid, collage)
 * read as broken when they mix unrelated events just because a batch
 * happened to be uploaded together — a wedding portrait next to a padel
 * action shot next to a concert frame doesn't cohere into anything, no
 * matter how good the individual photos score. Clusters by capture-time
 * gaps (a multi-hour gap is a reasonable proxy for "different session"
 * without attempting real event/subject classification, which this
 * pipeline deliberately doesn't do — see derivePosterData) and keeps
 * whichever cluster contains the single best-scored photo, since that's
 * the one the hero uses regardless.
 */
function restrictToCoherentSession(pool: PhotoResult[]): PhotoResult[] {
  const withTime = pool.filter((p): p is PhotoResult & { captureTime: Date } => p.captureTime != null);
  if (withTime.length < 2) return pool;

  const sorted = [...withTime].sort((a, b) => a.captureTime.getTime() - b.captureTime.getTime());
  const clusters: PhotoResult[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].captureTime.getTime() - sorted[i - 1].captureTime.getTime();
    if (gap > SESSION_GAP_MS) clusters.push([]);
    clusters[clusters.length - 1].push(sorted[i]);
  }

  if (clusters.length <= 1) return pool;

  const topPhoto = pool[0];
  const winningCluster = clusters.find((c) => c.includes(topPhoto)) ?? clusters[0];
  return winningCluster.sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
}

function avgTagConfidence(photos: PhotoResult[], key: string): number {
  if (photos.length === 0) return 0;
  const sum = photos.reduce((acc, p) => acc + (p.semanticTags?.find((t) => t.key === key)?.confidence ?? 0), 0);
  return sum / photos.length;
}

/** A stylistic "mood" label for choosing template colors/typography — not a scene/content claim, purely derived from the color/contrast signals the pipeline already measures. */
function deriveMood(photos: PhotoResult[]): PosterMood {
  const bw = avgTagConfidence(photos, 'bw');
  const vivid = avgTagConfidence(photos, 'vividColor');
  const warm = avgTagConfidence(photos, 'warmColor');
  const cool = avgTagConfidence(photos, 'coolColor');

  if (bw >= 0.4) return 'monochrome';
  if (vivid >= 0.35) return 'colorful';
  if (warm > cool && warm >= 0.25) return 'warm';
  if (cool > warm && cool >= 0.25) return 'cool';
  return 'minimal';
}

/** Reuses the same face-count-derived tags the semantic filters already expose — no new detection, just picking the most common formation across the gallery selection. */
function derivePeopleFormat(photos: PhotoResult[]): PosterPeopleFormat {
  const crowd = avgTagConfidence(photos, 'crowdLikely');
  const group = avgTagConfidence(photos, 'groupPhotoLikely');
  const avgFaces = photos.reduce((acc, p) => acc + (p.facesDetected ?? 0), 0) / Math.max(1, photos.length);

  if (avgFaces < 0.3) return 'none';
  if (crowd >= 0.4 || group >= 0.4) return 'group';
  if (avgFaces >= 1.5 && avgFaces < 2.5) return 'couple';
  return 'single';
}

function formatDateRange(photos: PhotoResult[]): string | null {
  const dates = photos
    .map((p) => p.captureTime)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return null;

  const first = dates[0];
  const last = dates[dates.length - 1];
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  if (first.toDateString() === last.toDateString()) return fmt(first);
  const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  return `${fmtShort(first)} – ${fmt(last)}`;
}

/**
 * Builds everything a poster template needs from an already-analyzed,
 * already-selected batch of photos: hero + gallery picks (by existing
 * overallScore, no new ranking logic), a photo-derived color palette, and
 * a mood/people-format label from signals the pipeline already computes.
 * Deliberately does not attempt real event-type classification (wedding
 * vs. business vs. concert, ...) — there's no reliable local model for
 * that; `purpose` (the profile already chosen for this run) is the
 * intentional stand-in, reusing what the user already told the app
 * instead of guessing.
 */
export function derivePosterData(
  photos: PhotoResult[],
  purpose: Purpose,
  titleText: string,
  preferDarkPalette: boolean,
): PosterData | null {
  const candidates = photos
    .filter((p) => p.status === 'done' && (p.isSelected || p.isPreselected))
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));

  const pool = candidates.length > 0 ? candidates : photos.filter((p) => p.status === 'done');
  if (pool.length === 0) return null;

  const coherentPool = restrictToCoherentSession(pool);
  const galleryPhotos = coherentPool.slice(0, MAX_GALLERY_PHOTOS);
  const heroPhoto = galleryPhotos[0];

  const avgColors: RgbColor[] = galleryPhotos
    .map((p) => p.colorStats)
    .filter((c): c is NonNullable<PhotoResult['colorStats']> => c != null)
    .map((c) => ({ r: c.avgR, g: c.avgG, b: c.avgB }));

  return {
    purpose,
    titleText,
    dateText: formatDateRange(galleryPhotos),
    // The coherent subset, not the whole pool -- claiming "12 photos" on a
    // poster that's actually only drawing from 5 of them (the rest being a
    // different session entirely) would misrepresent what the poster is.
    photoCountText: `${coherentPool.length}`,
    mood: deriveMood(galleryPhotos),
    peopleFormat: derivePeopleFormat(galleryPhotos),
    palette: buildPalette(avgColors, preferDarkPalette),
    heroPhoto,
    galleryPhotos,
  };
}
