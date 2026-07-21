// Pure pixel-crunching functions with no DOM dependency, so they can run
// identically on the main thread or inside a Web Worker (which has no
// `document`/`Image`, only typed arrays and OffscreenCanvas/ImageBitmap).

export const ANALYSIS_MAX_DIM = 480;
export const TILE_GRID = 3; // 3x3 tiles for selective-focus (bokeh) detection

export const HASH_BITS = 256;
export const HASH_HEIGHT = 16;
export const HASH_WIDTH = HASH_BITS / HASH_HEIGHT + 1; // 17 columns -> 16 horizontal comparisons/row

export function rgbaToGrayscale(data: Uint8ClampedArray | Uint8Array): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
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
export function tileSharpness(gray: Float32Array, width: number, height: number, gridSize: number): number[] {
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

export function exposureStats(gray: Float32Array): {
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

/** Assumes `gray` is already sized HASH_WIDTH x HASH_HEIGHT. */
export function dHashFromGrayscale(gray: Float32Array): bigint {
  let hash = 0n;
  for (let y = 0; y < HASH_HEIGHT; y++) {
    for (let x = 0; x < HASH_WIDTH - 1; x++) {
      const left = gray[y * HASH_WIDTH + x];
      const right = gray[y * HASH_WIDTH + x + 1];
      hash = (hash << 1n) | (left < right ? 1n : 0n);
    }
  }
  return hash;
}

export function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > 0n) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}
