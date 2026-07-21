import { ERR_CANVAS_UNAVAILABLE, ERR_IMAGE_LOAD } from './errorCodes';
import { dHashFromGrayscale, HASH_BITS, HASH_HEIGHT, HASH_WIDTH, hammingDistance, rgbaToGrayscale } from './pixelMath';

export { HASH_BITS, hammingDistance };

/**
 * Computes a 256-bit difference hash (dHash) of an image. Two images of a
 * near-identical burst will produce hashes with a small Hamming distance,
 * which lets us cluster "same shot, multiple frames" without ever
 * comparing full-resolution pixel data. A 16x16 grid (rather than the more
 * common 8x8/64-bit dHash) gives enough resolution to tell apart distinct
 * moments within a fast sports/event burst instead of lumping the whole
 * sequence into one group.
 *
 * Main-thread implementation, used as a fallback when Web Workers/
 * OffscreenCanvas aren't available — see workers/analysisWorker.ts for
 * the worker-pool path large batches normally take.
 */
export function computeDHash(url: string): Promise<bigint> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = HASH_WIDTH;
      canvas.height = HASH_HEIGHT;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error(ERR_CANVAS_UNAVAILABLE));
        return;
      }
      ctx.drawImage(img, 0, 0, HASH_WIDTH, HASH_HEIGHT);
      const { data } = ctx.getImageData(0, 0, HASH_WIDTH, HASH_HEIGHT);
      resolve(dHashFromGrayscale(rgbaToGrayscale(data)));
    };
    img.onerror = () => reject(new Error(ERR_IMAGE_LOAD));
    img.src = url;
  });
}
