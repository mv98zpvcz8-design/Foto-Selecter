import { extractPreview } from './rawPreview';
import { extractExifMeta } from './exifMeta';
import { analyzeImage } from './imageAnalysis';
import { computeDHash } from './perceptualHash';
import { scorePhotos, selectTopN } from './scoring';
import { generateLightroomSuggestions } from './lightroomSuggestions';
import type { PhotoResult, Purpose } from '../types';

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
 * Runs the full per-photo pipeline (preview extraction, blur/exposure
 * analysis, perceptual hash) sequentially so the UI thread stays
 * responsive and progress can be reported, then scores and pre-selects
 * the whole batch. Mutates and returns the same array instances so the
 * caller can re-render incrementally if desired.
 */
export async function runPipeline(
  photos: PhotoResult[],
  purpose: Purpose,
  targetCount: number,
  onProgress: (done: number, total: number) => void,
): Promise<PhotoResult[]> {
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    photo.status = 'processing';
    try {
      const preview = await extractPreview(photo.file);
      photo.previewUrl = preview.url;
      photo.previewWidth = preview.width;
      photo.previewHeight = preview.height;

      const [meta, analysis, hash] = await Promise.all([
        extractExifMeta(photo.file),
        analyzeImage(preview.url),
        computeDHash(preview.url),
      ]);

      photo.captureTime = meta.captureTime;
      photo.camera = meta.camera;
      photo.sharpnessRaw = analysis.sharpnessRaw;
      photo.shadowClipping = analysis.shadowClipping;
      photo.highlightClipping = analysis.highlightClipping;
      photo.meanLuminance = analysis.meanLuminance;
      photo.hash = hash;
      photo.status = 'done';
    } catch (err) {
      photo.status = 'error';
      photo.error = err instanceof Error ? err.message : 'Unbekannter Fehler';
    }

    onProgress(i + 1, photos.length);
    await yieldToUi();
  }

  scorePhotos(photos, purpose);
  selectTopN(photos, targetCount);

  for (const photo of photos) {
    if (photo.isPreselected) {
      photo.lightroomSuggestions = generateLightroomSuggestions(photo, purpose);
    }
  }

  return photos;
}
