import { ERR_CANVAS_UNAVAILABLE, ERR_IMAGE_LOAD } from './errorCodes';

const ANALYSIS_MAX_DIM = 480;

export interface RawAnalysis {
  sharpnessRaw: number; // Laplacian variance, unnormalized
  shadowClipping: number; // fraction of pixels near-black (0-1)
  highlightClipping: number; // fraction of pixels near-white (0-1)
  meanLuminance: number; // 0-255
}

/**
 * Analyzes a preview image for blur (Laplacian variance) and exposure
 * (histogram clipping). Runs entirely on a downscaled canvas so it stays
 * fast even for large batches.
 */
export async function analyzeImage(url: string): Promise<RawAnalysis> {
  const gray = await loadGrayscale(url);
  const sharpnessRaw = laplacianVariance(gray.data, gray.width, gray.height);
  const { shadowClipping, highlightClipping, meanLuminance } = exposureStats(gray.data);
  return { sharpnessRaw, shadowClipping, highlightClipping, meanLuminance };
}

interface GrayscaleData {
  data: Float32Array;
  width: number;
  height: number;
}

function loadGrayscale(url: string): Promise<GrayscaleData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error(ERR_CANVAS_UNAVAILABLE));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);

      const gray = new Float32Array(width * height);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      resolve({ data: gray, width, height });
    };
    img.onerror = () => reject(new Error(ERR_IMAGE_LOAD));
    img.src = url;
  });
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
