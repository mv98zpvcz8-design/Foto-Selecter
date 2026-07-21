import { groupPhotos } from './grouping';
import type { PhotoResult, WeightProfile } from '../types';

const IDEAL_LUMINANCE_MIN = 80;
const IDEAL_LUMINANCE_MAX = 190;

function normalizeSharpnessScores(photos: PhotoResult[]): void {
  const values = photos
    .filter((p) => p.status === 'done' && p.sharpnessRaw != null)
    .map((p) => p.sharpnessRaw as number)
    .sort((a, b) => a - b);

  if (values.length === 0) return;

  const p05 = percentile(values, 0.05);
  const p95 = percentile(values, 0.95);
  const range = Math.max(p95 - p05, 1e-6);

  for (const photo of photos) {
    if (photo.status !== 'done' || photo.sharpnessRaw == null) continue;
    const normalized = ((photo.sharpnessRaw - p05) / range) * 100;
    photo.sharpnessScore = clamp(Math.round(normalized), 0, 100);
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeExposureScore(shadowClipping: number, highlightClipping: number, meanLuminance: number): number {
  const clippingPenalty = Math.min(100, (shadowClipping + highlightClipping) * 400);

  let meanPenalty = 0;
  if (meanLuminance < IDEAL_LUMINANCE_MIN) {
    meanPenalty = Math.min(40, (IDEAL_LUMINANCE_MIN - meanLuminance) * 0.6);
  } else if (meanLuminance > IDEAL_LUMINANCE_MAX) {
    meanPenalty = Math.min(40, (meanLuminance - IDEAL_LUMINANCE_MAX) * 0.6);
  }

  return clamp(Math.round(100 - clippingPenalty - meanPenalty), 0, 100);
}

/** Neutral 100 when no faces were detected (landscapes shouldn't be penalized); otherwise the share of faces with eyes open. */
function computeFaceScore(facesDetected: number, facesWithClosedEyes: number): number {
  if (facesDetected <= 0) return 100;
  return clamp(Math.round((100 * (facesDetected - facesWithClosedEyes)) / facesDetected), 0, 100);
}

function groupBonus(groupRank: number): number {
  return clamp(Math.round(100 * Math.max(0, 1 - 0.35 * (groupRank - 1))), 0, 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Weighted blend used only to rank frames within the same burst — the `group` weight doesn't apply here since it's meaningless relative to siblings. */
function intraGroupRankScore(photo: PhotoResult, weights: WeightProfile): number {
  const w = weights.sharpness + weights.exposure + weights.faces;
  if (w <= 0) return 0;
  return (
    (weights.sharpness * (photo.sharpnessScore ?? 0) +
      weights.exposure * (photo.exposureScore ?? 0) +
      weights.faces * (photo.faceScore ?? 100)) /
    w
  );
}

/**
 * Fills in sharpnessScore, exposureScore, faceScore, group membership/rank
 * and the weighted overallScore for every successfully processed photo,
 * using the given (already-resolved) weight profile. Does not decide the
 * final top-N selection; call selectTopN for that.
 */
export function scorePhotos(photos: PhotoResult[], weights: WeightProfile): void {
  normalizeSharpnessScores(photos);

  for (const photo of photos) {
    if (photo.status !== 'done') continue;
    photo.exposureScore = computeExposureScore(
      photo.shadowClipping ?? 0,
      photo.highlightClipping ?? 0,
      photo.meanLuminance ?? 128,
    );
    photo.faceScore = computeFaceScore(photo.facesDetected ?? 0, photo.facesWithClosedEyes ?? 0);
  }

  const doneIndices = photos
    .map((_, i) => i)
    .filter((i) => photos[i].status === 'done');
  const { groups } = groupPhotos(
    doneIndices.map((i) => ({ hash: photos[i].hash, captureTime: photos[i].captureTime })),
  );

  groups.forEach((memberPositions, gid) => {
    const memberIndices = memberPositions.map((pos) => doneIndices[pos]);
    memberIndices.sort((a, b) => intraGroupRankScore(photos[b], weights) - intraGroupRankScore(photos[a], weights));
    memberIndices.forEach((photoIndex, rankZeroBased) => {
      photos[photoIndex].groupId = gid;
      photos[photoIndex].groupRank = rankZeroBased + 1;
      photos[photoIndex].groupSize = memberIndices.length;
    });
  });

  for (const photo of photos) {
    if (photo.status !== 'done') continue;
    const groupBonusScore = groupBonus(photo.groupRank ?? 1);
    const overall =
      weights.sharpness * (photo.sharpnessScore ?? 0) +
      weights.exposure * (photo.exposureScore ?? 0) +
      weights.faces * (photo.faceScore ?? 100) +
      weights.group * groupBonusScore;
    photo.groupBonusScore = groupBonusScore;
    photo.overallScore = Math.round(overall);
    photo.appliedWeights = weights;
  }
}

/**
 * Selects the top-N photos: prefers the best photo from each distinct
 * burst/similarity group first (so near-duplicates don't crowd the
 * selection), and only reaches into a group's runner-up frames if there
 * aren't enough distinct groups to reach the target count.
 */
export function selectTopN(photos: PhotoResult[], targetCount: number): void {
  const done = photos.filter((p) => p.status === 'done');
  for (const p of done) {
    p.isPreselected = false;
  }

  const byGroup = new Map<number, PhotoResult[]>();
  for (const p of done) {
    const gid = p.groupId ?? -1;
    if (!byGroup.has(gid)) byGroup.set(gid, []);
    byGroup.get(gid)!.push(p);
  }
  for (const members of byGroup.values()) {
    members.sort((a, b) => (a.groupRank ?? 1) - (b.groupRank ?? 1));
  }

  const groupsByBestScore = [...byGroup.values()].sort(
    (a, b) => (b[0].overallScore ?? 0) - (a[0].overallScore ?? 0),
  );

  let selected = 0;
  let rankLevel = 0;
  while (selected < targetCount && groupsByBestScore.some((g) => g.length > rankLevel)) {
    const candidatesAtLevel = groupsByBestScore
      .filter((g) => g.length > rankLevel)
      .sort((a, b) => (b[rankLevel].overallScore ?? 0) - (a[rankLevel].overallScore ?? 0));

    for (const group of candidatesAtLevel) {
      if (selected >= targetCount) break;
      group[rankLevel].isPreselected = true;
      selected++;
    }
    rankLevel++;
  }

  for (const p of photos) {
    if (p.status === 'done') {
      p.isSelected = p.isPreselected;
    }
  }
}
