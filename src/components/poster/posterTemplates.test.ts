import { describe, expect, it } from 'vitest';
import { availableTemplatesFor } from './posterTemplates';
import { makePhoto } from '../../test/helpers';
import type { PosterData } from '../../lib/posterData';

function makePosterData(overrides: Partial<PosterData> = {}): PosterData {
  const photo = makePhoto({ status: 'done', isSelected: true });
  return {
    purpose: 'portfolio',
    titleText: 'Test',
    dateText: null,
    photoCountText: '1',
    mood: 'minimal',
    peopleFormat: 'single',
    energy: 'calm',
    palette: {
      photoAverage: '#888888',
      accent: '#888888',
      accentText: '#141414',
      background: '#f7f5f2',
      text: '#141414',
      textMuted: '#555555',
    },
    heroPhoto: photo,
    galleryPhotos: [photo],
    ...overrides,
  };
}

describe('availableTemplatesFor', () => {
  it('excludes galleryPrint for a group photo (a mat-and-frame around one subject would misrepresent it)', () => {
    const ids = availableTemplatesFor(makePosterData({ peopleFormat: 'group' })).map((t) => t.id);
    expect(ids).not.toContain('galleryPrint');
  });

  it('includes galleryPrint for a couple photo', () => {
    const ids = availableTemplatesFor(makePosterData({ peopleFormat: 'couple' })).map((t) => t.id);
    expect(ids).toContain('galleryPrint');
  });

  it('orders templates matching the shoot\'s energy first, without dropping the rest', () => {
    const calmResult = availableTemplatesFor(makePosterData({ energy: 'calm' })).map((t) => t.id);
    const expressiveResult = availableTemplatesFor(makePosterData({ energy: 'expressive' })).map((t) => t.id);

    expect(calmResult[0]).toBe('minimalist'); // first calm-recommended template in registry order
    expect(expressiveResult[0]).toBe('halftone'); // first expressive-recommended template in registry order
    // Same available set either way for a single-photo, single-person shoot -- only the order changes.
    expect(new Set(calmResult)).toEqual(new Set(expressiveResult));
  });
});
