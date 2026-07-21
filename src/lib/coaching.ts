import type { PhotoResult, Purpose, ShootingSnapshot } from '../types';
import type { ShotAnalyticsData } from './analytics';

const MIN_SAMPLE = 5; // below this, we don't claim strengths/weaknesses at all
const STRONG_SHARPNESS = 75;
const WEAK_SHARE = 0.15; // 15% of frames showing a flaw is worth flagging
const RECURRING_MIN_PRIOR_HITS = 2; // needs to show up in at least this many of the last 3 prior shoots too

export interface TextSlot {
  key: string;
  vars?: Record<string, string | number>;
}

export interface PracticeArea {
  observation: TextSlot;
  exercise: TextSlot;
  benefit: TextSlot;
}

export interface CoachingResume {
  hasEnoughData: boolean;
  overall: TextSlot;
  strengths: TextSlot[];
  recurringStrengths: TextSlot[];
  weaknesses: TextSlot[];
  practiceAreas: PracticeArea[];
  comparisons: TextSlot[];
  insufficientDataNotes: TextSlot[];
}

interface StrengthCandidate {
  key: string;
  present: boolean;
  metricValue: number; // used both for ranking and for recurrence checks across history
}

function bwSubsetAvgScore(photos: PhotoResult[]): number | null {
  const bw = photos.filter((p) => (p.semanticTags?.find((t) => t.key === 'bw')?.confidence ?? 0) >= 0.5);
  if (bw.length < 3) return null;
  return bw.reduce((sum, p) => sum + (p.overallScore ?? 0), 0) / bw.length;
}

function computeStrengthCandidates(analyzed: PhotoResult[], data: ShotAnalyticsData): StrengthCandidate[] {
  const bwAvg = bwSubsetAvgScore(analyzed);
  return [
    { key: 'sharpness', present: data.avgSharpnessScore >= STRONG_SHARPNESS, metricValue: data.avgSharpnessScore },
    { key: 'emotion', present: data.emotionShare >= 0.3, metricValue: data.emotionShare },
    { key: 'crowd', present: data.crowdShare >= 0.15 && data.emotionShare >= 0.25, metricValue: data.crowdShare },
    { key: 'bw', present: bwAvg != null && bwAvg >= data.avgOverallScore + 8, metricValue: bwAvg ?? 0 },
    { key: 'portrait', present: data.portraitLikelyShare >= 0.2 && data.avgOverallScore >= 65, metricValue: data.portraitLikelyShare },
    { key: 'exposure', present: data.avgExposureScore >= 85, metricValue: data.avgExposureScore },
  ];
}

interface WeaknessCandidate {
  key: string;
  present: boolean;
  severity: number; // 0-1-ish scale for ranking practice-area priority
  vars?: Record<string, string | number>;
}

function computeWeaknessCandidates(data: ShotAnalyticsData): WeaknessCandidate[] {
  const focalWeak = data.focalLengthStats.find((b) => b.avgSharpnessScore <= data.avgSharpnessScore - 12);
  const isoWeak = data.isoStats.find((b) => b.avgOverallScore <= data.avgOverallScore - 12);
  return [
    {
      key: 'focalRange',
      present: !!focalWeak,
      severity: focalWeak ? data.avgSharpnessScore - focalWeak.avgSharpnessScore : 0,
      vars: focalWeak ? { focal: focalWeak.label, percent: Math.round(focalWeak.blurryShare * 100) } : undefined,
    },
    { key: 'closedEyes', present: data.closedEyesShare >= WEAK_SHARE, severity: data.closedEyesShare, vars: { percent: Math.round(data.closedEyesShare * 100) } },
    { key: 'motionBlur', present: data.motionBlurShare >= WEAK_SHARE, severity: data.motionBlurShare, vars: { percent: Math.round(data.motionBlurShare * 100) } },
    { key: 'overexposed', present: data.overexposedShare >= WEAK_SHARE, severity: data.overexposedShare, vars: { percent: Math.round(data.overexposedShare * 100) } },
    { key: 'underexposed', present: data.underexposedShare >= WEAK_SHARE, severity: data.underexposedShare, vars: { percent: Math.round(data.underexposedShare * 100) } },
    {
      key: 'highIso',
      present: !!isoWeak,
      severity: isoWeak ? (data.avgOverallScore - isoWeak.avgOverallScore) / 100 : 0,
      vars: isoWeak ? { iso: isoWeak.label } : undefined,
    },
    { key: 'similarSeries', present: data.avgGroupSize >= 3.5 && data.groupCount >= 2, severity: data.avgGroupSize / 10, vars: { size: Math.round(data.avgGroupSize * 10) / 10 } },
  ];
}

