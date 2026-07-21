export const SUPPORTED_RAW_EXTENSIONS = ['cr2', 'cr3', 'nef', 'arw', 'raf', 'dng'] as const;
export const SUPPORTED_JPEG_EXTENSIONS = ['jpg', 'jpeg'] as const;
export const SUPPORTED_EXTENSIONS = [...SUPPORTED_RAW_EXTENSIONS, ...SUPPORTED_JPEG_EXTENSIONS];

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function isRawFile(filename: string): boolean {
  return (SUPPORTED_RAW_EXTENSIONS as readonly string[]).includes(getExtension(filename));
}

export function isJpegFile(filename: string): boolean {
  return (SUPPORTED_JPEG_EXTENSIONS as readonly string[]).includes(getExtension(filename));
}

export function isSupportedFile(filename: string): boolean {
  return isRawFile(filename) || isJpegFile(filename);
}
