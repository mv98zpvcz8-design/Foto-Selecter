import type { ComponentType } from 'react';
import type { PosterData, PosterEnergy } from '../../lib/posterData';
import { PosterMinimalist } from './PosterMinimalist';
import { PosterGrid } from './PosterGrid';
import { PosterEditorial } from './PosterEditorial';
import { PosterCinematic } from './PosterCinematic';
import { PosterFilmstrip } from './PosterFilmstrip';
import { PosterBold } from './PosterBold';
import { PosterCollage } from './PosterCollage';
import { PosterScrapbook } from './PosterScrapbook';
import { PosterHalftone } from './PosterHalftone';
import { PosterGalleryPrint } from './PosterGalleryPrint';
import { PosterContactSheet } from './PosterContactSheet';

export interface PosterTemplateProps {
  data: PosterData;
  widthPx: number;
  heightPx: number;
}

export interface PosterTemplateDef {
  id: string;
  nameKey: string;
  Component: ComponentType<PosterTemplateProps>;
  /** How many gallery photos this template actually uses, so we can skip templates that need more variety than the batch has. */
  minPhotos: number;
  /**
   * Optional structural fit check beyond photo count — for a template whose
   * whole composition assumes something about the subject (a mat-and-frame
   * built around one centered portrait doesn't work for a crowd shot).
   * Omit for templates that work for any content; this is deliberately not
   * used for taste/mood gatekeeping, only cases where the layout itself
   * would break or misrepresent the photo.
   */
  fitsContent?: (data: PosterData) => boolean;
  /**
   * Which energy register this template's whole design language (color
   * blocks, grain, scale, motion) is built for — a quiet, composed portrait
   * doesn't want the same loud treatment as a celebration or a sports
   * action shot. Omit for templates that read fine either way. Used only to
   * order the gallery (best-fit first, so it's the default pick); every
   * fitting template stays available, this never hides one.
   */
  recommendedEnergy?: PosterEnergy;
}

export const POSTER_TEMPLATES: PosterTemplateDef[] = [
  { id: 'minimalist', nameKey: 'poster.template.minimalist', Component: PosterMinimalist, minPhotos: 1, recommendedEnergy: 'calm' },
  { id: 'halftone', nameKey: 'poster.template.halftone', Component: PosterHalftone, minPhotos: 1, recommendedEnergy: 'expressive' },
  { id: 'bold', nameKey: 'poster.template.bold', Component: PosterBold, minPhotos: 1, recommendedEnergy: 'expressive' },
  { id: 'editorial', nameKey: 'poster.template.editorial', Component: PosterEditorial, minPhotos: 1, recommendedEnergy: 'calm' },
  { id: 'cinematic', nameKey: 'poster.template.cinematic', Component: PosterCinematic, minPhotos: 1, recommendedEnergy: 'expressive' },
  {
    id: 'galleryPrint',
    nameKey: 'poster.template.galleryPrint',
    Component: PosterGalleryPrint,
    minPhotos: 1,
    // A mat-and-frame composed around one centered subject reads as wrong
    // around a crowd or an empty scene — it's built for a portrait moment.
    fitsContent: (data) => data.peopleFormat === 'single' || data.peopleFormat === 'couple',
    recommendedEnergy: 'calm',
  },
  { id: 'scrapbook', nameKey: 'poster.template.scrapbook', Component: PosterScrapbook, minPhotos: 2, recommendedEnergy: 'expressive' },
  { id: 'filmstrip', nameKey: 'poster.template.filmstrip', Component: PosterFilmstrip, minPhotos: 3 },
  { id: 'grid', nameKey: 'poster.template.grid', Component: PosterGrid, minPhotos: 4, recommendedEnergy: 'calm' },
  { id: 'collage', nameKey: 'poster.template.collage', Component: PosterCollage, minPhotos: 5, recommendedEnergy: 'expressive' },
  {
    id: 'contactSheet',
    nameKey: 'poster.template.contactSheet',
    Component: PosterContactSheet,
    // Needs enough real variety to read as an actual proof sheet, not a
    // sparse grid pretending to be one.
    minPhotos: 6,
    recommendedEnergy: 'calm',
  },
];

/**
 * Which templates are actually usable for this batch (a 2-photo shoot can't
 * fill a 6-photo grid, etc.), ordered so whichever ones match the shoot's
 * energy come first — that's what the gallery defaults to, without hiding
 * the rest — per the acceptance criteria ("mindestens 5, je nach
 * Bildmaterial auch mehr/weniger sinnvoll").
 */
export function availableTemplatesFor(data: PosterData): PosterTemplateDef[] {
  return POSTER_TEMPLATES.filter((t) => data.galleryPhotos.length >= t.minPhotos && (!t.fitsContent || t.fitsContent(data))).sort(
    (a, b) => Number(b.recommendedEnergy === data.energy) - Number(a.recommendedEnergy === data.energy),
  );
}
