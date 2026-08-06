import type * as FaceApiNs from '@vladmandic/face-api';
import { ERR_IMAGE_LOAD } from './errorCodes';
import { sharpnessOfRegion } from './imageAnalysis';
import type { EmotionKey } from '../types';

const MODEL_URL = `${import.meta.env.BASE_URL}models`;
const EYE_CLOSED_THRESHOLD = 0.2; // eye-aspect-ratio below this = eyes considered closed
const FACE_BOX_PADDING = 0.25; // include some context around the face, not just eyes/nose
// face-api's box roughly spans eyebrows-to-chin, not hairline-to-chin -- the
// crop-safety extent (subjectYExtent) needs extra headroom above that box
// specifically, or hair/a raised cap/bun regularly ends up sliced off even
// though the face itself is technically "in frame".
const HEAD_TOP_PADDING = 0.55;
// A face is "roughly frontal" (facing the camera) when its landmarks are
// close to horizontally symmetric around the detected box's center — a
// coarse proxy for eye contact with the lens, not a real gaze estimate.
const FRONTAL_SYMMETRY_THRESHOLD = 0.12;

export interface FaceAnalysis {
  facesDetected: number;
  facesWithClosedEyes: number;
  facesLookingAtCamera: number;
  /** Sharpest detected face region, for telling intentional shallow-DOF portraits from accidental blur. */
  subjectSharpnessRaw?: number;
  /** Mean face-api expression scores across all detected faces (each key already 0-1, averaged). */
  emotionScores?: Partial<Record<EmotionKey, number>>;
  /** Average face-box center across all detected faces, normalized to 0-1 of the image dimensions. */
  subjectCenter?: { x: number; y: number };
  /** Topmost-to-bottommost span across all detected face boxes, normalized 0-1. */
  subjectYExtent?: { top: number; bottom: number };
}

let modelsLoaded: Promise<typeof FaceApiNs> | null = null;

/**
 * Loads face-api.js (a ~1.3MB self-contained TF.js bundle) only when
 * analysis actually starts, not in the initial app bundle, then loads
 * the tiny face detector, tiny 68-point landmark model, and the small
 * expression-classification model (happy/sad/angry/surprised/fearful/
 * disgusted/neutral) from files bundled in public/models — no
 * third-party CDN call, so this stays fully local like the rest of the
 * pipeline.
 */
export function ensureFaceModelsLoaded(): Promise<typeof FaceApiNs> {
  if (!modelsLoaded) {
    modelsLoaded = import('@vladmandic/face-api').then(async (faceapi) => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      return faceapi;
    });
  }
  return modelsLoaded;
}

/**
 * Detects faces in the preview image, flags how many have (probably)
 * closed eyes using the classic eye-aspect-ratio (EAR) technique from
 * blink-detection literature, and measures how sharp the sharpest face
 * region is — a face that's crisp even when the rest of the frame is
 * soft means the photographer chose a shallow depth of field, not that
 * they missed focus.
 */
