import type { LightroomSuggestion, PhotoResult, Purpose } from '../types';

const CLIPPING_THRESHOLD = 0.02; // 2% of pixels near-clipped is already visible
const LOW_LUMINANCE = 80;
const HIGH_LUMINANCE = 190;
const SHARPNESS_HEADROOM = 75; // below this, extra sharpening still helps

/**
 * Suggests concrete Lightroom slider moves to push a shortlisted photo
 * further, split into two parts: corrections grounded in what the
 * pipeline actually measured (clipping, exposure, softness), followed by
 * a couple of purpose-specific finishing touches. Slider names use the
 * English Lightroom terminology so they map 1:1 onto the panel.
 */
export function generateLightroomSuggestions(photo: PhotoResult, purpose: Purpose): LightroomSuggestion[] {
  const suggestions: LightroomSuggestion[] = [];

  const highlightClipping = photo.highlightClipping ?? 0;
  const shadowClipping = photo.shadowClipping ?? 0;
  const meanLuminance = photo.meanLuminance ?? 128;
  const sharpnessScore = photo.sharpnessScore ?? 100;

  if (highlightClipping > CLIPPING_THRESHOLD) {
    suggestions.push({
      slider: 'Highlights / Whites',
      note: `~${Math.round(highlightClipping * 100)}% der Fläche wirkt ausgefressen — beide leicht absenken, um Zeichnung in den Lichtern zurückzuholen.`,
    });
  }

  if (shadowClipping > CLIPPING_THRESHOLD) {
    suggestions.push({
      slider: 'Shadows / Blacks',
      note: `~${Math.round(shadowClipping * 100)}% der Fläche säuft ab — Shadows anheben, Blacks nur behutsam, damit der Look nicht flach wirkt.`,
    });
  }

  if (meanLuminance < LOW_LUMINANCE) {
    suggestions.push({
      slider: 'Exposure',
      note: 'Bild wirkt insgesamt unterbelichtet — um ca. +0.3 bis +0.7 EV anheben.',
    });
  } else if (meanLuminance > HIGH_LUMINANCE) {
    suggestions.push({
      slider: 'Exposure',
      note: 'Bild wirkt insgesamt überbelichtet — leicht absenken, danach Whites/Highlights neu justieren.',
    });
  }

  if (sharpnessScore < SHARPNESS_HEADROOM) {
    suggestions.push({
      slider: 'Sharpening — Amount / Radius / Masking',
      note: 'Im Detail-Panel maskiert nachschärfen (hoher Masking-Wert), damit nur Kanten geschärft werden und Rauschen ruhig bleibt.',
    });
  }

  suggestions.push(...purposeFinishingTouches(purpose));

  return suggestions;
}

function purposeFinishingTouches(purpose: Purpose): LightroomSuggestion[] {
  switch (purpose) {
    case 'portfolio':
      return [
        { slider: 'Clarity', note: 'Dezent erhöhen für mehr Tiefe/Kontrast in den Mitteltönen.' },
        { slider: 'Texture', note: 'Feine Strukturen betonen, ohne den Rauschanteil zu verstärken.' },
        { slider: 'Crop Overlay', note: 'Bildausschnitt nachjustieren — für Portfolios zählt jede Kante der Komposition.' },
      ];
    case 'instagram':
      return [
        { slider: 'Vibrance', note: 'Leicht erhöhen für einen kräftigeren, feed-tauglichen Look, ohne Hauttöne zu verfälschen.' },
        { slider: 'Tone Curve', note: 'Sanfte S-Kurve für mehr Punch in der kleinen Bildschirmansicht.' },
        { slider: 'Vignette (Post-Crop)', note: 'Dezent abdunkeln, um den Blick zum Motiv zu lenken.' },
      ];
    case 'kunde':
      return [
        { slider: 'White Balance — Temp / Tint', note: 'Feinabstimmung für konsistente, natürliche Farben über die ganze Serie.' },
        { slider: 'Tone Curve', note: 'Sanfter Grundkontrast für ein poliertes, aber unaufdringliches Ergebnis.' },
      ];
    default:
      return [{ slider: 'Tone Curve', note: 'Grundkontrast verfeinern für mehr Bildwirkung.' }];
  }
}
