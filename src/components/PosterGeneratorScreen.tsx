import { useEffect, useMemo, useRef, useState } from 'react';
import { toBlob, toPng } from 'html-to-image';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { resolveCustomPreset, resolveStyleHint } from '../lib/profiles';
import { derivePosterData, type PosterData } from '../lib/posterData';
import { availableTemplatesFor, type PosterTemplateDef } from './poster/posterTemplates';
import { openPosterInExpress } from '../lib/adobeExpressEmbed';

// Poster aspect ratio follows the ISO A-series (1:√2, e.g. A3 portrait).
const ASPECT_RATIO = Math.SQRT2;
const PREVIEW_WIDTH = 360;
// ~300dpi-equivalent for A3 portrait (297x420mm) — the actual print target.
const EXPORT_WIDTH = 3508;

// A PUBLIC, browser-embeddable key by design (the Express Embed SDK runs
// entirely client-side, there's no matching secret) — see .env.example.
const ADOBE_EXPRESS_CLIENT_ID = import.meta.env.VITE_ADOBE_EXPRESS_CLIENT_ID as string | undefined;

export function PosterGeneratorScreen({ onClose }: { onClose: () => void }) {
  const { state } = useAppState();
  const t = useT();

  const purpose = resolveStyleHint(state.profileRef, state.customPresets);
  const profileName =
    state.profileRef.kind === 'builtin'
      ? t(`purpose.${purpose}`)
      : (resolveCustomPreset(state.profileRef, state.customPresets)?.name ?? t(`purpose.${purpose}`));

  const posterData = useMemo<PosterData | null>(
    () => derivePosterData(state.photos, purpose, profileName, false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.photos, purpose, profileName],
  );

  const templates = useMemo(() => (posterData ? availableTemplatesFor(posterData) : []), [posterData]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingInExpress, setOpeningInExpress] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (templates.length > 0 && selectedId == null) setSelectedId(templates[0].id);
  }, [templates, selectedId]);

  async function handleDownload(templateDef: PosterTemplateDef) {
    if (!posterData || !exportContainerRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const dataUrl = await toPng(exportContainerRef.current, {
        width: EXPORT_WIDTH,
        height: EXPORT_WIDTH * ASPECT_RATIO,
        pixelRatio: 1,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `poster-${templateDef.id}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Poster export failed:', err);
      setError(t('poster.exportError'));
    } finally {
      setExporting(false);
    }
  }

  async function handleOpenInExpress(templateDef: PosterTemplateDef) {
    if (!posterData || !exportContainerRef.current) return;
    if (!ADOBE_EXPRESS_CLIENT_ID) {
      setExpressError(t('poster.adobe.missingClientId'));
      return;
    }
    setOpeningInExpress(true);
    setExpressError(null);
    try {
      const blob = await toBlob(exportContainerRef.current, {
        width: EXPORT_WIDTH,
        height: EXPORT_WIDTH * ASPECT_RATIO,
        pixelRatio: 1,
      });
      if (!blob) throw new Error('Rendering the poster image failed');
      await openPosterInExpress(ADOBE_EXPRESS_CLIENT_ID, blob);
    } catch (err) {
      console.error(`Opening "${templateDef.id}" in Adobe Express failed:`, err);
      setExpressError(t('poster.adobe.error', { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setOpeningInExpress(false);
    }
  }

  const selectedTemplate = templates.find((tpl) => tpl.id === selectedId) ?? null;

  return (
    <div className="poster-screen">
      <div className="modal-header-row">
        <h3>{t('poster.heading')}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          {t('breakdown.close')}
        </button>
      </div>

      {!posterData ? (
        <div className="empty-state">{t('poster.noPhotos')}</div>
      ) : (
        <>
          <p className="analytics-scope-note">{t('poster.hint')}</p>

          <div className="poster-grid">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`poster-tile${selectedId === tpl.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(tpl.id)}
              >
                <div className="poster-tile-preview" style={{ width: PREVIEW_WIDTH, height: PREVIEW_WIDTH * ASPECT_RATIO }}>
                  <tpl.Component data={posterData} widthPx={PREVIEW_WIDTH} heightPx={PREVIEW_WIDTH * ASPECT_RATIO} />
                </div>
                <div className="poster-tile-name">{t(tpl.nameKey)}</div>
              </button>
            ))}
          </div>

          <div className="actions-row">
            <span className="summary-line">
              {selectedTemplate ? t(selectedTemplate.nameKey) : ''}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!selectedTemplate || exporting}
              onClick={() => selectedTemplate && handleDownload(selectedTemplate)}
            >
              {exporting ? t('poster.exporting') : t('poster.download')}
            </button>
          </div>

          {error && <p className="dashboard-error-note">{error}</p>}

          <div className="poster-adobe-section">
            <h4>{t('poster.adobe.heading')}</h4>
            <p className="analytics-scope-note">{t('poster.adobe.disclosure')}</p>
            <button
              type="button"
              className="btn"
              disabled={!selectedTemplate || openingInExpress}
              onClick={() => selectedTemplate && handleOpenInExpress(selectedTemplate)}
            >
              {openingInExpress ? t('poster.adobe.preparing') : t('poster.adobe.open')}
            </button>
            {expressError && <p className="dashboard-error-note">{expressError}</p>}
          </div>

          {/* Off-screen full-resolution render used only for export — the visible tiles above are cheap small previews so switching between templates stays instant. */}
          {selectedTemplate && (
            <div className="poster-export-offscreen" aria-hidden="true">
              <div ref={exportContainerRef}>
                <selectedTemplate.Component
                  data={posterData}
                  widthPx={EXPORT_WIDTH}
                  heightPx={EXPORT_WIDTH * ASPECT_RATIO}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
