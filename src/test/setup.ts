// Pure-logic unit tests run in plain Node, but preferenceLearning.ts and
// analysisCache.ts talk to indexedDB directly (no library, per the app's
// own architecture) — fake-indexeddb provides that global for tests.
import 'fake-indexeddb/auto';

// localBackup.ts reads/writes localStorage directly (lang + custom
// presets) — Node has no such global, so a minimal in-memory stand-in
// covers the getItem/setItem/removeItem surface these tests exercise.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => void store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}
