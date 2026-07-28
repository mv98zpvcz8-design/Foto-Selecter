import { parseCookies, serializeCookie } from './cookies';
import { decryptSession, encryptSession } from './session';
import { requiredEnv } from './env';
import { refreshAccessToken, type StoredSession } from './adobeAuth';

const SESSION_COOKIE = 'lr_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
// Refresh a bit before actual expiry so a request never races the token dying mid-flight.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export interface ActiveSession {
  session: StoredSession;
  /** Set when the access token was refreshed during this request — callers must attach it to their response so the browser's cookie stays current. */
  refreshedCookie?: string;
}

/** Reads + decrypts the session cookie, transparently refreshing the access token if it's expired (or close to it) and a refresh token is available. Returns null if there's no session at all — callers treat that as "not connected to Lightroom". */
export async function getActiveSession(req: Request): Promise<ActiveSession | null> {
  const cookies = parseCookies(req.headers.get('cookie'));
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return null;

  const sessionSecret = requiredEnv('SESSION_SECRET');
  const session = await decryptSession<StoredSession>(sessionSecret, raw);
  if (!session) return null;

  if (Date.now() < session.expiresAt - REFRESH_BUFFER_MS || !session.refreshToken) {
    return { session };
  }

  const clientId = requiredEnv('ADOBE_CLIENT_ID');
  const clientSecret = requiredEnv('ADOBE_CLIENT_SECRET');
  const tokens = await refreshAccessToken({ clientId, clientSecret, refreshToken: session.refreshToken });
  const refreshed: StoredSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  const cookieValue = await encryptSession(sessionSecret, refreshed);
  const refreshedCookie = serializeCookie(SESSION_COOKIE, cookieValue, { maxAgeSeconds: SESSION_MAX_AGE_SECONDS });
  return { session: refreshed, refreshedCookie };
}
