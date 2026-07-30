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
  const portrait = avgTagConfidence(photos, 'portraitLikely');
  const avgFaces = photos.reduce((acc, p) => acc + (p.facesDetected ?? 0), 0) / Math.max(1, photos.length);

  if (avgFaces < 0.3) return 'none';
  if (crowd >= 0.4 || group >= 0.4) return 'group';
  if (avgFaces >= 1.5 && avgFaces < 2.5 && portrait < 0.5) return 'couple';
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

  const galleryPhotos = pool.slice(0, MAX_GALLERY_PHOTOS);
  const heroPhoto = galleryPhotos[0];

  const avgColors: RgbColor[] = galleryPhotos
    .map((p) => p.colorStats)
    .filter((c): c is NonNullable<PhotoResult['colorStats']> => c != null)
    .map((c) => ({ r: c.avgR, g: c.avgG, b: c.avgB }));

  return {
    purpose,
    titleText,
    dateText: formatDateRange(galleryPhotos),
    photoCountText: `${pool.length}`,
    mood: deriveMood(galleryPhotos),
    peopleFormat: derivePeopleFormat(galleryPhotos),
    palette: buildPalette(avgColors, preferDarkPalette),
    heroPhoto,
    galleryPhotos,
  };
}
