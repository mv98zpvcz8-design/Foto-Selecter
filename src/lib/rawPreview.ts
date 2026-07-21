import * as exifr from 'exifr';
import { isJpegFile } from './fileTypes';
import { ERR_NO_PREVIEW, ERR_PREVIEW_LOAD } from './errorCodes';

export interface ExtractedPreview {
  url: string;
  width: number;
  height: number;
}

/**
 * Produces a browser-displayable preview for an uploaded photo.
 * JPEGs can be rendered natively, so we just hand back an object URL.
 * RAW files can't be decoded by the browser, so we pull the embedded
 * JPEG preview cameras store in the file. exifr handles the TIFF-based
 * formats (CR2/NEF/ARW/RAF/DNG) reliably via their IFD structure. CR3's
 * ISO-BMFF container trips it up more often, so if exifr comes back
 * empty we fall back to scanning the raw bytes for embedded JPEG
 * SOI…EOI markers directly — a format-agnostic trick (the same one
 * exiftool/dcraw use) that finds Canon's "PRVW" preview even when the
 * structured parse fails, and also rescues any other RAW variant exifr
 * doesn't recognize.
 */
export async function extractPreview(file: File): Promise<ExtractedPreview> {
  if (isJpegFile(file.name)) {
    const url = URL.createObjectURL(file);
    const { width, height } = await loadImageDimensions(url);
    return { url, width, height };
  }

  try {
    const url = await exifr.thumbnailUrl(file);
    if (url) {
      const { width, height } = await loadImageDimensions(url);
      return { url, width, height };
    }
  } catch {
    // fall through to the byte-scan fallback below
  }

  return extractPreviewByMarkerScan(file);
}

async function extractPreviewByMarkerScan(file: File): Promise<ExtractedPreview> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const jpeg = findLargestEmbeddedJpeg(buffer);
  if (!jpeg) {
    throw new Error(ERR_NO_PREVIEW);
  }

  const blob = new Blob([buffer.slice(jpeg.start, jpeg.end)], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  const { width, height } = await loadImageDimensions(url);
  return { url, width, height };
}

/**
 * Scans for JPEG SOI (FFD8) … EOI (FFD9) marker pairs and returns the
 * largest span found, on the assumption that a RAW file's biggest
 * embedded JPEG is its full-size preview rather than a small icon
 * thumbnail. Runs in one forward pass — once a span is found the cursor
 * jumps past it, so bytes aren't rescanned.
 */
function findLargestEmbeddedJpeg(buffer: Uint8Array): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  let i = 0;

  while (i < buffer.length - 1) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd8) {
      let j = i + 2;
      let eoi = -1;
      while (j < buffer.length - 1) {
        if (buffer[j] === 0xff && buffer[j + 1] === 0xd9) {
          eoi = j + 2;
          break;
        }
        j++;
      }
      if (eoi !== -1) {
        if (!best || eoi - i > best.end - best.start) {
          best = { start: i, end: eoi };
        }
        i = eoi;
        continue;
      }
    }
    i++;
  }

  return best;
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(ERR_PREVIEW_LOAD));
    img.src = url;
  });
}
