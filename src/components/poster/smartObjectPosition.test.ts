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

  it('centers on the full face-to-face span instead of the average point when two subjects sit at very different heights', () => {
    // Average center would be y=0.3, but that leaves the lower face (whose
    // box runs down to 0.7) with far less margin than the higher one.
    const photo = makePhoto({
      subjectCenter: { x: 0.5, y: 0.3 },
      subjectYExtent: { top: 0.1, bottom: 0.7 },
    });
    expect(smartObjectPosition(photo)).toBe('50% 40%');
  });
});
