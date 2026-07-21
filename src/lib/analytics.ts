import { focalLengthBucket } from './exifMeta';
import type { PhotoResult, Purpose } from '../types';

// A bucket/comparison is only surfaced as an insight when it has at least
// this many photos — small samples produce noisy averages that would
// otherwise read as a confident claim.
const MIN_BUCKET_SAMPLE = 3;
// How far a bucket's rate/score has to differ from the overall average
// before it's worth mentioning as a pattern rather than noise.
const MIN_SHARPNESS_GAP = 12; // score points
const MIN_SHARE_GAP = 0.15; // 15 percentage points

export interface BucketStat {
  label: string;
  count: number;
  avgSharpnessScore: number;
  avgOverallScore: number;
  blurryShare: number;
}

export interface Insight {
  key: string;
  textKey: string;
  vars: Record<string, string | number>;
}

export interface ShotAnalyticsData {
  photoCount: number;
  analyzedCount: number;
  selectedCount: number;
  selectionRate: number;
  rejectionRate: number;
  groupCount: number;
  avgGroupSize: number;
  avgOverallScore: number;
  avgSharpnessScore: number;
  avgExposureScore: number;
  portraitShare: number;
  landscapeShare: number;
  squareShare: number;
  bwShare: number;
  colorShare: number;
  closedEyesShare: number;
  overexposedShare: number;
  underexposedShare: number;
  motionBlurShare: number;
  emotionShare: number;
  crowdShare: number;
  portraitLikelyShare: number;
  groupPhotoShare: number;
  focalLengthStats: BucketStat[];
  isoStats: BucketStat[];
  cameraStats: BucketStat[];
  lensStats: BucketStat[];
  insights: Insight[];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function share(photos: PhotoResult[], predicate: (p: PhotoResult) => boolean): number {
  if (photos.length === 0) return 0;
  return photos.filter(predicate).length / photos.length;
}

function hasTag(photo: PhotoResult, key: string, minConfidence = 0.5): boolean {
  return (photo.semanticTags?.find((t) => t.key === key)?.confidence ?? 0) >= minConfidence;
}

function isoBucket(iso: number): string {
  if (iso < 400) return '< 400';
  if (iso < 1600) return '400-1600';
  if (iso < 6400) return '1600-6400';
  return '> 6400';
}

function bucketStats(photos: PhotoResult[], bucketOf: (p: PhotoResult) => string | undefined): BucketStat[] {
  const byBucket = new Map<string, PhotoResult[]>();
  for (const p of photos) {
    const b = bucketOf(p);
    if (!b) continue;
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b)!.push(p);
  }
  return [...byBucket.entries()]
    .map(([label, members]) => ({
      label,
      count: members.length,
      avgSharpnessScore: Math.round(avg(members.map((p) => p.sharpnessScore ?? 0))),
      avgOverallScore: Math.round(avg(members.map((p) => p.overallScore ?? 0))),
      blurryShare: share(members, (p) => (p.sharpnessScore ?? 0) < 40),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Computes the structured Shot Analytics numbers for one shoot. Every
 * value here comes directly from what the pipeline already measured — no
 * additional AI calls. `insights` is the gated subset worth surfacing as
 * prose (see MIN_BUCKET_SAMPLE / MIN_SHARPNESS_GAP / MIN_SHARE_GAP).
 */
export function computeShotAnalytics(allPhotos: PhotoResult[], purpose: Purpose): ShotAnalyticsData {
  const analyzed = allPhotos.filter((p) => p.status === 'done');
  const selected = allPhotos.filter((p) => p.isSelected);

  const groupIds = new Set(analyzed.map((p) => p.groupId).filter((g) => g != null));
  const groupSizes = [...groupIds].map((gid) => analyzed.filter((p) => p.groupId === gid).length);

  const focalLengthStats = bucketStats(
    analyzed.filter((p) => p.focalLengthMm != null),
    (p) => focalLengthBucket(p.focalLengthMm!),
  ).filter((b) => b.count >= MIN_BUCKET_SAMPLE);

  const isoStats = bucketStats(
    analyzed.filter((p) => p.iso != null),
    (p) => isoBucket(p.iso!),
  ).filter((b) => b.count >= MIN_BUCKET_SAMPLE);

  const cameraStats = bucketStats(analyzed.filter((p) => p.camera), (p) => p.camera).filter(
    (b) => b.count >= MIN_BUCKET_SAMPLE,
  );
  const lensStats = bucketStats(analyzed.filter((p) => p.lens), (p) => p.lens).filter(
    (b) => b.count >= MIN_BUCKET_SAMPLE,
  );

  const data: ShotAnalyticsData = {
    photoCount: allPhotos.length,
    analyzedCount: analyzed.length,
    selectedCount: selected.length,
    selectionRate: analyzed.length ? selected.length / analyzed.length : 0,
    rejectionRate: analyzed.length ? 1 - selected.length / analyzed.length : 0,
    groupCount: groupIds.size,
    avgGroupSize: groupSizes.length ? avg(groupSizes) : 0,
    avgOverallScore: Math.round(avg(analyzed.map((p) => p.overallScore ?? 0))),
    avgSharpnessScore: Math.round(avg(analyzed.map((p) => p.sharpnessScore ?? 0))),
    avgExposureScore: Math.round(avg(analyzed.map((p) => p.exposureScore ?? 0))),
    portraitShare: share(analyzed, (p) => p.orientation === 'portrait'),
    landscapeShare: share(analyzed, (p) => p.orientation === 'landscape'),
    squareShare: share(analyzed, (p) => p.orientation === 'square'),
    bwShare: share(analyzed, (p) => hasTag(p, 'bw')),
    colorShare: share(analyzed, (p) => hasTag(p, 'color')),
    closedEyesShare: share(analyzed, (p) => (p.facesWithClosedEyes ?? 0) > 0),
    overexposedShare: share(analyzed, (p) => hasTag(p, 'overexposed')),
    underexposedShare: share(analyzed, (p) => hasTag(p, 'underexposed')),
    motionBlurShare: share(analyzed, (p) => hasTag(p, 'motionBlur')),
    emotionShare: share(analyzed, (p) => hasTag(p, 'emotion')),
    crowdShare: share(analyzed, (p) => hasTag(p, 'crowdLikely')),
    portraitLikelyShare: share(analyzed, (p) => hasTag(p, 'portraitLikely')),
    groupPhotoShare: share(analyzed, (p) => hasTag(p, 'groupPhotoLikely')),
    focalLengthStats,
    isoStats,
    cameraStats,
    lensStats,
    insights: [],
  };

  data.insights = buildInsights(analyzed, data, purpose);
  return data;
}

function buildInsights(analyzed: PhotoResult[], data: ShotAnalyticsData, purpose: Purpose): Insight[] {
  const insights: Insight[] = [];

  for (const bucket of data.focalLengthStats) {
    if (bucket.avgSharpnessScore <= data.avgSharpnessScore - MIN_SHARPNESS_GAP) {
      insights.push({
        key: `focal-weak-${bucket.label}`,
        textKey: 'insight.focalLengthWeak',
        vars: { focal: bucket.label, percent: Math.round(bucket.blurryShare * 100) },
      });
    } else if (bucket.avgSharpnessScore >= data.avgSharpnessScore + MIN_SHARPNESS_GAP) {
      insights.push({
        key: `focal-strong-${bucket.label}`,
        textKey: 'insight.focalLengthStrong',
        vars: { focal: bucket.label },
      });
    }
  }

  for (const bucket of data.isoStats) {
    if (bucket.avgOverallScore <= data.avgOverallScore - MIN_SHARPNESS_GAP) {
      insights.push({
        key: `iso-weak-${bucket.label}`,
        textKey: 'insight.isoWeak',
        vars: { iso: bucket.label },
      });
    }
  }

  for (const bucket of data.lensStats) {
    if (bucket.avgOverallScore >= data.avgOverallScore + MIN_SHARPNESS_GAP) {
      insights.push({ key: `lens-strong-${bucket.label}`, textKey: 'insight.lensStrong', vars: { lens: bucket.label } });
    }
  }

  if (purpose === 'instagram' || purpose === 'event') {
    const portraitPhotos = analyzed.filter((p) => p.orientation === 'portrait');
    const landscapePhotos = analyzed.filter((p) => p.orientation === 'landscape');
    if (portraitPhotos.length >= MIN_BUCKET_SAMPLE && landscapePhotos.length >= MIN_BUCKET_SAMPLE) {
      const portraitAvg = avg(portraitPhotos.map((p) => p.overallScore ?? 0));
      const landscapeAvg = avg(landscapePhotos.map((p) => p.overallScore ?? 0));
      if (portraitAvg >= landscapeAvg + MIN_SHARPNESS_GAP) {
        insights.push({ key: 'portrait-stronger', textKey: 'insight.portraitStronger', vars: {} });
      }
    }
  }

  const crowdPhotos = analyzed.filter((p) => hasTag(p, 'crowdLikely'));
  if (crowdPhotos.length >= MIN_BUCKET_SAMPLE) {
    const crowdEmotionShare = share(crowdPhotos, (p) => hasTag(p, 'emotion'));
    if (crowdEmotionShare >= data.emotionShare + MIN_SHARE_GAP) {
      insights.push({
        key: 'crowd-emotional',
        textKey: 'insight.crowdEmotional',
        vars: { percent: Math.round(crowdEmotionShare * 100) },
      });
    }
  }

  if (data.closedEyesShare >= MIN_SHARE_GAP && data.analyzedCount >= MIN_BUCKET_SAMPLE) {
    insights.push({ key: 'closed-eyes', textKey: 'insight.closedEyesShare', vars: { percent: Math.round(data.closedEyesShare * 100) } });
  }

  if (data.avgGroupSize >= 3 && data.analyzedCount >= MIN_BUCKET_SAMPLE) {
    insights.push({ key: 'large-series', textKey: 'insight.largeSeries', vars: { size: Math.round(data.avgGroupSize * 10) / 10 } });
  }

  return insights;
}
