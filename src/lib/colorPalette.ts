export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function toHex({ r, g, b }: RgbColor): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function mixRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function relativeLuminance({ r, g, b }: RgbColor): number {
  // Standard WCAG relative luminance (sRGB, gamma-approximated) — good
  // enough here for a binary "is this background light or dark" choice,
  // not for exact accessibility contrast-ratio compliance.
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Picks black or white, whichever reads more clearly against the given background. */
export function readableTextColor(background: RgbColor): string {
  return relativeLuminance(background) > 0.45 ? '#141414' : '#f7f5f2';
}

export interface PosterPalette {
  /** The photo-derived average color — used sparingly (accents, thin lines), never as large body-text background, since it's often too muddy/low-contrast for that. */
  photoAverage: string;
  /** A deepened/saturated variant of photoAverage, for accents that need to read as "from this shoot" without being washed out. */
  accent: string;
  /** Whichever of black/white reads more clearly against `accent` specifically — accent's luminance can go either way regardless of the overall background, so it needs its own contrast pick. */
  accentText: string;
  /** Near-neutral background derived from the photo tone (very light or very dark tint) — safe to place text on. */
  background: string;
  text: string;
  textMuted: string;
}

/** Builds a small, harmonious palette from the average color across a set of photos — deliberately conservative (a muted tint + readable text), not an attempt at real palette extraction (dominant-color clustering), since that would need per-pixel access this layer doesn't have. */
export function buildPalette(avgColors: RgbColor[], preferDark: boolean): PosterPalette {
  if (avgColors.length === 0) {
    const bg: RgbColor = preferDark ? { r: 20, g: 20, b: 22 } : { r: 247, g: 245, b: 242 };
    const neutralAccent: RgbColor = { r: 136, g: 136, b: 136 };
    return {
      photoAverage: '#888888',
      accent: toHex(neutralAccent),
      accentText: readableTextColor(neutralAccent),
      background: toHex(bg),
      text: readableTextColor(bg),
      textMuted: preferDark ? '#a8a8a8' : '#555555',
    };
  }

  const mean = avgColors.reduce(
    (acc, c) => ({ r: acc.r + c.r / avgColors.length, g: acc.g + c.g / avgColors.length, b: acc.b + c.b / avgColors.length }),
    { r: 0, g: 0, b: 0 },
  );

  const white: RgbColor = { r: 255, g: 255, b: 255 };
  const black: RgbColor = { r: 8, g: 8, b: 10 };
  const background = preferDark ? mixRgb(black, mean, 0.35) : mixRgb(white, mean, 0.12);
  const accent = mixRgb(mean, preferDark ? white : black, 0.15);

  const bgHex = toHex(background);
  return {
    photoAverage: toHex(mean),
    accent: toHex(accent),
    accentText: readableTextColor(accent),
    background: bgHex,
    text: readableTextColor(background),
    textMuted: readableTextColor(background) === '#141414' ? '#5a5a5a' : '#b8b8b8',
  };
}
