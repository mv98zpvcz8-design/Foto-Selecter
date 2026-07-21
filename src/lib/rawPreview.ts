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
 * JPEG preview cameras store in the file's EXIF/maker-note metadata.
 * CR3's ISO-BMFF container is less consistently supported than the
 * TIFF-based RAW formats (CR2/NEF/ARW/RAF/DNG), so extraction failures
 * there are expected for some files and are surfaced to the caller
 * rather than thrown.
 */
export async function extractPreview(file: File): Promise<ExtractedPreview> {
  if (isJpegFile(file.name)) {
    const url = URL.createObjectURL(file);
    const { width, height } = await loadImageDimensions(url);
    return { url, width, height };
  }

  const url = await exifr.thumbnailUrl(file);
  if (!url) {
    throw new Error(ERR_NO_PREVIEW);
  }
  const { width, height } = await loadImageDimensions(url);
  return { url, width, height };
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(ERR_PREVIEW_LOAD));
    img.src = url;
  });
}
