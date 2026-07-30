export type Purpose =
  | 'instagram'
  | 'kunde'
  | 'portfolio'
  | 'video'
  | 'presse'
  | 'event'
  | 'sport'
  | 'favoriten'
  | 'sonstiges';

export const PURPOSE_VALUES: Purpose[] = [
  'instagram',
  'kunde',
  'portfolio',
  'video',
  'presse',
  'event',
  'sport',
  'favoriten',
  'sonstiges',
];

export type SelectionMode = 'topN' | 'triage';
export type Tier = 'edit' | 'potential' | 'skip';
export type SelectionConfig = { mode: 'topN'; targetCount: number } | { mode: 'triage' };

export interface WeightProfile {
  sharpness: number;
  exposure: number;
  group: number;
  faces: number;
}

export interface CustomPreset {
  id: string;
  name: string;
  weights: WeightProfile;
  styleHint: Purpose; // which built-in flavor to borrow Lightroom finishing touches from
}

export type ProfileRef = { kind: 'builtin'; purpose: Purpose } | { kind: 'custom'; presetId: string };

export type PhotoStatus = 'pending' | 'processing' | 'done' | 'error';

export interface PhotoResult {
  id: string;
  file: File;
  name: string;
  status: PhotoStatus;
  errorKey?: string; // translation key, e.g. "error.noPreview"

  previewUrl?: string;
  previewWidth?: number;
  previewHeight?: number;
  /** Small downscaled JPEG for grid display — reused from the analysis canvas, not a fresh full-preview decode. */
  thumbnailUrl?: string;

  captureTime?: Date | null;
  camera?: string;
  lens?: string;
  focalLengthMm?: number;
  iso?: number;
  shutterSpeedSec?: number;
  aperture?: number; // f-number

  sharpnessRaw?: number; // whole-frame Laplacian variance
  subjectSharpnessRaw?: number; // sharpest local region (face, or a tile far above the frame's median) — catches shallow-DOF/bokeh
  selectiveFocusDetected?: boolean; // subjectSharpnessRaw meaningfully exceeds sharpnessRaw: likely deliberate, not accidental blur
  sharpnessScore?: number; // 0-100, normalized across the batch
  exposureScore?: number; // 0-100
  shadowClipping?: number; // fraction 0-1
  highlightClipping?: number; // fraction 0-1
  meanLuminance?: number; // 0-255

  facesDetected?: number;
  facesWithClosedEyes?: number;
  facesLookingAtCamera?: number; // coarse frontal-face heuristic, not a real gaze estimate
  subjectCenter?: { x: number; y: number }; // avg face-box center, normalized 0-1; used to crop toward the subject instead of blind center-crop
  faceScore?: number; // 0-100; neutral 100 when no faces detected
  motionBlurRatio?: number; // directional gradient-energy imbalance; >>1 suggests directional (motion) blur

  hash?: bigint;

  groupId?: number;
  groupRank?: number; // 1 = best in its group
  groupSize?: number;
  groupBonusScore?: number; // 0-100, pre-weighting

  overallScore?: number; // 0-100
  appliedWeights?: WeightProfile; // the weights actually used to compute overallScore

  isPreselected?: boolean;
  isSelected?: boolean; // user-controlled, defaults to isPreselected

  lightroomSuggestions?: LightroomSuggestion[];

  carouselPosition?: number; // 1-based; only set when the active style is Instagram

  tier?: Tier; // only set in 'triage' selection mode

  isFavorite?: boolean; // user-controlled bookmark, independent of purpose/selection

  orientation?: 'portrait' | 'landscape' | 'square';
  colorStats?: { avgR: number; avgG: number; avgB: number; channelDiffMean: number; contrast: number };
  emotionScores?: Partial<Record<EmotionKey, number>>; // face-api expression output, averaged across detected faces
  semanticTags?: SemanticTag[]; // derived filter-matchable tags with confidence, see lib/semanticTags.ts
}

export type EmotionKey = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral';

/**
 * Vocabulary of automatically-derived, locally-computable photo
 * properties that the semantic filters and natural-language search can
 * match against. Deliberately excludes anything that would need real
 * scene/object recognition (sport type, specific gestures, branding,
 * known people, ...) — there's no reliable local model for that here, and
 * a confidence number would be invented rather than measured.
 */
