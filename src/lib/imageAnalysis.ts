import { ERR_CANVAS_UNAVAILABLE, ERR_IMAGE_LOAD } from './errorCodes';
import {
  ANALYSIS_MAX_DIM,
  TILE_GRID,
  colorStats,
  directionalGradientEnergy,
  exposureStats,
  laplacianVariance,
  rgbaToGrayscale,
  tileSharpness,
  type ColorStats,
} from './pixelMath';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawAnalysis {
  sharpnessRaw: number; // whole-frame Laplacian variance, unnormalized
  tileSharpnessRaw: number[]; // 3x3 grid of local Laplacian variances, for bokeh/selective-focus detection
  shadowClipping: number; // fraction of pixels near-black (0-1)
  highlightClipping: number; // fraction of pixels near-white (0-1)
  meanLuminance: number; // 0-255
  colorStats: ColorStats;
  motionBlurRatio: number;
  thumbnailBlob: Blob;
}

/**
 * Analyzes a preview image for blur (Laplacian variance, whole-frame and
 * per-tile), exposure (histogram clipping), and mean brightness. Runs
 * entirely on a downscaled canvas so it stays fast even for large
 * batches. The per-tile grid lets the scoring step tell shallow-depth-
 * of-field/product shots (one sharp region, rest deliberately soft) apart
 * from photos that are uniformly blurry by accident.
 *
 * This is the main-thread implementation, used as a fallback when Web
 * Workers/OffscreenCanvas aren't available — see workers/analysisWorker.ts
 * for the worker-pool path large batches normally take.
 */
export async function analyzeImage(url: string): Promise<RawAnalysis> {
  const img = await loadImageElement(url);
  const gray = grayscaleFromElement(img);
  const sharpnessRaw = laplacianVariance(gray.data, gray.width, gray.height);
  const tileSharpnessRaw = tileSharpness(gray.data, gray.width, gray.height, TILE_GRID);
  const { shadowClipping, highlightClipping, meanLuminance } = exposureStats(gray.data);
  const colors = colorStats(gray.rgba, gray.data);
  const gradientEnergy = directionalGradientEnergy(gray.data, gray.width, gray.height);
  const motionBlurRatio =
    Math.max(gradientEnergy.horizontal, gradientEnergy.vertical) /
    Math.max(Math.min(gradientEnergy.horizontal, gradientEnergy.vertical), 1e-6);
  // Reuses the same downscaled canvas as the grid thumbnail — no extra
  // decode/resize pass, and it keeps large batches from holding a
  // full-resolution embedded preview per visible grid card.
  const thumbnailBlob = await canvasToBlob(gray.canvas);
  return {
    sharpnessRaw,
    tileSharpnessRaw,
    shadowClipping,
    highlightClipping,
    meanLuminance,
    colorStats: colors,
    motionBlurRatio,
    thumbnailBlob,
  };
}

interface GrayscaleData {
  data: Float32Array;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(ERR_CANVAS_UNAVAILABLE))),
      'image/jpeg',
      0.82,
    );
  });
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(ERR_IMAGE_LOAD));
    img.src = url;
  });
}

/** Draws (a region of) an already-loaded image to a small canvas and returns its grayscale pixels. */
function grayscaleFromElement(img: HTMLImageElement, sourceRect?: Rect, maxDim = ANALYSIS_MAX_DIM): GrayscaleData {
  const sx = sourceRect?.x ?? 0;
  const sy = sourceRect?.y ?? 0;
  const sw = sourceRect?.width ?? img.naturalWidth;
  const sh = sourceRect?.height ?? img.naturalHeight;

  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error(ERR_CANVAS_UNAVAILABLE);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  return { data: rgbaToGrayscale(data), rgba: data, width, height, canvas };
}

/**
 * Laplacian variance of a specific region within an already-loaded image
 * (e.g. a detected face's bounding box), used to check whether that
 * region is sharp even when the whole frame isn't — the signature of an
 * intentional shallow-depth-of-field portrait rather than accidental blur.
 */
export function sharpnessOfRegion(img: HTMLImageElement, region: Rect): number {
  const gray = grayscaleFromElement(img, region, 200);
  return laplacianVariance(gray.data, gray.width, gray.height);
}
