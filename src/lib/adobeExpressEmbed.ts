// Thin wrapper around Adobe's Express Embed SDK (window.CCEverywhere) —
// a pure client-side JS SDK loaded from Adobe's CDN, initialized with a
// public/embeddable client ID (no server secret involved, unlike the
// Lightroom integration). Lazy-loaded only when the user actually opts
// into "Edit in Adobe Express", same reasoning as the face-api model
// lazy-load: no reason to ship/fetch this for users who never touch it.

const SDK_URL = 'https://cc-embed.adobe.com/sdk/v4/CCEverywhere.js';

export interface CCEverywhereEditor {
  createWithAsset: (
    asset: { data: Blob; dataType: 'blob' },
    appConfig: {
      callbacks: {
        onCancel: () => void;
        onPublish?: (intent: unknown, publishParams: unknown) => void;
        onError: (err: unknown) => void;
      };
    },
  ) => void;
}

interface CCEverywhereInstance {
  editor: CCEverywhereEditor;
}

interface CCEverywhereGlobal {
  initialize: (
    hostInfo: {
      clientId: string;
      appName: string;
      appVersion: { major: number; minor: number };
      platformCategory: string;
    },
    configParams?: Record<string, unknown>,
  ) => Promise<CCEverywhereInstance>;
}

declare global {
  interface Window {
    CCEverywhere?: CCEverywhereGlobal;
  }
}

let loadPromise: Promise<CCEverywhereGlobal> | null = null;

function loadSdkScript(): Promise<CCEverywhereGlobal> {
  if (window.CCEverywhere) return Promise.resolve(window.CCEverywhere);
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.CCEverywhere) resolve(window.CCEverywhere);
        else reject(new Error('Adobe Express SDK script loaded but window.CCEverywhere is missing'));
      };
      script.onerror = () => reject(new Error('Failed to load the Adobe Express SDK script'));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

let instancePromise: Promise<CCEverywhereInstance> | null = null;

/** Loads the SDK (once) and initializes it with this app's public client ID. */
export function getExpressEditor(clientId: string): Promise<CCEverywhereEditor> {
  if (!instancePromise) {
    instancePromise = loadSdkScript().then((ccEverywhere) =>
      ccEverywhere.initialize({
        clientId,
        appName: 'Foto-Selecter',
        appVersion: { major: 1, minor: 0 },
        platformCategory: 'web',
      }),
    );
  }
  return instancePromise.then((instance) => instance.editor);
}

/**
 * Opens the full Adobe Express editor pre-loaded with the given photo —
 * deliberately the raw selected photo, not a design this app already
 * rendered, since the point of this integration is to let Express itself
 * (its own poster templates, text tools, layout) do the poster design,
 * rather than just touching up something built here.
 */
export async function openPhotoInExpress(clientId: string, photo: Blob): Promise<void> {
  const editor = await getExpressEditor(clientId);
  return new Promise((resolve, reject) => {
    editor.createWithAsset(
      { data: photo, dataType: 'blob' },
      {
        callbacks: {
          onCancel: () => resolve(),
          onPublish: () => resolve(),
          onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
        },
      },
    );
  });
}
