import { describe, expect, it } from 'vitest';
import { pickHeroPhoto } from './pickHeroPhoto';
import { makePhoto } from '../../test/helpers';

describe('pickHeroPhoto', () => {
  it('falls back to the top-scored photo when none have emotion data', () => {
    const photos = [makePhoto({ overallScore: 90 }), makePhoto({ overallScore: 80 })];
    expect(pickHeroPhoto(photos, 'expressive')).toBe(photos[0]);
  });

  it('picks the most expressive of the top-scored candidates for an expressive template', () => {
    const photos = [
      makePhoto({ overallScore: 95, emotionScores: { neutral: 0.9 } }), // top score, but flat expression
      makePhoto({ overallScore: 88, emotionScores: { neutral: 0.1 } }), // more expressive
      makePhoto({ overallScore: 60, emotionScores: { neutral: 0.05 } }), // most expressive, but too far down the score order to be a candidate
    ];
    expect(pickHeroPhoto(photos, 'expressive', 2)).toBe(photos[1]);
  });

  it('picks the calmest of the top-scored candidates for a calm template', () => {
    const photos = [
      makePhoto({ overallScore: 95, emotionScores: { neutral: 0.2 } }),
      makePhoto({ overallScore: 88, emotionScores: { neutral: 0.85 } }),
    ];
    expect(pickHeroPhoto(photos, 'calm')).toBe(photos[1]);
  });

  it('never drops below the score-ordered candidate pool, even if a lower-scored photo would fit the energy better', () => {
    const photos = [
      makePhoto({ overallScore: 95, emotionScores: { neutral: 0.95 } }),
      makePhoto({ overallScore: 40, emotionScores: { neutral: 0.0 } }),
    ];
    // poolSize 1 -- only the top-scored photo is ever a candidate.
    expect(pickHeroPhoto(photos, 'expressive', 1)).toBe(photos[0]);
  });
});
