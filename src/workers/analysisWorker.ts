import {
  ANALYSIS_MAX_DIM,
  HASH_HEIGHT,
  HASH_WIDTH,
  TILE_GRID,
  colorStats,
  dHashFromGrayscale,
  directionalGradientEnergy,
  exposureStats,
  laplacianVariance,
  rgbaToGrayscale,
  tileSharpness,
  type ColorStats,
} from '../lib/pixelMath';

interface AnalysisJob {
  id: number;
  url: string;
}

interface AnalysisSuccess {
  id: number;
  sharpnessRaw: number;
  tileSharpnessRaw: number[];
  shadowClipping: number;
  highlightClipping: number;
  meanLuminance: number;
  hash: bigint;
  colorStats: ColorStats;
  motionBlurRatio: number;
  thumbnailBlob: Blob;
}

interface AnalysisFailure {
  id: number;
  error: string;
}

/**
 * Runs the CPU-heavy, DOM-independent part of the pipeline (sharpness,
 * exposure, perceptual hash) off the main thread via OffscreenCanvas, so
 * large batches (100+ photos) don't compete with the UI thread for every
 * frame decode/convolution. Preview extraction (exifr) and face detection
 * stay on the main thread — see lib/workerPool.ts for the fallback used
 * when Workers/OffscreenCanvas aren't available.
 */
self.onmessage = async (e: MessageEvent<AnalysisJob>) => {
  const { id, url } = e.data;
  try {
    const blob = await fetch(url).then((r) => r.blob());
    const bitmap = await createImageBitmap(blob);

    const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const gray = rgbaToGrayscale(data);

    const sharpnessRaw = laplacianVariance(gray, width, height);
    const tileSharpnessRaw = tileSharpness(gray, width, height, TILE_GRID);
    const { shadowClipping, highlightClipping, meanLuminance } = exposureStats(gray);
    const colors = colorStats(data, gray);
    const gradientEnergy = directionalGradientEnergy(gray, width, height);
    const motionBlurRatio =
      Math.max(gradientEnergy.horizontal, gradientEnergy.vertical) /
      Math.max(Math.min(gradientEnergy.horizontal, gradientEnergy.vertical), 1e-6);

    const hashCanvas = new OffscreenCanvas(HASH_WIDTH, HASH_HEIGHT);
    const hashCtx = hashCanvas.getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
    hashCtx.drawImage(bitmap, 0, 0, HASH_WIDTH, HASH_HEIGHT);
    const hashData = hashCtx.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT).data;
    const hash = dHashFromGrayscale(rgbaToGrayscale(hashData));

    bitmap.close();

    // Reuses the already-downscaled analysis canvas (<=ANALYSIS_MAX_DIM on
    // the long side) as the grid thumbnail — no extra decode/resize pass,
    // and it keeps large batches (100s-1000+ photos) from holding a
    // full-resolution embedded preview per visible grid card.
    const thumbnailBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 });

    const result: AnalysisSuccess = {
      id,
      sharpnessRaw,
      tileSharpnessRaw,
      shadowClipping,
      highlightClipping,
      meanLuminance,
      hash,
      colorStats: colors,
      motionBlurRatio,
      thumbnailBlob,
    };
    (self as unknown as Worker).postMessage(result);
  } catch (err) {
    const failure: AnalysisFailure = { id, error: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(failure);
  }
};
