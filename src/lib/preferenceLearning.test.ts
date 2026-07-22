import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllPreferenceData,
  computePreferenceScore,
  extractFeatures,
  getPersonalizationStatus,
  getPreferenceSummary,
  recordSignal,
  resetProfile,
  toPreferenceProfileKey,
} from './preferenceLearning';
import { makePhoto, tag } from '../test/helpers';

beforeEach(async () => {
  await clearAllPreferenceData();
});

describe('toPreferenceProfileKey', () => {
  it('maps purposes with a dedicated profile onto themselves', () => {
    expect(toPreferenceProfileKey('kunde')).toBe('kunde');
    expect(toPreferenceProfileKey('instagram')).toBe('instagram');
  });

  it('folds purposes without a dedicated profile into "general" instead of dropping them', () => {
    expect(toPreferenceProfileKey('video')).toBe('general');
    expect(toPreferenceProfileKey('presse')).toBe('general');
    expect(toPreferenceProfileKey('favoriten')).toBe('general');
    expect(toPreferenceProfileKey('sonstiges')).toBe('general');
  });
});

describe('extractFeatures', () => {
  it('normalizes scores to roughly 0-1 and reads tag confidences directly', () => {
    const photo = makePhoto({
      sharpnessScore: 80,
      exposureScore: 60,
      orientation: 'portrait',
      semanticTags: [tag('bw', 0.7)],
    });
    const features = extractFeatures(photo);
    expect(features.sharpness).toBeCloseTo(0.8);
    expect(features.exposure).toBeCloseTo(0.6);
    expect(features.portrait).toBe(1);
    expect(features.landscape).toBe(0);
    expect(features.bw).toBeCloseTo(0.7);
  });
});

describe('getPersonalizationStatus', () => {
  it('gates status on the documented decision-count thresholds', () => {
    expect(getPersonalizationStatus(0)).toBe('insufficient');
    expect(getPersonalizationStatus(9)).toBe('insufficient');
    expect(getPersonalizationStatus(10)).toBe('early');
    expect(getPersonalizationStatus(29)).toBe('early');
    expect(getPersonalizationStatus(30)).toBe('usable');
    expect(getPersonalizationStatus(99)).toBe('usable');
    expect(getPersonalizationStatus(100)).toBe('wellPersonalized');
  });
});

describe('recordSignal / computePreferenceScore', () => {
  it('returns a neutral 50 score with zero decisions before any signal is recorded', async () => {
    const photo = makePhoto({ sharpnessScore: 80 });
    const result = await computePreferenceScore('kunde', photo);
    expect(result.score).toBe(50);
    expect(result.decisionCount).toBe(0);
    expect(result.status).toBe('insufficient');
  });

  it('scores a photo similar to what was liked higher than one similar to what was disliked', async () => {
    const liked = makePhoto({ sharpnessScore: 90, exposureScore: 90, orientation: 'portrait' });
    const disliked = makePhoto({ sharpnessScore: 10, exposureScore: 10, orientation: 'landscape' });
    await recordSignal('kunde', liked, 'selected');
    await recordSignal('kunde', disliked, 'rejected');

    const similarToLiked = makePhoto({ sharpnessScore: 85, exposureScore: 85, orientation: 'portrait' });
    const similarToDisliked = makePhoto({ sharpnessScore: 15, exposureScore: 15, orientation: 'landscape' });

    const scoreLiked = await computePreferenceScore('kunde', similarToLiked);
    const scoreDisliked = await computePreferenceScore('kunde', similarToDisliked);
    expect(scoreLiked.score).toBeGreaterThan(scoreDisliked.score);
    expect(scoreLiked.decisionCount).toBe(2);
  });

  it('keeps profiles independent — a signal under one profile does not affect another', async () => {
    const liked = makePhoto({ sharpnessScore: 90 });
    await recordSignal('kunde', liked, 'selected');
    const result = await computePreferenceScore('instagram', liked);
    expect(result.decisionCount).toBe(0);
  });

  it('resetProfile clears both the centroid and its decision count', async () => {
    const photo = makePhoto({ sharpnessScore: 90 });
    await recordSignal('sport', photo, 'favorite');
    expect((await computePreferenceScore('sport', photo)).decisionCount).toBe(1);

    await resetProfile('sport');
    const after = await computePreferenceScore('sport', photo);
    expect(after.decisionCount).toBe(0);
    expect(after.score).toBe(50);
  });

  it('getPreferenceSummary reports the decision count and a resettable state', async () => {
    const photo = makePhoto({ sharpnessScore: 90, orientation: 'portrait' });
    await recordSignal('portfolio', photo, 'seriesWinner');
    const summary = await getPreferenceSummary('portfolio');
    expect(summary.decisionCount).toBe(1);
    expect(summary.profileKey).toBe('portfolio');
  });
});
