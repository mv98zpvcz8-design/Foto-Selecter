export type Purpose = 'instagram' | 'kunde' | 'portfolio' | 'sonstiges';

export const PURPOSE_VALUES: Purpose[] = ['instagram', 'kunde', 'portfolio', 'sonstiges'];

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

  captureTime?: Date | null;
  camera?: string;

  sharpnessRaw?: number;
  sharpnessScore?: number; // 0-100, normalized across the batch
  exposureScore?: number; // 0-100
  shadowClipping?: number; // fraction 0-1
  highlightClipping?: number; // fraction 0-1
  meanLuminance?: number; // 0-255

  facesDetected?: number;
  facesWithClosedEyes?: number;
  faceScore?: number; // 0-100; neutral 100 when no faces detected

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
  | 'defaultToneCurve';

export interface LightroomSuggestion {
  slider: string; // English Lightroom control name, e.g. "Highlights / Whites" — never translated
  kind: SuggestionKind; // looked up as `lr.${kind}` for the localized explanation
  params?: { percent?: number };
}

export type AppStep = 'upload' | 'config' | 'processing' | 'results';

export interface ProcessingProgress {
  done: number;
  total: number;
}
