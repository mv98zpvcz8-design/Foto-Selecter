// Keyed by width+color since the hole/pitch geometry and tile color depend
// on both — a poster's preview (360px wide) and its export (3508px wide)
// need visibly different tile sizes, and Filmstrip/ContactSheet use
// different band colors.
const cache = new Map<string, string>();

/**
 * Renders one repeat-tile of a film/proof-sheet perforation strip to a
 * canvas and returns it as a data URL, instead of a live CSS mask-image.
 * A `mask-image` on a strip spanning the full export height (thousands of
 * px) is expensive for html-to-image to rasterize during PNG export — slow
 * enough on this template that a download click could look like it did
 * nothing. A small pre-rendered tile repeats via a plain background-image,
 * which exports fast because it's just a bitmap tile, not a live filter.
 */
function sprocketTileDataUrl(width: number, color: string): string {
  const key = `${Math.round(width)}:${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const holeSize = width * 0.42;
  const pitch = holeSize * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(pitch));
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, pitch / 2, holeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** A film/proof-sheet perforation strip. Shared by any template that wants the "physical film" cue (PosterContactSheet, PosterFilmstrip) rather than each redefining the same tile. */
export function SprocketEdge({ side, width, color = '#d8d3c6' }: { side: 'left' | 'right'; width: number; color?: string }) {
  const pitch = width * 0.84;
  return (
    <div
      style={{
        position: 'absolute',
        [side]: 0,
        top: 0,
        bottom: 0,
        width,
        backgroundImage: `url(${sprocketTileDataUrl(width, color)})`,
        backgroundRepeat: 'repeat-y',
        backgroundPosition: `0 ${pitch / 2}px`,
        backgroundSize: `${width}px ${pitch}px`,
      }}
    />
  );
}
