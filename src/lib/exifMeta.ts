import * as exifr from 'exifr';

export interface ExifMeta {
  captureTime: Date | null;
  camera?: string;
}

export async function extractExifMeta(file: File): Promise<ExifMeta> {
  try {
    const data = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'Make', 'Model']);
    if (!data) return { captureTime: null };
    const captureTime: Date | null =
      data.DateTimeOriginal ?? data.CreateDate ?? data.ModifyDate ?? null;
    const camera = [data.Make, data.Model].filter(Boolean).join(' ').trim() || undefined;
    return { captureTime, camera };
  } catch {
    return { captureTime: null };
  }
}
