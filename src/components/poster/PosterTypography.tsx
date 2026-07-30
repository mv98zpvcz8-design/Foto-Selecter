import type { PosterTemplateProps } from './posterTemplates';
import { scaleOf } from './posterScale';

/** Title text dominates the frame; the photo sits small and grounded at the bottom rather than filling the poster — structurally the opposite of the full-bleed/cinematic template. */
export function PosterTypography({ data, widthPx, heightPx }: PosterTemplateProps) {
  const s = scaleOf(widthPx);
  const bg = data.palette.background;
  const text = data.palette.text;

  return (
    <div
      style={{
        width: widthPx,
        height: heightPx,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: 56 * s,
        fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            fontSize: 92 * s,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -2 * s,
            color: text,
            textTransform: 'uppercase',
          }}
        >
          {data.titleText}
        </div>
        {data.dateText && (
          <div style={{ marginTop: 18 * s, fontSize: 20 * s, color: data.palette.textMuted }}>{data.dateText}</div>
        )}
      </div>
      <div
        style={{
          height: heightPx * 0.32,
          overflow: 'hidden',
          borderRadius: 4 * s,
        }}
      >
        <img src={data.heroPhoto.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    </div>
  );
}
