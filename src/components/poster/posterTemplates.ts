import type { ComponentType } from 'react';
import type { PosterData } from '../../lib/posterData';
import { PosterMinimalist } from './PosterMinimalist';
import { PosterGrid } from './PosterGrid';
import { PosterTypography } from './PosterTypography';
import { PosterEditorial } from './PosterEditorial';
import { PosterCinematic } from './PosterCinematic';
import { PosterFilmstrip } from './PosterFilmstrip';

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
}

export const POSTER_TEMPLATES: PosterTemplateDef[] = [
  { id: 'minimalist', nameKey: 'poster.template.minimalist', Component: PosterMinimalist, minPhotos: 1 },
  { id: 'grid', nameKey: 'poster.template.grid', Component: PosterGrid, minPhotos: 4 },
  { id: 'typography', nameKey: 'poster.template.typography', Component: PosterTypography, minPhotos: 1 },
  { id: 'editorial', nameKey: 'poster.template.editorial', Component: PosterEditorial, minPhotos: 1 },
  { id: 'cinematic', nameKey: 'poster.template.cinematic', Component: PosterCinematic, minPhotos: 1 },
  { id: 'filmstrip', nameKey: 'poster.template.filmstrip', Component: PosterFilmstrip, minPhotos: 3 },
];

/** Which templates are actually usable for this batch (a 2-photo shoot can't fill a 6-photo grid, etc.) — dynamic per the acceptance criteria ("mindestens 5, je nach Bildmaterial auch mehr/weniger sinnvoll"). */
export function availableTemplatesFor(data: PosterData): PosterTemplateDef[] {
  return POSTER_TEMPLATES.filter((t) => data.galleryPhotos.length >= t.minPhotos);
}
