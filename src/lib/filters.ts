import type { PhotoResult, Purpose, SemanticTagKey } from '../types';

export interface FilterDef {
  key: string;
  labelKey: string;
  tagKey?: SemanticTagKey;
  negate?: boolean;
  orientation?: NonNullable<PhotoResult['orientation']>;
  favorite?: boolean;
  field?: 'overallScore' | 'sharpnessScore' | 'exposureScore';
  gte?: number;
  lte?: number;
  minConfidence?: number;
}

export interface FilterGroup {
  labelKey: string;
  filterKeys: string[];
}

export type FilterCombineMode = 'and' | 'or';

/**
 * The full vocabulary of filters the app can check, keyed by a stable id.
 * Each profile below only exposes a curated subset — the ones that are
 * both real (backed by an actual measured signal) and meaningful for that
 * kind of delivery. Filters needing real scene/object recognition (sport
 * type, specific gestures, branding, known people, ...) are intentionally
 * absent; see README "Bekannte Grenzen" for what that means in practice.
 */
export const FILTER_DEFS: Record<string, FilterDef> = {
  bw: { key: 'bw', labelKey: 'filter.bw', tagKey: 'bw' },
  color: { key: 'color', labelKey: 'filter.color', tagKey: 'color' },
  vividColor: { key: 'vividColor', labelKey: 'filter.vividColor', tagKey: 'vividColor' },
  warmColor: { key: 'warmColor', labelKey: 'filter.warmColor', tagKey: 'warmColor' },
  coolColor: { key: 'coolColor', labelKey: 'filter.coolColor', tagKey: 'coolColor' },
  highContrast: { key: 'highContrast', labelKey: 'filter.highContrast', tagKey: 'highContrast' },
  lowContrast: { key: 'lowContrast', labelKey: 'filter.lowContrast', tagKey: 'lowContrast' },
  bright: { key: 'bright', labelKey: 'filter.bright', tagKey: 'bright' },
  dark: { key: 'dark', labelKey: 'filter.dark', tagKey: 'dark' },
  lowLight: { key: 'lowLight', labelKey: 'filter.lowLight', tagKey: 'lowLight' },
  backlight: { key: 'backlight', labelKey: 'filter.backlight', tagKey: 'backlight' },
  motionBlur: { key: 'motionBlur', labelKey: 'filter.motionBlur', tagKey: 'motionBlur' },
  freezeMotion: { key: 'freezeMotion', labelKey: 'filter.freezeMotion', tagKey: 'freezeMotion' },

  verySharp: { key: 'verySharp', labelKey: 'filter.verySharp', field: 'sharpnessScore', gte: 85 },
  sharp: { key: 'sharp', labelKey: 'filter.sharp', field: 'sharpnessScore', gte: 60 },
  slightlySoft: { key: 'slightlySoft', labelKey: 'filter.slightlySoft', field: 'sharpnessScore', gte: 40, lte: 59 },
  blurry: { key: 'blurry', labelKey: 'filter.blurry', field: 'sharpnessScore', lte: 39 },
  overexposed: { key: 'overexposed', labelKey: 'filter.overexposed', tagKey: 'overexposed' },
  underexposed: { key: 'underexposed', labelKey: 'filter.underexposed', tagKey: 'underexposed' },
  faceSharp: { key: 'faceSharp', labelKey: 'filter.faceSharp', tagKey: 'faceSharp' },
  eyesSharp: { key: 'eyesSharp', labelKey: 'filter.eyesSharp', tagKey: 'eyesSharp' },
  mainSubjectSharp: { key: 'mainSubjectSharp', labelKey: 'filter.mainSubjectSharp', tagKey: 'mainSubjectSharp' },
  noClosedEyes: { key: 'noClosedEyes', labelKey: 'filter.noClosedEyes', tagKey: 'closedEyes', negate: true },
  noFaceOccluded: { key: 'noFaceOccluded', labelKey: 'filter.noFaceOccluded', tagKey: 'faceOccludedLikely', negate: true },
  portraitOrientation: { key: 'portraitOrientation', labelKey: 'filter.portraitOrientation', orientation: 'portrait' },
  landscapeOrientation: { key: 'landscapeOrientation', labelKey: 'filter.landscapeOrientation', orientation: 'landscape' },
  squareOrientation: { key: 'squareOrientation', labelKey: 'filter.squareOrientation', orientation: 'square' },
  raw: { key: 'raw', labelKey: 'filter.raw', tagKey: 'raw' },
  jpeg: { key: 'jpeg', labelKey: 'filter.jpeg', tagKey: 'jpeg' },
  uniqueInSeries: { key: 'uniqueInSeries', labelKey: 'filter.uniqueInSeries', tagKey: 'uniqueInSeries' },

  emotion: { key: 'emotion', labelKey: 'filter.emotion', tagKey: 'emotion' },
  joy: { key: 'joy', labelKey: 'filter.joy', tagKey: 'joy' },
  sadness: { key: 'sadness', labelKey: 'filter.sadness', tagKey: 'sadness' },
  surprise: { key: 'surprise', labelKey: 'filter.surprise', tagKey: 'surprise' },
  anger: { key: 'anger', labelKey: 'filter.anger', tagKey: 'anger' },
  singlePerson: { key: 'singlePerson', labelKey: 'filter.singlePerson', tagKey: 'singlePerson' },
  multiplePersons: { key: 'multiplePersons', labelKey: 'filter.multiplePersons', tagKey: 'multiplePersons' },
  crowdLikely: { key: 'crowdLikely', labelKey: 'filter.crowdLikely', tagKey: 'crowdLikely' },
  portraitLikely: { key: 'portraitLikely', labelKey: 'filter.portraitLikely', tagKey: 'portraitLikely' },
  groupPhotoLikely: { key: 'groupPhotoLikely', labelKey: 'filter.groupPhotoLikely', tagKey: 'groupPhotoLikely' },

  onlyFavorites: { key: 'onlyFavorites', labelKey: 'filter.onlyFavorites', favorite: true },
  highScore: { key: 'highScore', labelKey: 'filter.highScore', field: 'overallScore', gte: 80 },
};

