export const ERR_NO_PREVIEW = 'ERR_NO_PREVIEW';
export const ERR_PREVIEW_LOAD = 'ERR_PREVIEW_LOAD';
export const ERR_CANVAS_UNAVAILABLE = 'ERR_CANVAS_UNAVAILABLE';
export const ERR_IMAGE_LOAD = 'ERR_IMAGE_LOAD';

/**
 * Internal, language-free error codes thrown by the extraction/analysis
 * pipeline. Mapped to a translation key in pipeline.ts so the message
 * shown to the user follows the active UI language.
 */
export type PipelineErrorCode =
  | typeof ERR_NO_PREVIEW
  | typeof ERR_PREVIEW_LOAD
  | typeof ERR_CANVAS_UNAVAILABLE
  | typeof ERR_IMAGE_LOAD;
