import * as exifr from 'exifr';

export interface ExifMeta {
  captureTime: Date | null;
  camera?: string;
  lens?: string;
  focalLengthMm?: number;
  iso?: number;
  shutterSpeedSec?: number;
  aperture?: number; // f-number
}

export async function extractExifMeta(file: File): Promise<ExifMeta> {
  try {
    const data = await exifr.parse(file, [
      'DateTimeOriginal',
      'CreateDate',
      'ModifyDate',
      'Make',
      'Model',
      'LensMake',
      'LensModel',
      'FocalLength',
      'ISO',
      'ExposureTime',
      'FNumber',
    ]);
    if (!data) return { captureTime: null };
    const captureTime: Date | null =
      data.DateTimeOriginal ?? data.CreateDate ?? data.ModifyDate ?? null;
    const camera = [data.Make, data.Model].filter(Boolean).join(' ').trim() || undefined;
    const lens = [data.LensMake, data.LensModel].filter(Boolean).join(' ').trim() || undefined;
    return {
      captureTime,
      camera,
      lens,
      focalLengthMm: typeof data.FocalLength === 'number' ? data.FocalLength : undefined,
      iso: typeof data.ISO === 'number' ? data.ISO : undefined,
      shutterSpeedSec: typeof data.ExposureTime === 'number' ? data.ExposureTime : undefined,
      aperture: typeof data.FNumber === 'number' ? data.FNumber : undefined,
    };
  } catch {
    return { captureTime: null };
  }
}

/** Formats a shutter speed in seconds as Lightroom/EXIF-style text, e.g. "1/500 s" or "0.8 s". */
export function formatShutterSpeed(sec: number): string {
  if (sec <= 0) return '';
  if (sec >= 1) return `${sec % 1 === 0 ? sec : sec.toFixed(1)} s`;
  const denominator = Math.round(1 / sec);
  return `1/${denominator} s`;
}

/** Buckets a focal length into a readable label for grouping in analytics, e.g. "70-110mm". */
export function focalLengthBucket(mm: number): string {
  const size = mm < 50 ? 10 : mm < 200 ? 20 : 50;
  const lo = Math.floor(mm / size) * size;
  const hi = lo + size;
  return `${lo}-${hi}mm`;
}
