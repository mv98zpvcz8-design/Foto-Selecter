import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';

interface LightroomAlbumSummary {
  id: string;
  name: string;
}

interface LightroomAssetSummary {
  id: string;
  fileName: string;
  captureDate: string | null;
  width: number | null;
  height: number | null;
}

type ConnectionStatus = 'checking' | 'disconnected' | 'connected';

const IMPORT_CONCURRENCY = 4;

/** Strips whatever extension the original camera file had (often a RAW
 * extension like .CR2) — the bytes we actually fetch are always a JPEG
 * rendition, so the constructed File must look like a .jpg to the rest of
 * the pipeline, or it would wrongly try RAW-embedded-preview extraction
 * on plain JPEG bytes. */
function toJpegFileName(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const base = dot === -1 ? originalName : originalName.slice(0, dot);
  return `${base}.jpg`;
}

/** Guards against the API route not actually being served (e.g. a plain static preview with no backend) — some dev servers answer an unknown path with a 200 HTML fallback page instead of a 404, which would otherwise crash res.json(). */
async function fetchJson<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const res = await fetch(url, { credentials: 'same-origin' });
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

export function LightroomImportPanel({ onClose }: { onClose: () => void }) {
  const { dispatch } = useAppState();
  const t = useT();

  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [albums, setAlbums] = useState<LightroomAlbumSummary[] | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<LightroomAlbumSummary | null>(null);
  const [assets, setAssets] = useState<LightroomAssetSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ connected: boolean }>('/api/auth/status').then((res) => {
      if (res.ok && res.data.connected) setStatus('connected');
      else setStatus('disconnected');
    });
  }, []);

  useEffect(() => {
    if (status !== 'connected') return;
    fetchJson<{ albums: LightroomAlbumSummary[] }>('/api/lightroom/albums').then((res) => {
      if (res.ok) setAlbums(res.data.albums);
      else if (res.status === 401) setStatus('disconnected');
      else setError(t('lightroom.error'));
    });
  }, [status, t]);

  function loadAlbumAssets(album: LightroomAlbumSummary, cursor: string | null) {
    setLoadingAssets(true);
    setError(null);
    const url = cursor
      ? `/api/lightroom/albums/${album.id}/assets?cursor=${encodeURIComponent(cursor)}`
      : `/api/lightroom/albums/${album.id}/assets`;
    fetchJson<{ assets: LightroomAssetSummary[]; nextCursor: string | null }>(url).then((res) => {
      setLoadingAssets(false);
      if (!res.ok) {
        if (res.status === 401) setStatus('disconnected');
        else setError(t('lightroom.error'));
        return;
      }
      setAssets((prev) => (cursor ? [...prev, ...res.data.assets] : res.data.assets));
      setNextCursor(res.data.nextCursor);
    });
  }

  function handleSelectAlbum(album: LightroomAlbumSummary) {
    setSelectedAlbum(album);
    setAssets([]);
    setNextCursor(null);
    setSelectedIds(new Set());
    loadAlbumAssets(album, null);
  }

  function toggleAsset(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllLoaded() {
    setSelectedIds((prev) => (prev.size === assets.length ? new Set() : new Set(assets.map((a) => a.id))));
  }

  async function handleImportSelected() {
    const toImport = assets.filter((a) => selectedIds.has(a.id));
    if (toImport.length === 0) return;

    setImportProgress({ done: 0, total: toImport.length });
    setError(null);

    const files: File[] = [];
    const lightroomAssetIds: string[] = [];
    let cursorIndex = 0;
    let failed = 0;

    async function worker() {
      while (cursorIndex < toImport.length) {
        const asset = toImport[cursorIndex];
        cursorIndex += 1;
        try {
          const res = await fetch(`/api/lightroom/rendition?assetId=${asset.id}&type=2048`, {
            credentials: 'same-origin',
          });
          if (!res.ok) throw new Error(`rendition fetch failed: ${res.status}`);
          const blob = await res.blob();
          files.push(new File([blob], toJpegFileName(asset.fileName), { type: blob.type || 'image/jpeg' }));
          lightroomAssetIds.push(asset.id);
        } catch {
          failed += 1;
        }
        setImportProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : prev));
      }
    }

    await Promise.all(Array.from({ length: Math.min(IMPORT_CONCURRENCY, toImport.length) }, worker));

    if (files.length > 0) dispatch({ type: 'ADD_FILES', files, lightroomAssetIds });
    setImportProgress(null);
    if (failed > 0) setError(t('lightroom.importPartialError', { count: failed }));
    else onClose();
  }

  return (
    <div className="lightroom-panel">
      <div className="modal-header-row">
        <h3>{t('lightroom.heading')}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'connected' && (
            <a className="btn btn-ghost btn-sm" href="/api/auth/logout">
              {t('lightroom.disconnect')}
            </a>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('breakdown.close')}
          </button>
        </div>
      </div>

      {status === 'checking' && <div className="empty-state">{t('lightroom.checking')}</div>}

      {status === 'disconnected' && (
        <div className="lightroom-connect">
          <p>{t('lightroom.connectHint')}</p>
          <a className="btn btn-primary" href="/api/auth/login">
            {t('lightroom.connect')}
          </a>
        </div>
      )}

      {status === 'connected' && !selectedAlbum && (
        <>
          <div className="section-heading">{t('lightroom.chooseAlbum')}</div>
          {albums == null ? (
            <div className="empty-state">{t('lightroom.loadingAlbums')}</div>
          ) : albums.length === 0 ? (
            <div className="empty-state">{t('lightroom.noAlbums')}</div>
          ) : (
            <div className="lightroom-album-list">
              {albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className="btn btn-ghost lightroom-album-btn"
                  onClick={() => handleSelectAlbum(album)}
                >
                  {album.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {status === 'connected' && selectedAlbum && (
        <>
          <div className="lightroom-album-header">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedAlbum(null)}>
              {t('lightroom.backToAlbums')}
            </button>
            <span className="section-heading" style={{ margin: 0 }}>
              {selectedAlbum.name}
            </span>
          </div>

          {assets.length > 0 && (
            <div className="lightroom-select-all-row">
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.size === assets.length && assets.length > 0}
                  onChange={toggleSelectAllLoaded}
                />
                {t('lightroom.selectAllLoaded', { count: assets.length })}
              </label>
            </div>
          )}

          <div className="lightroom-asset-grid">
            {assets.map((asset) => (
              <label key={asset.id} className={`lightroom-asset-tile${selectedIds.has(asset.id) ? ' selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(asset.id)}
                  onChange={() => toggleAsset(asset.id)}
                  className="lightroom-asset-checkbox"
                />
                <img src={`/api/lightroom/rendition?assetId=${asset.id}&type=thumbnail2x`} alt={asset.fileName} loading="lazy" />
              </label>
            ))}
          </div>

          {loadingAssets && <div className="empty-state">{t('lightroom.loadingAssets')}</div>}

          {nextCursor && !loadingAssets && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => loadAlbumAssets(selectedAlbum, nextCursor)}
            >
              {t('lightroom.loadMore')}
            </button>
          )}

          <div className="actions-row">
            <span className="summary-line">{t('lightroom.selectedCount', { count: selectedIds.size })}</span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={selectedIds.size === 0 || importProgress != null}
              onClick={handleImportSelected}
            >
              {importProgress
                ? t('lightroom.importingProgress', { done: importProgress.done, total: importProgress.total })
                : t('lightroom.importSelected', { count: selectedIds.size })}
            </button>
          </div>
        </>
      )}

      {error && <p className="dashboard-error-note">{error}</p>}
    </div>
  );
}
