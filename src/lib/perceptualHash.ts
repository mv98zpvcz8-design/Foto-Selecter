import { ERR_CANVAS_UNAVAILABLE, ERR_IMAGE_LOAD } from './errorCodes';

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

/**
 * Computes a 64-bit difference hash (dHash) of an image. Two images of a
 * near-identical burst will produce hashes with a small Hamming distance,
 * which lets us cluster "same shot, multiple frames" without ever
 * comparing full-resolution pixel data.
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

      const gray = new Float32Array(HASH_WIDTH * HASH_HEIGHT);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      let hash = 0n;
      for (let y = 0; y < HASH_HEIGHT; y++) {
        for (let x = 0; x < HASH_WIDTH - 1; x++) {
          const left = gray[y * HASH_WIDTH + x];
          const right = gray[y * HASH_WIDTH + x + 1];
          hash = (hash << 1n) | (left < right ? 1n : 0n);
        }
      }
      resolve(hash);
    };
    img.onerror = () => reject(new Error(ERR_IMAGE_LOAD));
    img.src = url;
  });
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