const GROUP_COLOR_STYLE = ['bw', 'color', 'vividColor', 'warmColor', 'coolColor', 'highContrast', 'lowContrast', 'bright', 'dark', 'lowLight', 'backlight', 'motionBlur', 'freezeMotion'];
const GROUP_TECHNICAL = ['verySharp', 'sharp', 'slightlySoft', 'blurry', 'overexposed', 'underexposed', 'faceSharp', 'eyesSharp', 'mainSubjectSharp', 'noClosedEyes', 'noFaceOccluded', 'portraitOrientation', 'landscapeOrientation', 'squareOrientation', 'raw', 'jpeg', 'uniqueInSeries'];
const GROUP_PEOPLE = ['emotion', 'joy', 'sadness', 'surprise', 'anger', 'singlePerson', 'multiplePersons', 'crowdLikely', 'portraitLikely', 'groupPhotoLikely'];

function groups(entries: [string, string[]][]): FilterGroup[] {
  return entries
    .map(([labelKey, keys]) => ({ labelKey, filterKeys: keys.filter((k) => k in FILTER_DEFS) }))
    .filter((g) => g.filterKeys.length > 0);
}

/**
 * Which filters show up inside each selection profile's own view, and in
 * what grouping. This is the "filters live inside the profile" structure —
 * there is no separate global filter panel.
 */
