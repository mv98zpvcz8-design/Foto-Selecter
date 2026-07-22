import { extractPreview } from './rawPreview';
import { extractExifMeta } from './exifMeta';
import { analyzeImage, createThumbnailBlob } from './imageAnalysis';
import { computeDHash } from './perceptualHash';
import { analyzeFacesSafe } from './faceAnalysis';
import { analyzeInWorker, isWorkerAnalysisSupported, type WorkerAnalysisResult } from './workerPool';
import { scorePhotos, selectTopN, selectTriage } from './scoring';
import { generateLightroomSuggestions } from './lightroomSuggestions';
import { assignCarouselPositions } from './carousel';
import { deriveSemanticTags } from './semanticTags';
import { analysisCacheKey, applyCachedAnalysis, loadAnalysis, saveAnalysis } from './analysisCache';
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

const WORKERS_SUPPORTED = isWorkerAnalysisSupported();
// With workers, several photos' pixel-crunching runs in parallel threads
// instead of one at a time on the main thread — this is what keeps a
// 100+ photo batch from freezing the UI. Without worker support we fall
// back to today's single-lane, main-thread path.
const CONCURRENCY = WORKERS_SUPPORTED ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2)) : 1;

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

async function runPixelAnalysis(previewUrl: string): Promise<WorkerAnalysisResult> {
  if (WORKERS_SUPPORTED) {
    try {
      return await analyzeInWorker(previewUrl);
    } catch {
      // fall through to main-thread path if this particular job failed
      // (e.g. the worker choked on a malformed preview) — one bad photo
      // shouldn't take the whole batch off the fast path.
    }
  }
  const [analysis, hash] = await Promise.all([analyzeImage(previewUrl), computeDHash(previewUrl)]);
  return { ...analysis, hash };
}

/**
 * Runs the per-photo pipeline (preview extraction, blur/exposure/face
 * analysis, perceptual hash) with up to CONCURRENCY photos in flight at
 * once — the sharpness/exposure/hash crunching happens in pooled Web
 * Workers when available, so large batches don't compete with the UI
 * thread for every frame decode/convolution — then scores and
 * pre-selects the whole batch using the given (already-resolved) weight
 * profile. Photos already marked 'done' or 'error' are skipped, so
 * re-running after the user goes back to change purpose/target count
 * only redoes the cheap scoring step, not the expensive extraction.
 * Checks `cancelToken.cancelled` between photos so a user-triggered
 * cancel (going back mid-analysis) stops further work promptly;
 * already in-flight work is not aborted, just not scored.
 */
export async function runPipeline(
  photos: PhotoResult[],
  weights: WeightProfile,
  styleHint: Purpose,
  selection: SelectionConfig,
  onProgress: (done: number, total: number) => void,
  cancelToken: CancelToken = { cancelled: false },
): Promise<PhotoResult[]> {
  let nextIndex = 0;
  let completed = 0;

  async function processPhoto(photo: PhotoResult): Promise<void> {
    if (photo.status === 'done' || photo.status === 'error') return;

    photo.status = 'processing';
    try {
      const preview = await extractPreview(photo.file);
      photo.previewUrl = preview.url;
      photo.previewWidth = preview.width;
      photo.previewHeight = preview.height;

      if (preview.width && preview.height) {
        photo.orientation =
          preview.width === preview.height ? 'square' : preview.width > preview.height ? 'landscape' : 'portrait';
      }

      // If this exact file (by name+size) was already fully analyzed in a
      // prior session that got interrupted (tab closed, browser crashed,
      // reload), skip straight past the expensive pixel/face analysis —
      // only the thumbnail needs regenerating since blob URLs don't
      // survive a reload. This is what makes resuming a 1000+ photo shoot
      // fast instead of redoing hours of face detection from scratch.
      const cached = await loadAnalysis(analysisCacheKey(photo.file));
      if (cached) {
        photo.thumbnailUrl = URL.createObjectURL(await createThumbnailBlob(preview.url));
        applyCachedAnalysis(photo, cached);
        photo.status = 'done';
        return;
      }

      const [meta, analysis, faces] = await Promise.all([
        extractExifMeta(photo.file),
        runPixelAnalysis(preview.url),
        analyzeFacesSafe(preview.url),
      ]);

      photo.captureTime = meta.captureTime;
      photo.camera = meta.camera;
      photo.lens = meta.lens;
      photo.focalLengthMm = meta.focalLengthMm;
      photo.iso = meta.iso;
      photo.shutterSpeedSec = meta.shutterSpeedSec;
      photo.aperture = meta.aperture;
      photo.sharpnessRaw = analysis.sharpnessRaw;
      photo.shadowClipping = analysis.shadowClipping;
      photo.highlightClipping = analysis.highlightClipping;
      photo.meanLuminance = analysis.meanLuminance;
      photo.hash = analysis.hash;
      photo.colorStats = analysis.colorStats;
      photo.motionBlurRatio = analysis.motionBlurRatio;
      photo.thumbnailUrl = URL.createObjectURL(analysis.thumbnailBlob);
      photo.facesDetected = faces.facesDetected;
      photo.facesWithClosedEyes = faces.facesWithClosedEyes;
      photo.facesLookingAtCamera = faces.facesLookingAtCamera;
      photo.emotionScores = faces.emotionScores;

      const subjectSharpnessRaw = faces.subjectSharpnessRaw ?? tileBasedSubjectSharpness(analysis.tileSharpnessRaw);
      photo.subjectSharpnessRaw = subjectSharpnessRaw;
      photo.selectiveFocusDetected = subjectSharpnessRaw != null && subjectSharpnessRaw > analysis.sharpnessRaw * 1.3;

      photo.status = 'done';
      void saveAnalysis(photo);
    } catch (err) {
      photo.status = 'error';
      const code = err instanceof Error ? (err.message as PipelineErrorCode) : undefined;
      photo.errorKey = (code && ERROR_KEY_BY_CODE[code]) || 'error.unknown';
    }
  }

  async function lane(): Promise<void> {
    while (nextIndex < photos.length) {
      if (cancelToken.cancelled) return;
      const photo = photos[nextIndex++];
      await processPhoto(photo);
      completed++;
      onProgress(completed, photos.length);
      await yieldToUi();
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => lane()));

  if (cancelToken.cancelled) return photos;

  scorePhotos(photos, weights);
  if (selection.mode === 'triage') {
    selectTriage(photos);
  } else {
    selectTopN(photos, selection.targetCount);
  }

  for (const photo of photos) {
    if (photo.status !== 'done') continue;
    photo.semanticTags = deriveSemanticTags(photo);
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
