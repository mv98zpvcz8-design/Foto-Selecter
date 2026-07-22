import { describe, expect, it } from 'vitest';
import { normalizeWeights, resolveStyleHint, resolveWeights, PURPOSE_WEIGHTS } from './profiles';
import type { CustomPreset } from '../types';

describe('resolveWeights', () => {
  it('returns the built-in purpose weights for a builtin profile ref', () => {
    expect(resolveWeights({ kind: 'builtin', purpose: 'sport' }, [])).toBe(PURPOSE_WEIGHTS.sport);
  });

  it('returns a custom preset\'s own weights when found', () => {
    const preset: CustomPreset = {
      id: 'p1',
      name: 'Mine',
      weights: { sharpness: 0.5, exposure: 0.2, group: 0.1, faces: 0.2 },
      styleHint: 'kunde',
    };
    expect(resolveWeights({ kind: 'custom', presetId: 'p1' }, [preset])).toBe(preset.weights);
  });

  it('falls back to the "sonstiges" weights when a custom preset id is not found', () => {
    expect(resolveWeights({ kind: 'custom', presetId: 'missing' }, [])).toBe(PURPOSE_WEIGHTS.sonstiges);
  });
});

describe('resolveStyleHint', () => {
  it('returns the purpose directly for a builtin ref', () => {
    expect(resolveStyleHint({ kind: 'builtin', purpose: 'instagram' }, [])).toBe('instagram');
  });

  it('returns a custom preset\'s styleHint when found, else "sonstiges"', () => {
    const preset: CustomPreset = {
      id: 'p1',
      name: 'Mine',
      weights: { sharpness: 0.25, exposure: 0.25, group: 0.25, faces: 0.25 },
      styleHint: 'portfolio',
    };
    expect(resolveStyleHint({ kind: 'custom', presetId: 'p1' }, [preset])).toBe('portfolio');
    expect(resolveStyleHint({ kind: 'custom', presetId: 'missing' }, [preset])).toBe('sonstiges');
  });
});

describe('normalizeWeights', () => {
  it('scales arbitrary positive values so they sum to 1', () => {
    const result = normalizeWeights({ sharpness: 2, exposure: 2, group: 4, faces: 2 });
    const sum = result.sharpness + result.exposure + result.group + result.faces;
    expect(sum).toBeCloseTo(1, 10);
    expect(result.group).toBeCloseTo(0.4, 10);
  });

  it('falls back to an even split when the total is zero or negative', () => {
    expect(normalizeWeights({ sharpness: 0, exposure: 0, group: 0, faces: 0 })).toEqual({
      sharpness: 0.25,
      exposure: 0.25,
      group: 0.25,
      faces: 0.25,
    });
  });
});
