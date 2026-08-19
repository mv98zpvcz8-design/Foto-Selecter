import { useEffect, useState } from 'react';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import type { PhotoResult } from '../types';

type ConnectionStatus = 'checking' | 'disconnected' | 'connected';

/** Same guard as the other screens' local fetchJson helpers — a dev server or misconfigured deploy can answer an unknown API path with a 200 HTML fallback instead of a 404. */
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

function defaultAlbumName(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Foto-Selecter Picks ${today}`;
}

/**
 * Sends the currently selected photos back into Lightroom as a new album —
 * only shown at all when at least one photo in the batch actually came
 * from a Lightroom import (local uploads have no `lightroomAssetId` to act
 * on). Deliberately creates a NEW album rather than writing star ratings:
 * non-destructive (never touches whatever rating system the photographer
 * already uses) and trivially undoable by just deleting the album, unlike
 * silently overwriting existing star ratings with a guessed score mapping.
 */
export function LightroomPicksPanel() {
  const { state } = useAppState();
  const t = useT();

  const eligible = state.photos.filter((p): p is PhotoResult & { lightroomAssetId: string } => !!p.lightroomAssetId);
  const picks = eligible.filter((p) => p.isSelected);

  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [albumName, setAlbumName] = useState(defaultAlbumName);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; failed: number } | null>(null);

  useEffect(() => {
    if (eligible.length === 0) return;
    fetchJson<{ connected: boolean }>('/api/auth/status').then((res) => {
      setStatus(res.ok && res.data.connected ? 'connected' : 'disconnected');
    });
  }, [eligible.length]);

  if (eligible.length === 0) return null;

  async function handleSend() {
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchJson<{ added: number; failed: number }>('/api/lightroom/album-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetIds: picks.map((p) => p.lightroomAssetId), albumName: albumName.trim() }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('disconnected');
          return;
        }
        throw new Error(`request failed (${res.status})`);
      }
      setResult({ added: res.data.added, failed: res.data.failed });
    } catch (err) {
      setError(t('lightroomPicks.error', { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="lightroom-picks-section">
      <h4>{t('lightroomPicks.heading')}</h4>
      <p className="analytics-scope-note">{t('lightroomPicks.disclosure')}</p>

      {status === 'checking' && <div className="empty-state">{t('lightroom.checking')}</div>}

      {status === 'disconnected' && (
        <a className="btn btn-primary" href="/api/auth/login">
          {t('lightroom.connect')}
        </a>
      )}

      {status === 'connected' && (
        <>
          <div className="lightroom-picks-row">
            <input
              type="text"
              className="lightroom-picks-name-input"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              disabled={sending}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={picks.length === 0 || sending || albumName.trim().length === 0}
              onClick={handleSend}
            >
              {sending ? t('lightroomPicks.sending') : t('lightroomPicks.send', { count: picks.length })}
            </button>
          </div>
          {picks.length === 0 && <p className="empty-state">{t('lightroomPicks.noneSelected')}</p>}
        </>
      )}

      {result && (
        <p className="analytics-scope-note">
          {result.failed > 0
            ? t('lightroomPicks.resultPartial', { added: result.added, failed: result.failed })
            : t('lightroomPicks.resultOk', { added: result.added })}
        </p>
      )}
      {error && <p className="dashboard-error-note">{error}</p>}
    </div>
  );
}
