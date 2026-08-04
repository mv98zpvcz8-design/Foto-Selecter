import { parseCookies, serializeCookie } from './cookies.js';
import { decryptSession, encryptSession } from './session.js';
import { requiredEnv } from './env.js';
import { refreshAccessToken, type StoredCanvaSession } from './canvaAuth.js';

export const CANVA_SESSION_COOKIE = 'canva_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface ActiveCanvaSession {
  session: StoredCanvaSession;
  /** Set when the access token was refreshed during this request — callers must attach it to their response so the browser's cookie stays current. */
  refreshedCookie?: string;
}

/** Same shape as lightroomSession.ts's getActiveSession — reads + decrypts the session cookie, transparently refreshing the access token if it's expired or close to it. Returns null if there's no session ("not connected to Canva"). */
export async function getActiveCanvaSession(req: Request): Promise<ActiveCanvaSession | null> {
  const cookies = parseCookies(req.headers.get('cookie'));
  const raw = cookies[CANVA_SESSION_COOKIE];
  if (!raw) return null;

  const sessionSecret = requiredEnv('SESSION_SECRET');
  const session = await decryptSession<StoredCanvaSession>(sessionSecret, raw);
  if (!session) return null;

  if (Date.now() < session.expiresAt - REFRESH_BUFFER_MS || !session.refreshToken) {
    return { session };
  }

  const clientId = requiredEnv('CANVA_CLIENT_ID');
  const clientSecret = requiredEnv('CANVA_CLIENT_SECRET');
  const tokens = await refreshAccessToken({ clientId, clientSecret, refreshToken: session.refreshToken });
  const refreshed: StoredCanvaSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  const cookieValue = await encryptSession(sessionSecret, refreshed);
  const refreshedCookie = serializeCookie(CANVA_SESSION_COOKIE, cookieValue, { maxAgeSeconds: SESSION_MAX_AGE_SECONDS });
  return { session: refreshed, refreshedCookie };
}
