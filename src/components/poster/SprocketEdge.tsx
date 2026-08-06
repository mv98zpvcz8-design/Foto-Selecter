/**
 * A film/proof-sheet perforation strip — a CSS radial-gradient mask
 * punching evenly-spaced round holes out of a solid band. Shared by any
 * template that wants the "physical film" cue (PosterContactSheet,
 * PosterFilmstrip) rather than each redefining the same mask math.
 */
export function SprocketEdge({ side, width, color = '#d8d3c6' }: { side: 'left' | 'right'; width: number; color?: string }) {
  const holeSize = width * 0.42;
  const pitch = holeSize * 2;
  return (
    <div
      style={{
        position: 'absolute',
        [side]: 0,
        top: 0,
        bottom: 0,
        width,
        background: color,
        WebkitMaskImage: `radial-gradient(circle ${holeSize / 2}px at 50% 0px, transparent ${holeSize / 2}px, black ${holeSize / 2 + 0.5}px)`,
        WebkitMaskRepeat: 'repeat-y',
        WebkitMaskPosition: `0 ${pitch / 2}px`,
        WebkitMaskSize: `${width}px ${pitch}px`,
        maskImage: `radial-gradient(circle ${holeSize / 2}px at 50% 0px, transparent ${holeSize / 2}px, black ${holeSize / 2 + 0.5}px)`,
        maskRepeat: 'repeat-y',
        maskPosition: `0 ${pitch / 2}px`,
        maskSize: `${width}px ${pitch}px`,
      }}
    />
  );
}
