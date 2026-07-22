import { describe, expect, it } from 'vitest';
import { computeShotAnalytics } from './analytics';
import { makePhoto, tag } from '../test/helpers';

describe('computeShotAnalytics', () => {
  it('computes basic counts and shares from a small analyzed batch', () => {
    const photos = [
      makePhoto({ status: 'done', isSelected: true, orientation: 'portrait', sharpnessScore: 80, exposureScore: 70, overallScore: 75 }),
      makePhoto({ status: 'done', isSelected: false, orientation: 'landscape', sharpnessScore: 40, exposureScore: 60, overallScore: 50 }),
      makePhoto({ status: 'error' }), // should be excluded from analyzed-based shares
    ];
    const data = computeShotAnalytics(photos, 'kunde');

    expect(data.photoCount).toBe(3);
    expect(data.analyzedCount).toBe(2);
    expect(data.selectedCount).toBe(1);
    expect(data.selectionRate).toBeCloseTo(0.5);
    expect(data.rejectionRate).toBeCloseTo(0.5);
    expect(data.portraitShare).toBeCloseTo(0.5);
    expect(data.landscapeShare).toBeCloseTo(0.5);
  });

  it('only reports a bucket stat once it reaches the minimum sample size', () => {
    const photos = [
      makePhoto({ status: 'done', focalLengthMm: 24, sharpnessScore: 90 }),
      makePhoto({ status: 'done', focalLengthMm: 24, sharpnessScore: 90 }),
      // only 2 photos at 24mm — below MIN_BUCKET_SAMPLE (3), should not surface a focal-length bucket
    ];
    const data = computeShotAnalytics(photos, 'sonstiges');
    expect(data.focalLengthStats).toHaveLength(0);
  });

  it('surfaces a focal-length-weak insight once a bucket is well below the batch average', () => {
    const weakBucket = [
      makePhoto({ status: 'done', focalLengthMm: 200, sharpnessScore: 10 }),
      makePhoto({ status: 'done', focalLengthMm: 200, sharpnessScore: 10 }),
      makePhoto({ status: 'done', focalLengthMm: 200, sharpnessScore: 10 }),
    ];
    const strongRest = [
      makePhoto({ status: 'done', focalLengthMm: 50, sharpnessScore: 90 }),
      makePhoto({ status: 'done', focalLengthMm: 50, sharpnessScore: 90 }),
      makePhoto({ status: 'done', focalLengthMm: 50, sharpnessScore: 90 }),
    ];
    const data = computeShotAnalytics([...weakBucket, ...strongRest], 'sonstiges');
    expect(data.insights.some((i) => i.textKey === 'insight.focalLengthWeak')).toBe(true);
  });

  it('derives color/emotion shares from semantic tags at the default confidence threshold', () => {
    const photos = [
      makePhoto({ status: 'done', semanticTags: [tag('bw', 0.9)] }),
      makePhoto({ status: 'done', semanticTags: [tag('color', 0.9)] }),
    ];
    const data = computeShotAnalytics(photos, 'sonstiges');
    expect(data.bwShare).toBeCloseTo(0.5);
    expect(data.colorShare).toBeCloseTo(0.5);
  });

  it('returns all-zero shares for an empty batch without throwing', () => {
    const data = computeShotAnalytics([], 'sonstiges');
    expect(data.photoCount).toBe(0);
    expect(data.selectionRate).toBe(0);
    expect(data.insights).toEqual([]);
  });
});
