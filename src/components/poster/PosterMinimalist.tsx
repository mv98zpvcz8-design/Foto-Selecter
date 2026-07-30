import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';

/** One hero photo, generous whitespace, small centered caption block — the "gallery wall print" look. */
export function PosterMinimalist({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const margin = 60 * s;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        background: '#f7f5f2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
        padding: margin,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={data.heroPhoto.previewUrl}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            boxShadow: `0 ${8 * s}px ${32 * s}px rgba(0,0,0,0.18)`,
          }}
        />
      </div>
      <div style={{ marginTop: margin * 0.8, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 30 * s,
            letterSpacing: 6 * s,
            textTransform: 'uppercase',
            color: '#1a1a1a',
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 10 * s, fontSize: 15 * s, color: '#7a7a7a', letterSpacing: 2 * s }}>
            {data.dateText}
          </div>
        )}
      </div>
    </div>
  );
}
