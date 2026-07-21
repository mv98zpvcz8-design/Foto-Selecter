import { extractPreview } from './rawPreview';
import { extractExifMeta } from './exifMeta';
import { analyzeImage } from './imageAnalysis';
import { computeDHash } from './perceptualHash';
import { analyzeFacesSafe } from './faceAnalysis';
import { scorePhotos, selectTopN, selectTriage } from './scoring';
import { generateLightroomSuggestions } from './lightroomSuggestions';
import { assignCarouselPositions } from './carousel';
import {
  ERR_CANVAS_UNAVAILABLE,
  ERR_IMAGE_LOAD,
  ERR_NO_PREVIEW,
  ERR_PREVIEW_LOAD,
  type PipelineErrorCode,
} from './errorCodes';
import type { PhotoResult, Purpose, SelectionConfig, WeightProfile } from '../types';

const ERROR_KEY_BY_CODE: Record<PipelineErrorCode, string> = {
  [ERR_NO_PREVIEW]: 'error.noPreview',
  [ERR_PREVIEW_LOAD]: 'error.previewLoadFailed',
  [ERR_CANVAS_UNAVAILABLE]: 'error.canvasUnavailable',
  [ERR_IMAGE_LOAD]: 'error.imageLoadFailed',
};

export interface CancelToken {
  cancelled: boolean;
}

/**
 * Fallback selective-focus signal when no face was detected: if one tile
 * of the 3x3 grid is far sharper than the frame's median tile (e.g. a
 * product/macro shot with a deliberately soft background), treat that as
 * evidence of intentional selective focus rather than accidental blur.
 * Discounted relative to a confirmed face match since it's weaker
 * evidence (could just be a sharp edge/highlight, not a real subject).
 */
function tileBasedSubjectSharpness(tileSharpnessRaw: number[]): number | undefined {
  if (tileSharpnessRaw.length < 4) return undefined;
  const sorted = [...tileSharpnessRaw].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  if (median > 0 && max > median * 3) {
    return max * 0.7;
  }
  return undefined;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createInitialPhotoResults(files: File[]): PhotoResult[] {
  return files.map((file, i) => ({
    id: `${i}-${file.name}-${file.size}`,
    file,
    name: file.name,
    status: 'pending',
  }));
}

/**
 * Runs the per-photo pipeline (preview extraction, blur/exposure/face
 * analysis, perceptual hash) sequentially so the UI thread stays
 * responsive and progress can be reported, then scores and pre-selects
 * the whole batch using the given (already-resolved) weight profile.
 * Photos already marked 'done' or 'error' are skipped, so re-running
 * after the user goes back to change purpose/target count only redoes
 * the cheap scoring step, not the expensive extraction. Checks
 * `cancelToken.cancelled` between photos so a user-triggered cancel
 * (going back mid-analysis) stops further work promptly; already
 * in-flight work for the current photo is not aborted, just not scored.
 */
export async function runPipeline(
  photos: PhotoResult[],
  weights: WeightProfile,
  styleHint: Purpose,
  selection: SelectionConfig,
  onProgress: (done: number, total: number) => void,
  cancelToken: CancelToken = { cancelled: false },
): Promise<PhotoResult[]> {
  for (let i = 0; i < photos.length; i++) {
    if (cancelToken.cancelled) return photos;

    const photo = photos[i];
    if (photo.status === 'done' || photo.status === 'error') {
      onProgress(i + 1, photos.length);
      continue;
    }

    photo.status = 'processing';
    try {
      const preview = await extractPreview(photo.file);
      photo.previewUrl = preview.url;
      photo.previewWidth = preview.width;
      photo.previewHeight = preview.height;

      const [meta, analysis, hash, faces] = await Promise.all([
        extractExifMeta(photo.file),
        analyzeImage(preview.url),
        computeDHash(preview.url),
        analyzeFacesSafe(preview.url),
      ]);

      photo.captureTime = meta.captureTime;
      photo.camera = meta.camera;
      photo.sharpnessRaw = analysis.sharpnessRaw;
      photo.shadowClipping = analysis.shadowClipping;
      photo.highlightClipping = analysis.highlightClipping;
      photo.meanLuminance = analysis.meanLuminance;
      photo.hash = hash;
      photo.facesDetected = faces.facesDetected;
      photo.facesWithClosedEyes = faces.facesWithClosedEyes;

      const subjectSharpnessRaw = faces.subjectSharpnessRaw ?? tileBasedSubjectSharpness(analysis.tileSharpnessRaw);
      photo.subjectSharpnessRaw = subjectSharpnessRaw;
      photo.selectiveFocusDetected = subjectSharpnessRaw != null && subjectSharpnessRaw > analysis.sharpnessRaw * 1.3;

      photo.status = 'done';
    } catch (err) {
      photo.status = 'error';
      const code = err instanceof Error ? (err.message as PipelineErrorCode) : undefined;
      photo.errorKey = (code && ERROR_KEY_BY_CODE[code]) || 'error.unknown';
    }

    onProgress(i + 1, photos.length);
    await yieldToUi();
  }

  if (cancelToken.cancelled) return photos;

  scorePhotos(photos, weights);
  if (selection.mode === 'triage') {
    selectTriage(photos);
  } else {
    selectTopN(photos, selection.targetCount);
  }

  for (const photo of photos) {
    if (photo.isPreselected) {
      photo.lightroomSuggestions = generateLightroomSuggestions(photo, styleHint);
    }
  }

  if (styleHint === 'instagram') {
    assignCarouselPositions(photos);
  } else {
    for (const photo of photos) photo.carouselPosition = undefined;
  }

  return photos;
}
