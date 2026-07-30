// Every template expresses its internal sizes as multiples of this scale
// factor (computed from the actual rendered pixel width) instead of fixed
// px/rem values, so the exact same component tree produces a correct,
// proportional layout whether it's rendered small (preview) or at full
// print resolution (export) — no separate "preview version" of each
// template to keep in sync.
export const POSTER_DESIGN_WIDTH = 1000;

export function scaleOf(widthPx: number): number {
  return widthPx / POSTER_DESIGN_WIDTH;
}