function exerciseFor(key: string): { exercise: TextSlot; benefit: TextSlot } {
  const map: Record<string, { exercise: string; benefit: string }> = {
    focalRange: { exercise: 'coaching.exercise.focalRange', benefit: 'coaching.benefit.focalRange' },
    closedEyes: { exercise: 'coaching.exercise.closedEyes', benefit: 'coaching.benefit.closedEyes' },
    motionBlur: { exercise: 'coaching.exercise.motionBlur', benefit: 'coaching.benefit.motionBlur' },
    overexposed: { exercise: 'coaching.exercise.overexposed', benefit: 'coaching.benefit.overexposed' },
    underexposed: { exercise: 'coaching.exercise.underexposed', benefit: 'coaching.benefit.underexposed' },
    highIso: { exercise: 'coaching.exercise.highIso', benefit: 'coaching.benefit.highIso' },
    similarSeries: { exercise: 'coaching.exercise.similarSeries', benefit: 'coaching.benefit.similarSeries' },
  };
  const entry = map[key] ?? { exercise: 'coaching.exercise.generic', benefit: 'coaching.benefit.generic' };
  return { exercise: { key: entry.exercise }, benefit: { key: entry.benefit } };
}

/**
 * Builds the coaching résumé from already-computed, gated analytics
 * (never re-derives numbers) plus prior shooting snapshots for trend
 * comparison. Every claim maps to a specific `TextSlot` key resolved via
 * `t()` at render time — nothing here is free text, so there's nothing
 * for a language model to embellish or invent.
 */
export function buildCoachingResume(
  analyzed: PhotoResult[],
  data: ShotAnalyticsData,
  history: ShootingSnapshot[],
  purpose: Purpose,
): CoachingResume {
  const insufficientDataNotes: TextSlot[] = [];
  const hasEnoughData = data.analyzedCount >= MIN_SAMPLE;

  if (!hasEnoughData) {
    insufficientDataNotes.push({ key: 'coaching.insufficientOverall', vars: { count: data.analyzedCount } });
    return {
      hasEnoughData: false,
      overall: { key: 'coaching.overallInsufficient' },
      strengths: [],
      recurringStrengths: [],
      weaknesses: [],
      practiceAreas: [],
      comparisons: [],
      insufficientDataNotes,
    };
  }

  const strengthCandidates = computeStrengthCandidates(analyzed, data).filter((c) => c.present);
  const weaknessCandidates = computeWeaknessCandidates(data).filter((c) => c.present);

  const strengths: TextSlot[] = strengthCandidates
    .slice(0, 4)
    .map((c) => ({ key: `coaching.strength.${c.key}`, vars: buildStrengthVars(c) }));

  const weaknesses: TextSlot[] = weaknessCandidates
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 4)
    .map((c) => ({ key: `coaching.weakness.${c.key}`, vars: c.vars }));

  const practiceAreas: PracticeArea[] = weaknessCandidates
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .map((c) => {
      const { exercise, benefit } = exerciseFor(c.key);
      return { observation: { key: `coaching.weakness.${c.key}`, vars: c.vars }, exercise, benefit };
    });

  // Recurring strengths: present now AND in at least RECURRING_MIN_PRIOR_HITS of the last 3 prior same-purpose shoots.
  const priorSamePurpose = history.filter((h) => h.purpose === purpose).slice(0, 3);
  const recurringStrengths: TextSlot[] = [];
  if (priorSamePurpose.length >= RECURRING_MIN_PRIOR_HITS) {
    for (const c of strengthCandidates) {
      const hitsInHistory = priorSamePurpose.filter((h) => recurrenceCheck(c.key, h)).length;
      if (hitsInHistory >= RECURRING_MIN_PRIOR_HITS) {
        recurringStrengths.push({ key: `coaching.recurring.${c.key}` });
      }
    }
  }

  const comparisons = buildComparisons(data, history);
  if (history.length < 2) {
    insufficientDataNotes.push({ key: 'coaching.insufficientHistory' });
  }

  const overall = buildOverall(strengths, weaknesses);

  return {
    hasEnoughData: true,
    overall,
    strengths,
    recurringStrengths,
    weaknesses,
    practiceAreas,
    comparisons,
    insufficientDataNotes,
  };
}