export const PROFILE_FILTER_GROUPS: Record<Purpose, FilterGroup[]> = {
  kunde: groups([
    ['filterGroup.peopleEmotion', ['emotion', 'crowdLikely', 'portraitLikely', 'groupPhotoLikely', 'singlePerson', 'multiplePersons']],
    ['filterGroup.technical', ['sharp', 'noClosedEyes', 'noFaceOccluded', 'portraitOrientation', 'landscapeOrientation']],
    ['filterGroup.colorStyle', ['bw', 'color']],
    ['filterGroup.score', ['highScore']],
  ]),
  instagram: groups([
    ['filterGroup.peopleEmotion', ['emotion', 'joy', 'crowdLikely']],
    ['filterGroup.colorStyle', ['bw', 'color', 'vividColor']],
    ['filterGroup.technical', ['portraitOrientation', 'squareOrientation']],
    ['filterGroup.score', ['highScore']],
  ]),
  portfolio: groups([
    ['filterGroup.technical', ['verySharp', 'sharp', 'faceSharp', 'uniqueInSeries', 'highContrast', 'lowContrast']],
    ['filterGroup.colorStyle', ['bw', 'color']],
    ['filterGroup.peopleEmotion', ['portraitLikely']],
    ['filterGroup.score', ['highScore']],
  ]),
  video: groups([
    ['filterGroup.technical', ['verySharp', 'sharp', 'mainSubjectSharp', 'motionBlur', 'freezeMotion']],
    ['filterGroup.score', ['highScore']],
  ]),
  sport: groups([
    ['filterGroup.technical', ['freezeMotion', 'motionBlur', 'verySharp', 'sharp', 'mainSubjectSharp']],
    ['filterGroup.peopleEmotion', ['emotion', 'singlePerson', 'multiplePersons', 'crowdLikely']],
    ['filterGroup.score', ['highScore']],
  ]),
  event: groups([
    ['filterGroup.peopleEmotion', ['crowdLikely', 'groupPhotoLikely', 'emotion', 'joy', 'multiplePersons']],
    ['filterGroup.colorStyle', ['bw', 'color']],
    ['filterGroup.technical', ['portraitOrientation', 'landscapeOrientation']],
    ['filterGroup.score', ['highScore']],
  ]),
  presse: groups([
    ['filterGroup.technical', ['sharp', 'faceSharp', 'noClosedEyes']],
    ['filterGroup.peopleEmotion', ['emotion', 'crowdLikely']],
    ['filterGroup.colorStyle', ['bw', 'color']],
    ['filterGroup.score', ['highScore']],
  ]),
  favoriten: groups([
    ['filterGroup.score', ['onlyFavorites']],
    ['filterGroup.technical', ['sharp', 'portraitOrientation', 'landscapeOrientation']],
    ['filterGroup.colorStyle', ['bw', 'color']],
  ]),
  sonstiges: groups([
    ['filterGroup.colorStyle', GROUP_COLOR_STYLE],
    ['filterGroup.technical', GROUP_TECHNICAL],
    ['filterGroup.peopleEmotion', GROUP_PEOPLE],
    ['filterGroup.score', ['highScore', 'onlyFavorites']],
  ]),
};

export function filterMatches(photo: PhotoResult, def: FilterDef): boolean {
  let present: boolean;
  if (def.favorite) {
    present = !!photo.isFavorite;
  } else if (def.orientation) {
    present = photo.orientation === def.orientation;
  } else if (def.field) {
    const value = photo[def.field] ?? 0;
    present = (def.gte == null || value >= def.gte) && (def.lte == null || value <= def.lte);
  } else if (def.tagKey) {
    const confidence = photo.semanticTags?.find((t) => t.key === def.tagKey)?.confidence ?? 0;
    present = confidence >= (def.minConfidence ?? 0.5);
  } else {
    present = true;
  }
  return def.negate ? !present : present;
}

export function matchesActiveFilters(photo: PhotoResult, activeKeys: string[], mode: FilterCombineMode): boolean {
  if (activeKeys.length === 0) return true;
  const defs = activeKeys.map((k) => FILTER_DEFS[k]).filter((d): d is FilterDef => !!d);
  if (defs.length === 0) return true;
  return mode === 'and' ? defs.every((d) => filterMatches(photo, d)) : defs.some((d) => filterMatches(photo, d));
}

/** Confidence badges are only useful for probabilistic tags — deterministic checks (orientation, score, favorite) never show one. */
export function filterConfidenceFor(photo: PhotoResult, key: string): number | undefined {
  const def = FILTER_DEFS[key];
  if (!def?.tagKey) return undefined;
  return photo.semanticTags?.find((t) => t.key === def.tagKey)?.confidence;
}
