import { ERR_CANVAS_UNAVAILABLE, ERR_IMAGE_LOAD } from './errorCodes';

const ANALYSIS_MAX_DIM = 480;
const TILE_GRID = 3; // 3x3 tiles for selective-focus (bokeh) detection

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
}

/**
 * Analyzes a preview image for blur (Laplacian variance, whole-frame and
 * per-tile), exposure (histogram clipping), and mean brightness. Runs
 * entirely on a downscaled canvas so it stays fast even for large
 * batches. The per-tile grid lets the scoring step tell shallow-depth-
 * of-field/product shots (one sharp region, rest deliberately soft) apart
 * from photos that are uniformly blurry by accident.
 */
export async function analyzeImage(url: string): Promise<RawAnalysis> {
  const img = await loadImageElement(url);
  const gray = grayscaleFromElement(img);
  const sharpnessRaw = laplacianVariance(gray.data, gray.width, gray.height);
  const tileSharpnessRaw = tileSharpness(gray.data, gray.width, gray.height, TILE_GRID);
  const { shadowClipping, highlightClipping, meanLuminance } = exposureStats(gray.data);
  return { sharpnessRaw, tileSharpnessRaw, shadowClipping, highlightClipping, meanLuminance };
}

interface GrayscaleData {
  data: Float32Array;
  width: number;
  height: number;
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

  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { data: gray, width, height };
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

function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;

  const responses = new Float32Array((width - 2) * (height - 2));
  let idx = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y * width + x];
      const up = gray[(y - 1) * width + x];
      const down = gray[(y + 1) * width + x];
      const left = gray[y * width + x - 1];
      const right = gray[y * width + x + 1];
      responses[idx++] = up + down + left + right - 4 * center;
    }
  }

  let sum = 0;
  for (let i = 0; i < responses.length; i++) sum += responses[i];
  const mean = sum / responses.length;

  let variance = 0;
  for (let i = 0; i < responses.length; i++) {
    const diff = responses[i] - mean;
    variance += diff * diff;
  }
  return variance / responses.length;
}

/** Splits the frame into a gridSize x gridSize grid and returns each tile's Laplacian variance. */
function tileSharpness(gray: Float32Array, width: number, height: number, gridSize: number): number[] {
  const tileW = Math.floor(width / gridSize);
  const tileH = Math.floor(height / gridSize);
  if (tileW < 3 || tileH < 3) return [];

  const results: number[] = [];
  for (let ty = 0; ty < gridSize; ty++) {
    for (let tx = 0; tx < gridSize; tx++) {
      const x0 = tx * tileW;
      const y0 = ty * tileH;
      const tile = new Float32Array(tileW * tileH);
      for (let y = 0; y < tileH; y++) {
        for (let x = 0; x < tileW; x++) {
          tile[y * tileW + x] = gray[(y0 + y) * width + (x0 + x)];
        }
      }
      results.push(laplacianVariance(tile, tileW, tileH));
    }
  }
  return results;
}

function exposureStats(gray: Float32Array): {
  shadowClipping: number;
  highlightClipping: number;
  meanLuminance: number;
} {
  const SHADOW_THRESHOLD = 8;
  const HIGHLIGHT_THRESHOLD = 247;

  let shadowCount = 0;
  let highlightCount = 0;
  let sum = 0;
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i];
    if (v <= SHADOW_THRESHOLD) shadowCount++;
    if (v >= HIGHLIGHT_THRESHOLD) highlightCount++;
    sum += v;
  }

  return {
    shadowClipping: shadowCount / gray.length,
    highlightClipping: highlightCount / gray.length,
    meanLuminance: sum / gray.length,
  };
}
