import { isRawFile } from './fileTypes';
import type { PhotoResult, SemanticTag, SemanticTagKey } from '../types';

// Every threshold below is a reasonable starting point derived from the
// pixel/EXIF/face signals already computed by the pipeline — not a tuned
// model. Confidences ramp linearly between a "just crossing" and a
// "clearly true" boundary; they express how far a measurement sits from
// the threshold, not a statistically calibrated probability.
const BW_CHANNEL_DIFF_THRESHOLD = 14; // 0-255 scale; see ColorStats.channelDiffMean
const VIVID_CHANNEL_DIFF_THRESHOLD = 55;
const WARM_COOL_DIFF_THRESHOLD = 5; // avg red minus avg blue, 0-255 scale
const HIGH_CONTRAST_THRESHOLD = 60; // stdev of luminance
const LOW_CONTRAST_THRESHOLD = 28;
const LOW_LIGHT_LUMINANCE = 55;
const BRIGHT_LUMINANCE = 185;
const DARK_LUMINANCE = 75;
const BACKLIGHT_HIGHLIGHT_SHARE = 0.12; // lots of blown highlights + a dark subject reads as backlight
const MOTION_BLUR_RATIO_THRESHOLD = 2.2;
const FREEZE_SHARPNESS_THRESHOLD = 78;
const EMOTION_THRESHOLD = 0.5; // face-api expression score (0-1) above which we call an emotion "detected"
const CROWD_MIN_FACES = 4;
const PORTRAIT_MAX_FACES = 1;
const GROUP_MIN_FACES = 2;
const GROUP_MAX_FACES = 8;

function ramp(value: number, low: number, high: number): number {
  if (high === low) return value >= high ? 1 : 0;
  const t = (value - low) / (high - low);
  return Math.max(0, Math.min(1, t));
}

function tag(key: SemanticTagKey, confidence: number): SemanticTag {
  return { key, confidence: Math.max(0, Math.min(1, confidence)) };
}

/**
 * Derives the semantic filter tags for one analyzed photo from signals
 * the pipeline already computed (color stats, sharpness, exposure, face
 * detections/expressions, EXIF). Deliberately does not attempt scene or
 * object recognition (sport type, specific gestures, branding, known
 * people, ...) — there is no reliable local model for that here, and
 * inventing a confidence number for it would misrepresent what was
 * actually measured.
 */
