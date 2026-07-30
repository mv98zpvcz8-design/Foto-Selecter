import { describe, expect, it } from 'vitest';
import { derivePosterData } from './posterData';
import { makePhoto, tag } from '../test/helpers';

describe('derivePosterData', () => {
  it('returns null when there are no analyzed photos', () => {
    expect(derivePosterData([], 'event', 'Event', false)).toBeNull();
  });

  it('picks the highest-scored selected photo as the hero and preserves score order in the gallery', () => {
    const photos = [
      makePhoto({ status: 'done', isSelected: true, overallScore: 60, colorStats: { avgR: 100, avgG: 100, avgB: 100, channelDiffMean: 20, contrast: 40 } }),
      makePhoto({ status: 'done', isSelected: true, overallScore: 90, colorStats: { avgR: 100, avgG: 100, avgB: 100, channelDiffMean: 20, contrast: 40 } }),
      makePhoto({ status: 'done', isSelected: false, overallScore: 95 }), // not selected — excluded from the pool
    ];
    const data = derivePosterData(photos, 'kunde', 'Kunde', false);
    expect(data).not.toBeNull();
    expect(data!.heroPhoto.overallScore).toBe(90);
    expect(data!.galleryPhotos.map((p) => p.overallScore)).toEqual([90, 60]);
  });

  it('falls back to all analyzed photos when none are selected/preselected', () => {
    const photos = [makePhoto({ status: 'done', overallScore: 50 })];
    const data = derivePosterData(photos, 'sonstiges', 'Sonstiges', false);
    expect(data).not.toBeNull();
    expect(data!.galleryPhotos).toHaveLength(1);
  });

  it('derives mood from aggregated color tags rather than inventing scene detection', () => {
    const bwPhotos = [
      makePhoto({ status: 'done', isSelected: true, overallScore: 80, semanticTags: [tag('bw', 0.9)] }),
      makePhoto({ status: 'done', isSelected: true, overallScore: 70, semanticTags: [tag('bw', 0.9)] }),
    ];
    expect(derivePosterData(bwPhotos, 'portfolio', 'Portfolio', false)!.mood).toBe('monochrome');

    const warmPhotos = [
      makePhoto({ status: 'done', isSelected: true, overallScore: 80, semanticTags: [tag('warmColor', 0.8)] }),
    ];
    expect(derivePosterData(warmPhotos, 'portfolio', 'Portfolio', false)!.mood).toBe('warm');
  });

  it('derives a "none" people format when no faces were detected', () => {
    const photos = [makePhoto({ status: 'done', isSelected: true, overallScore: 80, facesDetected: 0 })];
    expect(derivePosterData(photos, 'portfolio', 'Portfolio', false)!.peopleFormat).toBe('none');
  });

  it('derives a "group" people format from the crowdLikely/groupPhotoLikely tags', () => {
    const photos = [
      makePhoto({
        status: 'done',
        isSelected: true,
        overallScore: 80,
        facesDetected: 5,
        semanticTags: [tag('crowdLikely', 0.9)],
      }),
    ];
    expect(derivePosterData(photos, 'event', 'Event', false)!.peopleFormat).toBe('group');
  });
});