export type SemanticTagKey =
  | 'bw'
  | 'color'
  | 'vividColor'
  | 'warmColor'
  | 'coolColor'
  | 'highContrast'
  | 'lowContrast'
  | 'bright'
  | 'dark'
  | 'lowLight'
  | 'backlight'
  | 'motionBlur'
  | 'freezeMotion'
  | 'sharp'
  | 'verySharp'
  | 'slightlySoft'
  | 'blurry'
  | 'overexposed'
  | 'underexposed'
  | 'eyesSharp'
  | 'faceSharp'
  | 'mainSubjectSharp'
  | 'raw'
  | 'jpeg'
  | 'emotion'
  | 'joy'
  | 'sadness'
  | 'surprise'
  | 'anger'
  | 'closedEyes'
  | 'faceOccludedLikely'
  | 'singlePerson'
  | 'multiplePersons'
  | 'crowdLikely'
  | 'portraitLikely'
  | 'groupPhotoLikely'
  | 'uniqueInSeries';

export interface SemanticTag {
  key: SemanticTagKey;
  confidence: number; // 0-1
}

export type SuggestionKind =
  | 'highlights'
  | 'shadows'
  | 'exposureLow'
  | 'exposureHigh'
  | 'sharpening'
  | 'portfolioClarity'
  | 'portfolioTexture'
  | 'portfolioCrop'
  | 'instaVibrance'
  | 'instaToneCurve'
  | 'instaVignette'
  | 'kundeWhiteBalance'
  | 'kundeToneCurve'
  | 'videoDenoise'
  | 'videoSharpening'
  | 'sportDehaze'
  | 'sportCrop'
  | 'eventWhiteBalance'
  | 'eventToneCurve'
  | 'presseToneCurve'
  | 'presseSharpening'
  | 'defaultToneCurve';

export interface LightroomSuggestion {
  slider: string; // English Lightroom control name, e.g. "Highlights / Whites" — never translated
  kind: SuggestionKind; // looked up as `lr.${kind}` for the localized explanation
  params?: { value?: number };
}

export type AppStep = 'upload' | 'config' | 'processing' | 'results';

export interface ProcessingProgress {
  done: number;
  total: number;
}

/**
 * Aggregated, anonymized numbers persisted per completed shoot so future
 * runs can compare trends ("ist meine Schärfequote gestiegen?"). Contains
 * no photos, previews, file names, or face data — just counts, rates, and
 * averages — to stay inside the app's no-unnecessary-storage principle.
 */
export interface ShootingSnapshot {
  id: string;
  completedAt: number; // epoch ms
  purpose: Purpose;
  photoCount: number;
  selectedCount: number;
  selectionRate: number; // 0-1
  groupCount: number;
  avgGroupSize: number;
  avgOverallScore: number;
  avgSharpnessScore: number;
  avgExposureScore: number;
  portraitShare: number; // 0-1
  landscapeShare: number;
  bwShare: number;
  colorShare: number;
  closedEyesShare: number;
  overexposedShare: number;
  underexposedShare: number;
  motionBlurShare: number;
  emotionShare: number; // share of photos with a detected strong emotion
  focalLengthBuckets: Record<string, { count: number; avgSharpnessScore: number }>;
}

// --- Learn My Style (local, incremental preference learning) ---

export type PreferenceProfileKey = 'general' | 'kunde' | 'instagram' | 'portfolio' | 'sport' | 'event';

export const PREFERENCE_PROFILE_KEYS: PreferenceProfileKey[] = [
  'general',
  'kunde',
  'instagram',
  'portfolio',
  'sport',
  'event',
];

export type PreferenceSignal =
  | 'selected'
  | 'rejected'
  | 'favorite'
  | 'unfavorite'
  | 'seriesWinner'
  | 'carouselUsed';

/**
 * Fixed, named feature vector extracted from a photo's already-computed
 * signals — no embeddings, no separate model. Every value is normalized
 * to roughly 0-1 so a simple weighted dot-product is a meaningful
 * similarity measure. See lib/preferenceLearning.ts.
 */
export interface PreferenceFeatures {
  sharpness: number;
  exposure: number;
  faces: number;
  portrait: number;
  landscape: number;
  square: number;
  bw: number;
  color: number;
  emotion: number;
  crowd: number;
  portraitLikely: number;
  groupPhoto: number;
  warm: number;
  cool: number;
  highContrast: number;
}

export type PreferenceStatus = 'insufficient' | 'early' | 'usable' | 'wellPersonalized';

/** Running weighted centroid of liked vs. disliked feature vectors for one profile — the whole "model". */
export interface PreferenceProfileState {
  profileKey: PreferenceProfileKey;
  likedSum: PreferenceFeatures;
  likedCount: number;
  dislikedSum: PreferenceFeatures;
  dislikedCount: number;
  updatedAt: number;
}

export interface PreferenceEventRecord {
  id: string;
  profileKey: PreferenceProfileKey;
  signal: PreferenceSignal;
  photoKey: string; // name+size, same convention as analysisCache
  recordedAt: number;
  excluded?: boolean; // user explicitly excluded this decision from learning
}
