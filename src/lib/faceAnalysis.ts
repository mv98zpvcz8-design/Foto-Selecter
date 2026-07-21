import type * as FaceApiNs from '@vladmandic/face-api';
import { ERR_IMAGE_LOAD } from './errorCodes';
import { sharpnessOfRegion } from './imageAnalysis';

const MODEL_URL = `${import.meta.env.BASE_URL}models`;
const EYE_CLOSED_THRESHOLD = 0.2; // eye-aspect-ratio below this = eyes considered closed
const FACE_BOX_PADDING = 0.25; // include some context around the face, not just eyes/nose

export interface FaceAnalysis {
  facesDetected: number;
  facesWithClosedEyes: number;
  /** Sharpest detected face region, for telling intentional shallow-DOF portraits from accidental blur. */
  subjectSharpnessRaw?: number;
}

let modelsLoaded: Promise<typeof FaceApiNs> | null = null;

/**
 * Loads face-api.js (a ~1.3MB self-contained TF.js bundle) only when
 * analysis actually starts, not in the initial app bundle, then loads
 * the tiny face detector + tiny 68-point landmark model from files
 * bundled in public/models — no third-party CDN call, so this stays
 * fully local like the rest of the pipeline.
 */
export function ensureFaceModelsLoaded(): Promise<typeof FaceApiNs> {
  if (!modelsLoaded) {
    modelsLoaded = import('@vladmandic/face-api').then(async (faceapi) => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
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

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true);

  let closed = 0;
  let subjectSharpnessRaw: number | undefined;
  for (const detection of detections) {
    const leftEar = eyeAspectRatio(detection.landmarks.getLeftEye());
    const rightEar = eyeAspectRatio(detection.landmarks.getRightEye());
    if ((leftEar + rightEar) / 2 < EYE_CLOSED_THRESHOLD) closed++;

    const box = detection.detection.box;
    const padX = box.width * FACE_BOX_PADDING;
    const padY = box.height * FACE_BOX_PADDING;
    const x = Math.max(0, box.x - padX);
    const y = Math.max(0, box.y - padY);
    const width = Math.min(img.naturalWidth - x, box.width + padX * 2);
    const height = Math.min(img.naturalHeight - y, box.height + padY * 2);
    const regionSharpness = sharpnessOfRegion(img, { x, y, width, height });
    subjectSharpnessRaw = Math.max(subjectSharpnessRaw ?? 0, regionSharpness);
  }

  return { facesDetected: detections.length, facesWithClosedEyes: closed, subjectSharpnessRaw };
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
    return { facesDetected: 0, facesWithClosedEyes: 0 };
  }
}
