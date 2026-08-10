import { useEffect, useMemo, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { resolveCustomPreset, resolveStyleHint } from '../lib/profiles';
import { derivePosterData, type PosterData } from '../lib/posterData';
import { availableTemplatesFor, type PosterTemplateDef } from './poster/posterTemplates';

// Poster aspect ratio follows the ISO A-series (1:√2, e.g. A3 portrait).
const ASPECT_RATIO = Math.SQRT2;
const PREVIEW_WIDTH = 360;
// ~300dpi-equivalent for A3 portrait (297x420mm) — the actual print target.
const EXPORT_WIDTH = 3508;

type CanvaStatus = 'checking' | 'disconnected' | 'connected';

/** Guards against the API route not actually being served — same reasoning as LightroomImportPanel's fetchJson. */
async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (!res.ok) return { ok: false, status: res.status };
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    return { ok: false, status: res.status };
  }
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: res.status };
  }
}

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
  const [canvaStatus, setCanvaStatus] = useState<CanvaStatus>('checking');
  const [creatingCanvaDesign, setCreatingCanvaDesign] = useState(false);
  const [canvaError, setCanvaError] = useState<string | null>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (templates.length > 0 && selectedId == null) setSelectedId(templates[0].id);
  }, [templates, selectedId]);

  useEffect(() => {
    fetchJson<{ connected: boolean }>('/api/canva/auth/status').then((res) => {
      setCanvaStatus(res.ok && res.data.connected ? 'connected' : 'disconnected');
    });
  }, []);

  async function handleDownload(templateDef: PosterTemplateDef) {
    if (!posterData || !exportContainerRef.current) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await toBlob(exportContainerRef.current, {
        width: EXPORT_WIDTH,
        height: EXPORT_WIDTH * ASPECT_RATIO,
        pixelRatio: 1,
      });
      if (!blob) throw new Error('export produced no image data');

      const filename = `poster-${templateDef.id}-${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // iOS Safari's anchor-tag `download` flow for JS-generated blob: URLs
      // is unreliable, especially after an await -- its own confirmation
      // sheet can appear and then produce nothing in Files, with no error
      // surfaced to the page (tried and confirmed broken here, including
      // with a deferred URL.revokeObjectURL). The Web Share API's file
      // support is Apple's own recommended path for "save this generated
      // file" and opens the native share sheet (Save Image / Save to
      // Files), a genuinely different code path -- used whenever the
      // browser supports it, with the anchor/blob approach kept as the
      // fallback for browsers that don't (most desktop browsers still
      // don't support sharing files via navigator.share).
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
        } catch (shareErr) {
          // The person closing the share sheet without picking anything
          // throws AbortError -- that's a cancel, not a failure.
          if (shareErr instanceof Error && shareErr.name !== 'AbortError') throw shareErr;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (err) {
      console.error('Poster export failed:', err);
      setError(t('poster.exportError'));
    } finally {
      setExporting(false);
    }
  }

  async function handleCreateCanvaDesign() {
    if (!posterData || !selectedTemplate || !exportContainerRef.current) return;
    setCreatingCanvaDesign(true);
    setCanvaError(null);
    try {
      // Upload the poster as we actually built it (the chosen template's
      // full render), not just the raw source photo — so opening it in
      // Canva starts from the real composition and is editable there,
      // instead of forcing a redesign from a blank photo.
      const blob = await toBlob(exportContainerRef.current, {
        width: EXPORT_WIDTH,
        height: EXPORT_WIDTH * ASPECT_RATIO,
        pixelRatio: 1,
      });
      if (!blob) throw new Error('export produced no image data');
      const res = await fetchJson<{ editUrl: string }>('/api/canva/design/create', { method: 'POST', body: blob });
      if (!res.ok) {
        if (res.status === 401) {
          setCanvaStatus('disconnected');
          return;
        }
        throw new Error(`Canva request failed (${res.status})`);
      }
      window.open(res.data.editUrl, '_blank', 'noopener');
    } catch (err) {
      console.error('Creating the Canva design failed:', err);
      setCanvaError(t('poster.canva.error', { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setCreatingCanvaDesign(false);
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

          <div className="poster-canva-section">
            <h4>{t('poster.canva.heading')}</h4>
            <p className="analytics-scope-note">{t('poster.canva.disclosure')}</p>
            {canvaStatus === 'checking' && <div className="empty-state">{t('poster.canva.checking')}</div>}
            {canvaStatus === 'disconnected' && (
              <a className="btn btn-primary" href="/api/canva/auth/login">
                {t('poster.canva.connect')}
              </a>
            )}
            {canvaStatus === 'connected' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={creatingCanvaDesign || !selectedTemplate}
                  onClick={handleCreateCanvaDesign}
                >
                  {creatingCanvaDesign ? t('poster.canva.preparing') : t('poster.canva.open')}
                </button>
                <a className="btn btn-ghost btn-sm" href="/api/canva/auth/logout">
                  {t('poster.canva.disconnect')}
                </a>
              </div>
            )}
            {canvaError && <p className="dashboard-error-note">{canvaError}</p>}
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
