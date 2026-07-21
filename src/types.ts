export type Purpose = 'instagram' | 'kunde' | 'portfolio' | 'sonstiges';

export const PURPOSE_VALUES: Purpose[] = ['instagram', 'kunde', 'portfolio', 'sonstiges'];

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

  hash?: bigint;

  groupId?: number;
  groupRank?: number; // 1 = best in its group
  groupSize?: number;

  overallScore?: number; // 0-100

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