function buildStrengthVars(c: StrengthCandidate): Record<string, string | number> | undefined {
  if (c.key === 'emotion' || c.key === 'crowd' || c.key === 'portrait') return { percent: Math.round(c.metricValue * 100) };
  return undefined;
}

/**
 * Cross-shoot recurrence check — deliberately excludes 'sharpness': the
 * sharpness score is percentile-normalized against each shoot's own
 * distribution (see scoring.ts normalizeSharpnessScores), so a 75 in one
 * shoot and a 75 in another aren't on the same absolute scale. Comparing
 * them across shoots would be a fabricated correlation. Exposure and
 * emotion use fixed, absolute thresholds independent of the batch, so
 * those are safe to compare.
 */
function recurrenceCheck(key: string, snapshot: ShootingSnapshot): boolean {
  switch (key) {
    case 'emotion':
      return snapshot.emotionShare >= 0.3;
    case 'exposure':
      return snapshot.avgExposureScore >= 85;
    default:
      return false;
  }
}

function buildOverall(strengths: TextSlot[], weaknesses: TextSlot[]): TextSlot {
  if (strengths.length > 0 && weaknesses.length > 0) return { key: 'coaching.overall.mixed' };
  if (strengths.length > 0) return { key: 'coaching.overall.strong' };
  if (weaknesses.length > 0) return { key: 'coaching.overall.weak' };
  return { key: 'coaching.overall.neutral' };
}

/**
 * Only compares metrics that are on a fixed, absolute scale across
 * shoots: exposureScore uses fixed clipping/luminance thresholds,
 * emotionShare and portraitShare are plain ratios. Deliberately excludes
 * avgSharpnessScore (percentile-normalized per shoot, not comparable
 * across different shoots' distributions) and selectionRate (in "fixed
 * count" mode this is just whatever target count the user typed, not a
 * quality signal) — claiming a trend from either would be exactly the
 * kind of invented correlation this résumé is meant to avoid.
 */
function buildComparisons(data: ShotAnalyticsData, history: ShootingSnapshot[]): TextSlot[] {
  if (history.length < 2) return [];
  const recentPrior = history.slice(0, 3);
  const priorAvgExposure = recentPrior.reduce((s, h) => s + h.avgExposureScore, 0) / recentPrior.length;
  const priorAvgPortraitShare = recentPrior.reduce((s, h) => s + h.portraitShare, 0) / recentPrior.length;
  const priorAvgEmotionShare = recentPrior.reduce((s, h) => s + h.emotionShare, 0) / recentPrior.length;

  const comparisons: TextSlot[] = [];
  if (data.avgExposureScore >= priorAvgExposure + 8) {
    comparisons.push({ key: 'coaching.trend.exposureUp' });
  } else if (data.avgExposureScore <= priorAvgExposure - 8) {
    comparisons.push({ key: 'coaching.trend.exposureDown' });
  }
  if (data.portraitShare >= priorAvgPortraitShare + 0.15) {
    comparisons.push({ key: 'coaching.trend.morePortrait' });
  }
  if (data.emotionShare >= priorAvgEmotionShare + 0.15) {
    comparisons.push({ key: 'coaching.trend.moreEmotion' });
  }
  return comparisons;
}
