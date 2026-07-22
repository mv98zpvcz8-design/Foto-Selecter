import { describe, expect, it } from 'vitest';
import { filterConfidenceFor, filterMatches, matchesActiveFilters, FILTER_DEFS } from './filters';
import { makePhoto, tag } from '../test/helpers';

describe('filterMatches', () => {
  it('matches a tag-based filter by confidence threshold', () => {
    const photo = makePhoto({ semanticTags: [tag('bw', 0.8)] });
    expect(filterMatches(photo, FILTER_DEFS.bw)).toBe(true);
    expect(filterMatches(photo, FILTER_DEFS.color)).toBe(false);
  });

  it('respects a filter-specific minConfidence override', () => {
    const photo = makePhoto({ semanticTags: [tag('bw', 0.3)] });
    expect(filterMatches(photo, FILTER_DEFS.bw)).toBe(false); // default threshold is 0.5
  });

  it('negates the underlying tag for negate filters (noClosedEyes)', () => {
    const eyesClosed = makePhoto({ semanticTags: [tag('closedEyes', 0.9)] });
    const eyesOpen = makePhoto({ semanticTags: [] });
    expect(filterMatches(eyesClosed, FILTER_DEFS.noClosedEyes)).toBe(false);
    expect(filterMatches(eyesOpen, FILTER_DEFS.noClosedEyes)).toBe(true);
  });

  it('matches a numeric field filter within its gte/lte bounds', () => {
    const sharp = makePhoto({ sharpnessScore: 90 });
    const soft = makePhoto({ sharpnessScore: 45 });
    expect(filterMatches(sharp, FILTER_DEFS.verySharp)).toBe(true);
    expect(filterMatches(soft, FILTER_DEFS.verySharp)).toBe(false);
    expect(filterMatches(soft, FILTER_DEFS.slightlySoft)).toBe(true);
  });

  it('matches orientation filters', () => {
    const portrait = makePhoto({ orientation: 'portrait' });
    expect(filterMatches(portrait, FILTER_DEFS.portraitOrientation)).toBe(true);
    expect(filterMatches(portrait, FILTER_DEFS.landscapeOrientation)).toBe(false);
  });

  it('matches the favorite filter against isFavorite', () => {
    expect(filterMatches(makePhoto({ isFavorite: true }), FILTER_DEFS.onlyFavorites)).toBe(true);
    expect(filterMatches(makePhoto({ isFavorite: false }), FILTER_DEFS.onlyFavorites)).toBe(false);
  });
});

describe('matchesActiveFilters', () => {
  const sharpAndBw = makePhoto({ sharpnessScore: 90, semanticTags: [tag('bw', 0.9)] });
  const sharpAndColor = makePhoto({ sharpnessScore: 90, semanticTags: [tag('color', 0.9)] });

  it('returns true for every photo when no filters are active', () => {
    expect(matchesActiveFilters(sharpAndColor, [], 'and')).toBe(true);
  });

  it('AND mode requires every active filter to match', () => {
    expect(matchesActiveFilters(sharpAndBw, ['verySharp', 'bw'], 'and')).toBe(true);
    expect(matchesActiveFilters(sharpAndColor, ['verySharp', 'bw'], 'and')).toBe(false);
  });

  it('OR mode requires only one active filter to match', () => {
    expect(matchesActiveFilters(sharpAndColor, ['bw', 'color'], 'or')).toBe(true);
  });

  it('ignores unknown filter keys instead of throwing', () => {
    expect(matchesActiveFilters(sharpAndBw, ['not-a-real-filter'], 'and')).toBe(true);
  });
});

describe('filterConfidenceFor', () => {
  it('returns the underlying tag confidence for tag-based filters', () => {
    const photo = makePhoto({ semanticTags: [tag('bw', 0.73)] });
    expect(filterConfidenceFor(photo, 'bw')).toBe(0.73);
  });

  it('returns undefined for deterministic (non-tag) filters', () => {
    const photo = makePhoto({ sharpnessScore: 90 });
    expect(filterConfidenceFor(photo, 'verySharp')).toBeUndefined();
    expect(filterConfidenceFor(photo, 'onlyFavorites')).toBeUndefined();
  });
});
