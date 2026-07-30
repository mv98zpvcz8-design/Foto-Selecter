import { describe, expect, it } from 'vitest';
import { smartObjectPosition } from './smartObjectPosition';
import { makePhoto } from '../../test/helpers';

describe('smartObjectPosition', () => {
  it('falls back to a slightly-above-center point when no face was detected', () => {
    expect(smartObjectPosition(makePhoto())).toBe('50% 42%');
  });

  it('converts a normalized subject center into a CSS object-position percentage', () => {
    expect(smartObjectPosition(makePhoto({ subjectCenter: { x: 0.2, y: 0.1 } }))).toBe('20% 10%');
  });

  it('clamps out-of-range centers into the valid 0-100% range', () => {
    expect(smartObjectPosition(makePhoto({ subjectCenter: { x: -0.5, y: 1.5 } }))).toBe('0% 100%');
  });
});
