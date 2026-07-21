export type Lang = 'de' | 'en';

type Vars = Record<string, string | number>;

const de: Record<string, string> = {
  'header.stepUpload': '1. Upload',
  'header.stepConfig': '2. Einstellungen',
  'header.stepProcessing': '3. Analyse',
  'header.stepResults': '4. Auswahl',

  'upload.title': 'RAW- oder JPEG-Dateien hierher ziehen',
  'upload.subtitle':
    'Unterstützt: {{formats}} — oder klicken, um Dateien auszuwählen. Alles bleibt lokal in deinem Browser.',
  'upload.rejected': '{{count}} Datei(en) übersprungen (nicht unterstütztes Format): {{names}}',
  'upload.clearAll': 'Alle entfernen',
  'upload.next': 'Weiter',
  'upload.noneSelected': 'Noch keine Fotos ausgewählt',
  'upload.readyCount': '{{count}} Foto(s) bereit',
  'upload.removeAria': '{{name}} entfernen',

  'config.targetLabel': 'Zielanzahl Fotos',
  'config.targetHint': 'Wie viele Fotos sollen am Ende zur Bearbeitung vorgeschlagen werden? (von {{total}} hochgeladenen)',
  'config.purposeLabel': 'Verwendungszweck',
  'config.back': 'Zurück',
  'config.start': 'Analyse starten',

  'purpose.instagram': 'Instagram',
  'purpose.kunde': 'Kunde',
  'purpose.portfolio': 'Portfolio',
  'purpose.sonstiges': 'Sonstiges',
  'purpose.instagram.desc': 'Belichtung & Wirkung im Feed zählen mehr als reine Detailschärfe',
  'purpose.kunde.desc': 'Ausgewogen, mit Fokus auf Verlässlichkeit und Vielfalt der Momente',
  'purpose.portfolio.desc': 'Höchste Ansprüche an Schärfe & technische Qualität',
  'purpose.sonstiges.desc': 'Ausgewogene Standard-Gewichtung',

  'processing.title': 'Fotos werden analysiert…',
  'processing.label':
    '{{done}} von {{total}} Fotos verarbeitet — Vorschau-Extraktion, Schärfe- & Belichtungsanalyse, Duplikat-Erkennung',
  'processing.cancel': 'Abbrechen',

  'results.selected': 'ausgewählt',
  'results.suggested': 'Vorschlag ({{purpose}})',
  'results.totalAnalyzed': 'gesamt analysiert',
  'results.showAll': 'Alle anzeigen',
  'results.exportTxt': '.txt exportieren',
  'results.exportCsv': '.csv exportieren',
  'results.backToConfig': 'Einstellungen ändern',
  'results.newRun': 'Neuer Durchlauf',
  'results.empty': 'Keine Fotos in dieser Ansicht.',
  'results.errorSection': 'Nicht auswertbare Dateien ({{count}})',

  'photo.previewFailed': 'Vorschau fehlgeschlagen',
  'photo.excludedNote': 'Wurde nicht in die Bewertung einbezogen.',
  'photo.seriesBadge': 'Serie {{rank}}/{{size}}',
  'photo.lightroomHeading': 'Lightroom-Feinschliff',
  'photo.selectAria': '{{name}} auswählen',

  'reasoning.sharpness.excellent': 'sehr scharf',
  'reasoning.sharpness.good': 'scharf',
  'reasoning.sharpness.soft': 'leicht unscharf',
  'reasoning.sharpness.blurry': 'unscharf',
  'reasoning.exposure.good': 'gut belichtet',
  'reasoning.exposure.acceptable': 'akzeptabel belichtet',
  'reasoning.exposure.underexposed': 'teils unterbelichtet',
  'reasoning.exposure.overexposed': 'teils überbelichtet',
  'reasoning.groupBest': 'beste von {{size}} Fotos dieser Serie',
  'reasoning.groupRank': '{{rank}}. von {{size}} Fotos dieser Serie',

  'lr.highlights':
    '~{{percent}}% der Fläche wirkt ausgefressen — beide leicht absenken, um Zeichnung in den Lichtern zurückzuholen.',
  'lr.shadows':
    '~{{percent}}% der Fläche säuft ab — Shadows anheben, Blacks nur behutsam, damit der Look nicht flach wirkt.',
  'lr.exposureLow': 'Bild wirkt insgesamt unterbelichtet — um ca. +0.3 bis +0.7 EV anheben.',
  'lr.exposureHigh': 'Bild wirkt insgesamt überbelichtet — leicht absenken, danach Whites/Highlights neu justieren.',
  'lr.sharpening':
    'Im Detail-Panel maskiert nachschärfen (hoher Masking-Wert), damit nur Kanten geschärft werden und Rauschen ruhig bleibt.',
  'lr.portfolioClarity': 'Dezent erhöhen für mehr Tiefe/Kontrast in den Mitteltönen.',
  'lr.portfolioTexture': 'Feine Strukturen betonen, ohne den Rauschanteil zu verstärken.',
  'lr.portfolioCrop': 'Bildausschnitt nachjustieren — für Portfolios zählt jede Kante der Komposition.',
  'lr.instaVibrance': 'Leicht erhöhen für einen kräftigeren, feed-tauglichen Look, ohne Hauttöne zu verfälschen.',
  'lr.instaToneCurve': 'Sanfte S-Kurve für mehr Punch in der kleinen Bildschirmansicht.',
  'lr.instaVignette': 'Dezent abdunkeln, um den Blick zum Motiv zu lenken.',
  'lr.kundeWhiteBalance': 'Feinabstimmung für konsistente, natürliche Farben über die ganze Serie.',
  'lr.kundeToneCurve': 'Sanfter Grundkontrast für ein poliertes, aber unaufdringliches Ergebnis.',
  'lr.defaultToneCurve': 'Grundkontrast verfeinern für mehr Bildwirkung.',

  'export.header': 'Dateiname,Score,Begründung,Vorausgewählt,Lightroom-Empfehlungen',
  'export.yes': 'ja',
  'export.no': 'nein',

  'error.noPreview': 'Kein eingebettetes Vorschaubild gefunden',
  'error.previewLoadFailed': 'Vorschaubild konnte nicht geladen werden',
  'error.canvasUnavailable': 'Canvas 2D-Kontext nicht verfügbar',
  'error.imageLoadFailed': 'Bild konnte nicht geladen werden',
  'error.unknown': 'Unbekannter Fehler',
};