export async function analyzeFaces(url: string): Promise<FaceAnalysis> {
  const faceapi = await ensureFaceModelsLoaded();
  const img = await loadImageElement(url);

  // Defaults (416/0.5) are tuned for frontal faces filling a good chunk of
  // the frame; a full-body action shot with a tilted-back or turned face
  // gives the detector a small, foreshortened target it often scores just
  // under threshold or misses outright at low resolution. Bumping input
  // resolution and relaxing the threshold trades a bit of speed and a few
  // more false positives for actually catching those faces.
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.4 }))
    .withFaceLandmarks(true)
    .withFaceExpressions();

  let closed = 0;
  let frontal = 0;
  let subjectSharpnessRaw: number | undefined;
  let centerXSum = 0;
  let centerYSum = 0;
  let topMin: number | undefined;
  let bottomMax: number | undefined;
  const emotionSums: Partial<Record<EmotionKey, number>> = {};

  for (const detection of detections) {
    const leftEar = eyeAspectRatio(detection.landmarks.getLeftEye());
    const rightEar = eyeAspectRatio(detection.landmarks.getRightEye());
    if ((leftEar + rightEar) / 2 < EYE_CLOSED_THRESHOLD) closed++;
    if (isRoughlyFrontal(detection)) frontal++;

    const box = detection.detection.box;
    const padX = box.width * FACE_BOX_PADDING;
    const padY = box.height * FACE_BOX_PADDING;
    const x = Math.max(0, box.x - padX);
    const y = Math.max(0, box.y - padY);
    const width = Math.min(img.naturalWidth - x, box.width + padX * 2);
    const height = Math.min(img.naturalHeight - y, box.height + padY * 2);
    const regionSharpness = sharpnessOfRegion(img, { x, y, width, height });
    subjectSharpnessRaw = Math.max(subjectSharpnessRaw ?? 0, regionSharpness);
    centerXSum += (box.x + box.width / 2) / img.naturalWidth;
    centerYSum += (box.y + box.height / 2) / img.naturalHeight;
    const headTopY = Math.max(0, box.y - box.height * HEAD_TOP_PADDING);
    const topFrac = headTopY / img.naturalHeight;
    const bottomFrac = (y + height) / img.naturalHeight;
    topMin = topMin === undefined ? topFrac : Math.min(topMin, topFrac);
    bottomMax = bottomMax === undefined ? bottomFrac : Math.max(bottomMax, bottomFrac);

    for (const [key, value] of Object.entries(detection.expressions)) {
      emotionSums[key as EmotionKey] = (emotionSums[key as EmotionKey] ?? 0) + (value as number);
    }
  }

  const emotionScores: Partial<Record<EmotionKey, number>> | undefined =
    detections.length > 0
      ? (Object.fromEntries(
          Object.entries(emotionSums).map(([key, sum]) => [key, (sum as number) / detections.length]),
        ) as Partial<Record<EmotionKey, number>>)
      : undefined;

  const subjectCenter =
    detections.length > 0 ? { x: centerXSum / detections.length, y: centerYSum / detections.length } : undefined;
  // The bounding span of every detected face, not just their average center
  // — a photo with faces spread far apart (two people at different heights
  // in frame) needs its crop centered on that whole span, or a tight-aspect
  // template can clip whichever face sits furthest from a plain average point.
  const subjectYExtent = topMin !== undefined && bottomMax !== undefined ? { top: topMin, bottom: bottomMax } : undefined;

  return {
    facesDetected: detections.length,
    facesWithClosedEyes: closed,
    facesLookingAtCamera: frontal,
    subjectSharpnessRaw,
    subjectYExtent,
    emotionScores,
    subjectCenter,
  };
}

/**
 * Coarse proxy for "looking at the camera": true when the midpoint
 * between the eyes sits close to the horizontal center of the detected
 * face box, i.e. the face looks roughly frontal rather than in profile or
 * turned away. This is a geometric heuristic, not a real gaze/head-pose
 * estimate — treated as lower-confidence than the other signals.
 */
function isRoughlyFrontal(detection: {
  detection: { box: { x: number; width: number } };
  landmarks: FaceApiNs.FaceLandmarks68;
}): boolean {
  const box = detection.detection.box;
  const avgX = (points: FaceApiNs.Point[]) => points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const eyeMidX = (avgX(detection.landmarks.getLeftEye()) + avgX(detection.landmarks.getRightEye())) / 2;
  const boxCenterX = box.x + box.width / 2;
  return box.width > 0 && Math.abs(eyeMidX - boxCenterX) / box.width < FRONTAL_SYMMETRY_THRESHOLD;
}

function eyeAspectRatio(eye: FaceApiNs.Point[]): number {
  const dist = (a: FaceApiNs.Point, b: FaceApiNs.Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal === 0) return 1; // degenerate landmarks; treat as open rather than flag a false positive
  const vertical = dist(eye[1], eye[5]) + dist(eye[2], eye[4]);
  return vertical / (2 * horizontal);
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(ERR_IMAGE_LOAD));
    img.src = url;
  });
}

/**
 * Same as analyzeFaces but never throws — face/eye detection is a bonus
 * signal, so a model-load hiccup or an unsupported browser shouldn't fail
 * the whole photo. Falls back to "no faces detected" (scoring-neutral).
 */
export async function analyzeFacesSafe(url: string): Promise<FaceAnalysis> {
  try {
    return await analyzeFaces(url);
  } catch (err) {
    console.warn('Face detection skipped for this photo:', err);
    return { facesDetected: 0, facesWithClosedEyes: 0, facesLookingAtCamera: 0 };
  }
}