export function deriveSemanticTags(photo: PhotoResult): SemanticTag[] {
  const tags: SemanticTag[] = [];

  // --- color & style ---
  const colors = photo.colorStats;
  if (colors) {
    const isBw = colors.channelDiffMean < BW_CHANNEL_DIFF_THRESHOLD;
    if (isBw) {
      tags.push(tag('bw', ramp(BW_CHANNEL_DIFF_THRESHOLD - colors.channelDiffMean, 0, BW_CHANNEL_DIFF_THRESHOLD)));
    } else {
      tags.push(tag('color', ramp(colors.channelDiffMean - BW_CHANNEL_DIFF_THRESHOLD, 0, 20)));
      if (colors.channelDiffMean >= VIVID_CHANNEL_DIFF_THRESHOLD) {
        tags.push(tag('vividColor', ramp(colors.channelDiffMean, VIVID_CHANNEL_DIFF_THRESHOLD, VIVID_CHANNEL_DIFF_THRESHOLD + 60)));
      }
      const rbDiff = colors.avgR - colors.avgB;
      if (Math.abs(rbDiff) >= WARM_COOL_DIFF_THRESHOLD) {
        if (rbDiff > 0) tags.push(tag('warmColor', ramp(rbDiff, WARM_COOL_DIFF_THRESHOLD, WARM_COOL_DIFF_THRESHOLD + 20)));
        else tags.push(tag('coolColor', ramp(-rbDiff, WARM_COOL_DIFF_THRESHOLD, WARM_COOL_DIFF_THRESHOLD + 20)));
      }
    }

    if (colors.contrast >= HIGH_CONTRAST_THRESHOLD) {
      tags.push(tag('highContrast', ramp(colors.contrast, HIGH_CONTRAST_THRESHOLD, HIGH_CONTRAST_THRESHOLD + 25)));
    } else if (colors.contrast <= LOW_CONTRAST_THRESHOLD) {
      tags.push(tag('lowContrast', ramp(LOW_CONTRAST_THRESHOLD - colors.contrast, 0, LOW_CONTRAST_THRESHOLD)));
    }
  }

  const luminance = photo.meanLuminance;
  if (luminance != null) {
    if (luminance >= BRIGHT_LUMINANCE) tags.push(tag('bright', ramp(luminance, BRIGHT_LUMINANCE, 255)));
    if (luminance <= DARK_LUMINANCE) tags.push(tag('dark', ramp(DARK_LUMINANCE - luminance, 0, DARK_LUMINANCE)));
    if (luminance <= LOW_LIGHT_LUMINANCE) {
      tags.push(tag('lowLight', ramp(LOW_LIGHT_LUMINANCE - luminance, 0, LOW_LIGHT_LUMINANCE)));
    }
    const highlightShare = photo.highlightClipping ?? 0;
    if (luminance <= DARK_LUMINANCE + 15 && highlightShare >= BACKLIGHT_HIGHLIGHT_SHARE) {
      tags.push(tag('backlight', ramp(highlightShare, BACKLIGHT_HIGHLIGHT_SHARE, BACKLIGHT_HIGHLIGHT_SHARE + 0.15)));
    }
  }

  if (photo.motionBlurRatio != null) {
    if (photo.motionBlurRatio >= MOTION_BLUR_RATIO_THRESHOLD) {
      tags.push(tag('motionBlur', ramp(photo.motionBlurRatio, MOTION_BLUR_RATIO_THRESHOLD, MOTION_BLUR_RATIO_THRESHOLD + 2)));
    } else if ((photo.sharpnessScore ?? 0) >= FREEZE_SHARPNESS_THRESHOLD) {
      tags.push(tag('freezeMotion', ramp(photo.sharpnessScore ?? 0, FREEZE_SHARPNESS_THRESHOLD, 100)));
    }
  }

  // --- technical: sharpness & exposure (mirrors reasoning.ts buckets) ---
  const sharpness = photo.sharpnessScore;
  if (sharpness != null) {
    if (sharpness >= 80) tags.push(tag('verySharp', ramp(sharpness, 80, 100)));
    else if (sharpness >= 60) tags.push(tag('sharp', ramp(sharpness, 60, 80)));
    else if (sharpness >= 40) tags.push(tag('slightlySoft', 1 - ramp(sharpness, 40, 60)));
    else tags.push(tag('blurry', ramp(40 - sharpness, 0, 40)));
  }
  if ((photo.highlightClipping ?? 0) > 0.02) {
    tags.push(tag('overexposed', ramp(photo.highlightClipping ?? 0, 0.02, 0.15)));
  }
  if ((photo.shadowClipping ?? 0) > 0.02 && (luminance ?? 128) < 100) {
    tags.push(tag('underexposed', ramp(photo.shadowClipping ?? 0, 0.02, 0.15)));
  }
  if (photo.subjectSharpnessRaw != null && photo.sharpnessRaw != null) {
    const subjectSharp = photo.subjectSharpnessRaw >= photo.sharpnessRaw * 0.9;
    if (photo.facesDetected && photo.facesDetected > 0) {
      tags.push(tag('faceSharp', subjectSharp ? 0.85 : 0.3));
      tags.push(tag('eyesSharp', subjectSharp && (photo.facesWithClosedEyes ?? 0) === 0 ? 0.75 : 0.3));
    }
    tags.push(tag('mainSubjectSharp', subjectSharp ? 0.8 : 0.35));
  }

  tags.push(tag(isRawFile(photo.name) ? 'raw' : 'jpeg', 1));

  // --- people & emotion ---
  const faces = photo.facesDetected ?? 0;
  if (faces === 1) tags.push(tag('singlePerson', 1));
  if (faces >= 2) tags.push(tag('multiplePersons', 1));
  if ((photo.facesWithClosedEyes ?? 0) > 0) {
    tags.push(tag('closedEyes', ramp(photo.facesWithClosedEyes ?? 0, 1, faces || 1)));
  }
  if (faces > 0 && (photo.facesLookingAtCamera ?? 0) === 0) {
    // no detected face reads as roughly frontal — soft signal, not a hard occlusion detector
    tags.push(tag('faceOccludedLikely', 0.4));
  }
  if (faces >= CROWD_MIN_FACES) {
    tags.push(tag('crowdLikely', ramp(faces, CROWD_MIN_FACES, CROWD_MIN_FACES + 8)));
  } else if (faces >= 1 && faces <= PORTRAIT_MAX_FACES) {
    tags.push(tag('portraitLikely', 0.6));
  }
  if (faces >= GROUP_MIN_FACES && faces <= GROUP_MAX_FACES) {
    tags.push(tag('groupPhotoLikely', 0.55));
  }

  const emotions = photo.emotionScores;
  if (emotions) {
    const strongest = (Object.entries(emotions) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    if (strongest && strongest[0] !== 'neutral' && strongest[1] >= EMOTION_THRESHOLD) {
      tags.push(tag('emotion', strongest[1]));
      if (strongest[0] === 'happy') tags.push(tag('joy', strongest[1]));
      if (strongest[0] === 'sad') tags.push(tag('sadness', strongest[1]));
      if (strongest[0] === 'surprised') tags.push(tag('surprise', strongest[1]));
      if (strongest[0] === 'angry') tags.push(tag('anger', strongest[1]));
    }
  }

  // --- unique vs. part of a large near-duplicate series ---
  if ((photo.groupSize ?? 1) <= 1) {
    tags.push(tag('uniqueInSeries', 1));
  } else if (photo.groupSize && photo.groupSize <= 2) {
    tags.push(tag('uniqueInSeries', 0.5));
  }

  return tags;
}
