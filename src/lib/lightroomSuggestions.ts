import type { LightroomSuggestion, PhotoResult, Purpose } from '../types';
import { EXCELLENCE_THRESHOLD } from './scoreNotes';

const CLIPPING_THRESHOLD = 0.02; // 2% of pixels near-clipped is already visible
const LOW_LUMINANCE = 80;
const HIGH_LUMINANCE = 190;
const SHARPNESS_HEADROOM = 75; // below this, extra sharpening still helps

/**
 * Suggests concrete Lightroom slider moves to push a shortlisted photo
 * further, split into two parts: corrections grounded in what the
 * pipeline actually measured (clipping, exposure, softness), followed by
 * a couple of purpose-specific finishing touches. Slider names use the
 * English Lightroom terminology so they map 1:1 onto the panel regardless
 * of the UI language; the `kind` is resolved to a localized explanation
 * at render time via `lr.${kind}` translation keys.
 *
 * If nothing measurable needs correcting and the photo already scores as
 * excellent overall, the purpose-specific finishing touches are skipped
 * too — this list is meant to flag real, useful moves, not to manufacture
 * busywork on an already-great shot.
 */
export function generateLightroomSuggestions(photo: PhotoResult, styleHint: Purpose): LightroomSuggestion[] {
  const suggestions: LightroomSuggestion[] = [];

  const highlightClipping = photo.highlightClipping ?? 0;
  const shadowClipping = photo.shadowClipping ?? 0;
  const meanLuminance = photo.meanLuminance ?? 128;
  const sharpnessScore = photo.sharpnessScore ?? 100;

  if (highlightClipping > CLIPPING_THRESHOLD) {
    suggestions.push({
      slider: 'Highlights / Whites',
      kind: 'highlights',
      params: { value: Math.round(highlightClipping * 100) / 100 },
    });
  }

  if (shadowClipping > CLIPPING_THRESHOLD) {
    suggestions.push({
      slider: 'Shadows / Blacks',
      kind: 'shadows',
      params: { value: Math.round(shadowClipping * 100) / 100 },
    });
  }

  if (meanLuminance < LOW_LUMINANCE) {
    suggestions.push({ slider: 'Exposure', kind: 'exposureLow' });
  } else if (meanLuminance > HIGH_LUMINANCE) {
    suggestions.push({ slider: 'Exposure', kind: 'exposureHigh' });
  }

  if (sharpnessScore < SHARPNESS_HEADROOM) {
    suggestions.push({ slider: 'Sharpening — Amount / Radius / Masking', kind: 'sharpening' });
  }

  const nothingToCorrect = suggestions.length === 0;
  const alreadyExcellent = (photo.overallScore ?? 0) >= EXCELLENCE_THRESHOLD;
  if (!(nothingToCorrect && alreadyExcellent)) {
    suggestions.push(...purposeFinishingTouches(styleHint));
  }

  return suggestions;
}

function purposeFinishingTouches(purpose: Purpose): LightroomSuggestion[] {
  switch (purpose) {
    case 'portfolio':
      return [
        { slider: 'Clarity', kind: 'portfolioClarity' },
        { slider: 'Texture', kind: 'portfolioTexture' },
        { slider: 'Crop Overlay', kind: 'portfolioCrop' },
      ];
    case 'instagram':
      return [
        { slider: 'Vibrance', kind: 'instaVibrance' },
        { slider: 'Tone Curve', kind: 'instaToneCurve' },
        { slider: 'Vignette (Post-Crop)', kind: 'instaVignette' },
      ];
    case 'kunde':
      return [
        { slider: 'White Balance — Temp / Tint', kind: 'kundeWhiteBalance' },
        { slider: 'Tone Curve', kind: 'kundeToneCurve' },
      ];
    case 'video':
      return [
        { slider: 'Noise Reduction — Luminance / Detail', kind: 'videoDenoise' },
        { slider: 'Sharpening — Amount / Radius', kind: 'videoSharpening' },
      ];
    case 'sport':
      return [
        { slider: 'Dehaze', kind: 'sportDehaze' },
        { slider: 'Crop Overlay', kind: 'sportCrop' },
      ];
    case 'event':
      return [
        { slider: 'White Balance — Temp / Tint', kind: 'eventWhiteBalance' },
        { slider: 'Tone Curve', kind: 'eventToneCurve' },
      ];
    case 'presse':
      return [
        { slider: 'Tone Curve', kind: 'presseToneCurve' },
        { slider: 'Sharpening — Amount / Radius', kind: 'presseSharpening' },
      ];
    default:
      return [{ slider: 'Tone Curve', kind: 'defaultToneCurve' }];
  }
}
