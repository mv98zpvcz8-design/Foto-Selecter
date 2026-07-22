import { describe, expect, it } from 'vitest';
import { scorePhotos, selectTopN, selectTriage, tierForScore, TIER_EDIT_THRESHOLD, TIER_POTENTIAL_THRESHOLD } from './scoring';
import { PURPOSE_WEIGHTS } from './profiles';
import { makePhoto } from '../test/helpers';
import type { PhotoResult } from '../types';

describe('tierForScore', () => {
  it('classifies edit/potential/skip at the documented thresholds', () => {
    expect(tierForScore(TIER_EDIT_THRESHOLD)).toBe('edit');
    expect(tierForScore(TIER_EDIT_THRESHOLD - 1)).toBe('potential');
    expect(tierForScore(TIER_POTENTIAL_THRESHOLD)).toBe('potential');
    expect(tierForScore(TIER_POTENTIAL_THRESHOLD - 1)).toBe('skip');
  });
});

describe('scorePhotos', () => {
  it('normalizes sharpness relative to the batch, not to an absolute scale', () => {
    const photos = [
      makePhoto({ sharpnessRaw: 10, shadowClipping: 0, highlightClipping: 0, meanLuminance: 128 }),
      makePhoto({ sharpnessRaw: 50, shadowClipping: 0, highlightClipping: 0, meanLuminance: 128 }),
      makePhoto({ sharpnessRaw: 100, shadowClipping: 0, highlightClipping: 0, meanLuminance: 128 }),
    ];
    scorePhotos(photos, PURPOSE_WEIGHTS.sonstiges);

    expect(photos[0].sharpnessScore).toBeLessThan(photos[1].sharpnessScore!);
    expect(photos[1].sharpnessScore).toBeLessThan(photos[2].sharpnessScore!);
    for (const p of photos) {
      expect(p.sharpnessScore).toBeGreaterThanOrEqual(0);
      expect(p.sharpnessScore).toBeLessThanOrEqual(100);
    }
  });

  it('gives a neutral face score of 100 when no faces were detected', () => {
    const photos = [makePhoto({ sharpnessRaw: 50, facesDetected: 0 })];
    scorePhotos(photos, PURPOSE_WEIGHTS.kunde);
    expect(photos[0].faceScore).toBe(100);
  });

  it('penalizes closed eyes proportionally to the share of faces affected', () => {
    const photos = [makePhoto({ sharpnessRaw: 50, facesDetected: 4, facesWithClosedEyes: 1 })];
    scorePhotos(photos, PURPOSE_WEIGHTS.kunde);
    expect(photos[0].faceScore).toBe(75);
  });

  it('rewards selective focus: subject sharpness rescues an otherwise soft frame', () => {
    const bokehShot = makePhoto({ sharpnessRaw: 5, subjectSharpnessRaw: 90 });
    const genuinelyBlurry = makePhoto({ sharpnessRaw: 5, subjectSharpnessRaw: 5 });
    scorePhotos([bokehShot, genuinelyBlurry], PURPOSE_WEIGHTS.portfolio);
    expect(bokehShot.sharpnessScore).toBeGreaterThan(genuinelyBlurry.sharpnessScore!);
  });

  it('penalizes exposure clipping and off-target mean luminance', () => {
    const wellExposed = makePhoto({ sharpnessRaw: 50, shadowClipping: 0, highlightClipping: 0, meanLuminance: 130 });
    const blownOut = makePhoto({ sharpnessRaw: 50, shadowClipping: 0, highlightClipping: 0.3, meanLuminance: 230 });
    scorePhotos([wellExposed, blownOut], PURPOSE_WEIGHTS.sonstiges);
    expect(wellExposed.exposureScore).toBeGreaterThan(blownOut.exposureScore!);
  });

  it('skips photos that are not status=done', () => {
    const photos = [makePhoto({ status: 'error', sharpnessRaw: 50 })];
    scorePhotos(photos, PURPOSE_WEIGHTS.sonstiges);
    expect(photos[0].overallScore).toBeUndefined();
  });
});

// scorePhotos derives group membership itself (from hash + captureTime,
// see grouping.ts) — assigning groupId/groupRank on the fixture directly
// would just get overwritten, so bursts are simulated with a shared hash
// and close capture times instead.
const now = new Date('2024-01-01T12:00:00Z');
function burstPhoto(overrides: Partial<PhotoResult> & { sharpnessRaw: number }, hash: bigint, offsetMs: number) {
  return makePhoto({ hash, captureTime: new Date(now.getTime() + offsetMs), ...overrides });
}

describe('selectTopN', () => {
  it('picks exactly targetCount photos, preferring distinct groups over group runner-ups', () => {
    const groupBest = burstPhoto({ sharpnessRaw: 90 }, 1n, 0);
    const groupRunnerUp = burstPhoto({ sharpnessRaw: 85 }, 1n, 100);
    const otherGroupBest = makePhoto({ sharpnessRaw: 60 });
    const weakestSingleton = makePhoto({ sharpnessRaw: 30 });
    const photos = [groupBest, groupRunnerUp, otherGroupBest, weakestSingleton];
    scorePhotos(photos, PURPOSE_WEIGHTS.sonstiges);
    selectTopN(photos, 2);

    expect(groupBest.groupId).toBe(groupRunnerUp.groupId);
    expect(photos.filter((p) => p.isSelected)).toHaveLength(2);
    expect(groupBest.isSelected).toBe(true);
    // the runner-up from the already-represented group loses out to a
    // distinct group's own best frame, even though it scores higher
    expect(groupRunnerUp.isSelected).toBe(false);
    expect(otherGroupBest.isSelected).toBe(true);
  });

  it('falls back to runner-up frames when target exceeds the number of distinct groups', () => {
    const photos = [burstPhoto({ sharpnessRaw: 90 }, 1n, 0), burstPhoto({ sharpnessRaw: 85 }, 1n, 100)];
    scorePhotos(photos, PURPOSE_WEIGHTS.sonstiges);
    selectTopN(photos, 2);
    expect(photos.filter((p) => p.isSelected)).toHaveLength(2);
  });
});

describe('selectTriage', () => {
  it('picks the best photo per group and tiers it, leaving group runner-ups unselected', () => {
    const strong = burstPhoto(
      { sharpnessRaw: 95, shadowClipping: 0, highlightClipping: 0, meanLuminance: 130 },
      2n,
      0,
    );
    const weakSibling = burstPhoto(
      { sharpnessRaw: 40, shadowClipping: 0, highlightClipping: 0, meanLuminance: 130 },
      2n,
      100,
    );
    const photos = [strong, weakSibling];
    scorePhotos(photos, PURPOSE_WEIGHTS.sonstiges);
    selectTriage(photos);

    expect(strong.groupId).toBe(weakSibling.groupId);
    expect(strong.isPreselected).toBe(true);
    expect(weakSibling.isPreselected).toBe(false);
    expect(strong.tier).toBeDefined();
    expect(strong.isSelected).toBe(strong.tier === 'edit');
  });
});
