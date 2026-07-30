import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';
import { smartObjectPosition } from './smartObjectPosition';

/** One strong photo, edge-to-edge, with only a subtle gradient + small overlay caption at the bottom — the opposite extreme from the minimalist template's whitespace-and-frame approach. */
export function PosterCinematic({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);

  return (
    <div
      style={{
        position: 'relative',
        width: widthPx,
        height: heightPx,
        overflow: 'hidden',
        background: '#000',
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <img
        src={data.heroPhoto.previewUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: smartObjectPosition(data.heroPhoto),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '38%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.82))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 48 * s,
          right: 48 * s,
          bottom: 40 * s,
          color: '#f5f5f5',
        }}
      >
        <div
          style={{
            fontSize: 40 * s,
            fontWeight: 300,
            letterSpacing: 10 * s,
            textTransform: 'uppercase',
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 10 * s, fontSize: 15 * s, letterSpacing: 3 * s, opacity: 0.75 }}>
            {data.dateText}
          </div>
        )}
      </div>
    </div>
  );
}
