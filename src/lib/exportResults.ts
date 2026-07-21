import type { PhotoResult } from '../types';
import { classifyReasoning } from './reasoning';
import { formatReasoning, formatSuggestionNote } from '../i18n/format';

type T = (key: string, vars?: Record<string, string | number>) => string;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Carousel position first (when set, e.g. Instagram), otherwise leaves relative order untouched. */
function orderForExport(photos: PhotoResult[]): PhotoResult[] {
  const hasCarouselOrder = photos.some((p) => p.carouselPosition != null);
  if (!hasCarouselOrder) return photos;
  return [...photos].sort((a, b) => (a.carouselPosition ?? Infinity) - (b.carouselPosition ?? Infinity));
}

export function exportAsTxt(photos: PhotoResult[]) {
  const selected = orderForExport(photos.filter((p) => p.isSelected));
  const content = selected.map((p) => p.name).join('\n');
  download('opticsbydom-auswahl.txt', content, 'text/plain;charset=utf-8');
}

function tierLabel(p: PhotoResult, t: T): string {
  if (p.tier === 'edit') return t('results.tierEdit');
  if (p.tier === 'potential') return t('results.tierPotential');
  if (p.tier === 'skip') return t('results.tierSkip');
  return '';
}

export function exportAsCsv(photos: PhotoResult[], t: T) {
  const selected = orderForExport(photos.filter((p) => p.isSelected));
  const header = t('export.header');
  const rows = selected.map((p) => {
    const reasoning = formatReasoning(classifyReasoning(p), t);
    const suggestions = (p.lightroomSuggestions ?? [])
      .map((s) => `${s.slider}: ${formatSuggestionNote(s, t)}`)
      .join(' | ');
    return [
      csvEscape(p.name),
      String(p.overallScore ?? ''),
      csvEscape(reasoning),
      p.isPreselected ? t('export.yes') : t('export.no'),
      csvEscape(suggestions),
      p.carouselPosition ?? '',
      csvEscape(tierLabel(p, t)),
    ].join(',');
  });
  const content = [header, ...rows].join('\n');
  download('opticsbydom-auswahl.csv', content, 'text/csv;charset=utf-8');
}