const en: Record<string, string> = {
  'header.stepUpload': '1. Upload',
  'header.stepConfig': '2. Settings',
  'header.stepProcessing': '3. Analysis',
  'header.stepResults': '4. Selection',

  'upload.title': 'Drag RAW or JPEG files here',
  'upload.subtitle': 'Supported: {{formats}} — or click to choose files. Everything stays local in your browser.',
  'upload.rejected': '{{count}} file(s) skipped (unsupported format): {{names}}',
  'upload.clearAll': 'Remove all',
  'upload.next': 'Next',
  'upload.noneSelected': 'No photos selected yet',
  'upload.readyCount': '{{count}} photo(s) ready',
  'upload.removeAria': 'Remove {{name}}',

  'config.targetLabel': 'Target number of photos',
  'config.targetHint': 'How many photos should be suggested for editing in the end? (of {{total}} uploaded)',
  'config.purposeLabel': 'Intended use',
  'config.back': 'Back',
  'config.start': 'Start analysis',

  'purpose.instagram': 'Instagram',
  'purpose.kunde': 'Client',
  'purpose.portfolio': 'Portfolio',
  'purpose.sonstiges': 'Other',
  'purpose.instagram.desc': 'Exposure & feed impact matter more than raw sharpness',
  'purpose.kunde.desc': 'Balanced, with a focus on reliability and variety of moments',
  'purpose.portfolio.desc': 'Highest demands on sharpness & technical quality',
  'purpose.sonstiges.desc': 'Balanced default weighting',

  'processing.title': 'Analyzing photos…',
  'processing.label':
    '{{done}} of {{total}} photos processed — preview extraction, sharpness & exposure analysis, duplicate detection',
  'processing.cancel': 'Cancel',

  'results.selected': 'selected',
  'results.suggested': 'Suggested ({{purpose}})',
  'results.totalAnalyzed': 'total analyzed',
  'results.showAll': 'Show all',
  'results.exportTxt': 'Export .txt',
  'results.exportCsv': 'Export .csv',
  'results.backToConfig': 'Change settings',
  'results.newRun': 'New run',
  'results.empty': 'No photos in this view.',
  'results.errorSection': "Files that couldn't be evaluated ({{count}})",

  'photo.previewFailed': 'Preview failed',
  'photo.excludedNote': 'Was not included in the evaluation.',
  'photo.seriesBadge': 'Series {{rank}}/{{size}}',
  'photo.lightroomHeading': 'Lightroom finishing touches',
  'photo.selectAria': 'Select {{name}}',

  'reasoning.sharpness.excellent': 'very sharp',
  'reasoning.sharpness.good': 'sharp',
  'reasoning.sharpness.soft': 'slightly soft',
  'reasoning.sharpness.blurry': 'blurry',
  'reasoning.exposure.good': 'well exposed',
  'reasoning.exposure.acceptable': 'acceptably exposed',
  'reasoning.exposure.underexposed': 'partly underexposed',
  'reasoning.exposure.overexposed': 'partly overexposed',
  'reasoning.groupBest': 'best of {{size}} photos in this series',
  'reasoning.groupRank': '{{rank}} of {{size}} photos in this series',

  'lr.highlights': '~{{percent}}% of the frame looks blown out — lower both slightly to recover highlight detail.',
  'lr.shadows':
    "~{{percent}}% of the frame is crushed — raise Shadows, nudge Blacks carefully so the look doesn't go flat.",
  'lr.exposureLow': 'Image looks underexposed overall — raise by roughly +0.3 to +0.7 EV.',
  'lr.exposureHigh': 'Image looks overexposed overall — lower slightly, then re-balance Whites/Highlights.',
  'lr.sharpening':
    'Sharpen with masking in the Detail panel (high Masking value) so only edges get sharpened and noise stays calm.',
  'lr.portfolioClarity': 'Increase subtly for more depth/contrast in the midtones.',
  'lr.portfolioTexture': 'Emphasize fine detail without amplifying noise.',
  'lr.portfolioCrop': 'Fine-tune the crop — in portfolio work every edge of the composition counts.',
  'lr.instaVibrance': 'Raise slightly for a punchier, feed-ready look without distorting skin tones.',
  'lr.instaToneCurve': 'Gentle S-curve for more punch at small screen sizes.',
  'lr.instaVignette': 'Darken subtly to draw the eye to the subject.',
  'lr.kundeWhiteBalance': 'Fine-tune for consistent, natural color across the whole set.',
  'lr.kundeToneCurve': 'Gentle base contrast for a polished but understated result.',
  'lr.defaultToneCurve': 'Refine base contrast for more visual impact.',

  'export.header': 'Filename,Score,Reasoning,Preselected,Lightroom Recommendations',
  'export.yes': 'yes',
  'export.no': 'no',

  'error.noPreview': 'No embedded preview image found',
  'error.previewLoadFailed': 'Preview image could not be loaded',
  'error.canvasUnavailable': 'Canvas 2D context unavailable',
  'error.imageLoadFailed': 'Image could not be loaded',
  'error.unknown': 'Unknown error',
};

const dictionaries: Record<Lang, Record<string, string>> = { de, en };

export function translate(lang: Lang, key: string, vars?: Vars): string {
  const template = dictionaries[lang][key] ?? dictionaries.de[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ''));
}
