import { describe, expect, it } from 'vitest';
import { reducer } from './AppState';
import { DEFAULT_PROFILE_REF } from '../lib/profiles';

function makeState() {
  return {
    step: 'results' as const,
    photos: [],
    rejectedFileNames: [],
    targetCount: 10,
    selectionMode: 'topN' as const,
    profileRef: DEFAULT_PROFILE_REF,
    customPresets: [],
    progress: { done: 0, total: 0 },
    showAll: false,
    lang: 'de' as const,
    activeFilterKeys: [],
    filterCombineMode: 'and' as const,
    searchUnmatchedTerms: [],
  };
}

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' });
}

describe('AppState reducer / ADD_FILES', () => {
  it('carries lightroomAssetIds through onto matching photos', () => {
    const state = makeState();
    const files = [makeFile('a.jpg'), makeFile('b.jpg')];
    const next = reducer(state, { type: 'ADD_FILES', files, lightroomAssetIds: ['lr-a', 'lr-b'] });
    expect(next.photos.map((p) => p.lightroomAssetId)).toEqual(['lr-a', 'lr-b']);
  });

  it('leaves lightroomAssetId undefined for local files added without one', () => {
    const state = makeState();
    const next = reducer(state, { type: 'ADD_FILES', files: [makeFile('local.jpg')] });
    expect(next.photos[0].lightroomAssetId).toBeUndefined();
  });

  it('keeps lightroomAssetIds aligned with their file when an earlier duplicate is filtered out', () => {
    const existing = reducer(makeState(), { type: 'ADD_FILES', files: [makeFile('dup.jpg')] });
    // dup.jpg is already present -- the second batch's first entry gets
    // dropped by the existing-key dedup, so 'lr-2' must still land on
    // new.jpg (index 1 of the incoming batch), not silently shift to index 0.
    const next = reducer(existing, {
      type: 'ADD_FILES',
      files: [makeFile('dup.jpg'), makeFile('new.jpg')],
      lightroomAssetIds: ['lr-1', 'lr-2'],
    });
    const newPhoto = next.photos.find((p) => p.name === 'new.jpg');
    expect(newPhoto?.lightroomAssetId).toBe('lr-2');
    expect(next.photos).toHaveLength(2);
  });
});
