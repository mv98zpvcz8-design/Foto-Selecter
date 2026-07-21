import type { PhotoResult } from '../types';

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

export function exportAsTxt(photos: PhotoResult[]) {
  const selected = photos.filter((p) => p.isSelected);
  const content = selected.map((p) => p.name).join('\n');
  download('opticsbydom-auswahl.txt', content, 'text/plain;charset=utf-8');
}

export function exportAsCsv(photos: PhotoResult[]) {
  const selected = photos.filter((p) => p.isSelected);
  const header = 'Dateiname,Score,Begründung,Vorausgewählt,Lightroom-Empfehlungen';
  const rows = selected.map((p) =>
    [
      csvEscape(p.name),
      String(p.overallScore ?? ''),
      csvEscape(p.reasoning ?? ''),
      p.isPreselected ? 'ja' : 'nein',
      csvEscape((p.lightroomSuggestions ?? []).map((s) => `${s.slider}: ${s.note}`).join(' | ')),
    ].join(','),
  );
  const content = [header, ...rows].join('\n');
  download('opticsbydom-auswahl.csv', content, 'text/csv;charset=utf-8');
}
