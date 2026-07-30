import { describe, expect, it } from 'vitest';
import { buildPalette, mixRgb, readableTextColor, toHex } from './colorPalette';

describe('toHex', () => {
  it('formats and clamps to a 6-digit hex string', () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(toHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
    expect(toHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080');
  });
});

describe('mixRgb', () => {
  it('interpolates linearly between two colors', () => {
    expect(mixRgb({ r: 0, g: 0, b: 0 }, { r: 100, g: 100, b: 100 }, 0.5)).toEqual({ r: 50, g: 50, b: 50 });
  });
});

describe('readableTextColor', () => {
  it('picks dark text on a light background and light text on a dark background', () => {
    expect(readableTextColor({ r: 250, g: 250, b: 250 })).toBe('#141414');
    expect(readableTextColor({ r: 10, g: 10, b: 10 })).toBe('#f7f5f2');
  });
});

describe('buildPalette', () => {
  it('falls back to a neutral palette when no colors are given', () => {
    const palette = buildPalette([], false);
    expect(palette.background).toBeTruthy();
    expect(palette.text).toBeTruthy();
  });

  it('derives a background tinted toward the given photo colors', () => {
    const warm = buildPalette([{ r: 200, g: 120, b: 60 }], false);
    const cool = buildPalette([{ r: 60, g: 120, b: 200 }], false);
    expect(warm.background).not.toBe(cool.background);
  });

  it('produces readable text against its own background either way', () => {
    const lightPalette = buildPalette([{ r: 220, g: 220, b: 220 }], false);
    const darkPalette = buildPalette([{ r: 30, g: 30, b: 30 }], true);
    expect(lightPalette.text).toBe('#141414');
    expect(darkPalette.text).toBe('#f7f5f2');
  });
});
