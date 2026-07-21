import type { Purpose } from '../types';
import { PROFILE_FILTER_GROUPS } from './filters';

interface KeywordEntry {
  filterKey: string;
  terms: string[]; // lowercase DE/EN keywords or phrases that map to this filter
}

// Deliberately only covers the filter vocabulary that actually exists
// (see filters.ts) — a query term with no match is reported back as
// "unmatched" rather than silently ignored or guessed at.
const KEYWORDS: KeywordEntry[] = [
  { filterKey: 'bw', terms: ['schwarz-weiß', 'schwarzweiß', 's/w', 'black and white', 'black-and-white', 'bw', 'monochrome'] },
  { filterKey: 'color', terms: ['farbe', 'farbig', 'color', 'colour'] },
  { filterKey: 'vividColor', terms: ['starke farben', 'kräftige farben', 'vivid', 'vivid color', 'satte farben'] },
  { filterKey: 'warmColor', terms: ['warm', 'warme farben', 'warm colors'] },
  { filterKey: 'coolColor', terms: ['kalt', 'kühl', 'kalte farben', 'cool colors'] },
  { filterKey: 'highContrast', terms: ['hoher kontrast', 'hohem kontrast', 'high contrast', 'kontrastreich'] },
  { filterKey: 'lowContrast', terms: ['niedriger kontrast', 'low contrast', 'kontrastarm'] },
  { filterKey: 'bright', terms: ['hell', 'bright'] },
  { filterKey: 'dark', terms: ['dunkel', 'dark'] },
  { filterKey: 'lowLight', terms: ['low-light', 'low light', 'wenig licht', 'schwachlicht'] },
  { filterKey: 'backlight', terms: ['gegenlicht', 'backlight'] },
  { filterKey: 'motionBlur', terms: ['bewegungsunschärfe', 'verwackelt', 'motion blur'] },
  { filterKey: 'freezeMotion', terms: ['freeze motion', 'eingefroren', 'scharf eingefangen'] },
  { filterKey: 'verySharp', terms: ['sehr scharf', 'super scharf', 'very sharp'] },
  { filterKey: 'sharp', terms: ['scharf', 'sharp'] },
  { filterKey: 'slightlySoft', terms: ['leicht unscharf', 'etwas weich', 'slightly soft'] },
  { filterKey: 'blurry', terms: ['unscharf', 'blurry', 'blurred'] },
  { filterKey: 'overexposed', terms: ['überbelichtet', 'overexposed'] },
  { filterKey: 'underexposed', terms: ['unterbelichtet', 'underexposed'] },
  { filterKey: 'faceSharp', terms: ['gesicht scharf', 'face sharp'] },
  { filterKey: 'eyesSharp', terms: ['augen scharf', 'eyes sharp'] },
  { filterKey: 'mainSubjectSharp', terms: ['hauptmotiv scharf', 'main subject sharp'] },
  { filterKey: 'noClosedEyes', terms: ['ohne geschlossene augen', 'keine geschlossenen augen', 'no closed eyes', 'without closed eyes'] },
  { filterKey: 'closedEyes', terms: ['geschlossene augen', 'closed eyes'] },
  { filterKey: 'noFaceOccluded', terms: ['gesicht nicht verdeckt', 'kein verdecktes gesicht', 'no occluded face'] },
  { filterKey: 'portraitOrientation', terms: ['hochformat', 'portrait', 'portrait orientation'] },
  { filterKey: 'landscapeOrientation', terms: ['querformat', 'landscape', 'landscape orientation'] },
  { filterKey: 'squareOrientation', terms: ['quadratisch', 'square'] },
  { filterKey: 'raw', terms: ['raw'] },
  { filterKey: 'jpeg', terms: ['jpeg', 'jpg'] },
  { filterKey: 'uniqueInSeries', terms: ['einzigartig', 'unique', 'kein duplikat'] },
  { filterKey: 'emotion', terms: ['emotion', 'emotional'] },
  { filterKey: 'joy', terms: ['freude', 'lachen', 'joy', 'happy'] },
  { filterKey: 'sadness', terms: ['trauer', 'traurig', 'sad'] },
  { filterKey: 'surprise', terms: ['überraschung', 'surprise'] },
  { filterKey: 'anger', terms: ['aggression', 'wütend', 'anger'] },
  { filterKey: 'singlePerson', terms: ['einzelperson', 'einzelne person', 'single person'] },
  { filterKey: 'multiplePersons', terms: ['mehrere personen', 'multiple people', 'multiple persons'] },
  { filterKey: 'crowdLikely', terms: ['publikum', 'menschenmenge', 'crowd', 'zuschauer'] },
  { filterKey: 'portraitLikely', terms: ['porträt', 'portrait'] },
  { filterKey: 'groupPhotoLikely', terms: ['gruppenfoto', 'gruppenbild', 'group photo'] },
  { filterKey: 'onlyFavorites', terms: ['favoriten', 'favorites', 'lieblingsbilder'] },
  { filterKey: 'highScore', terms: ['hoher score', 'high score', 'bester score', 'top score'] },
];

export interface NaturalSearchResult {
  matchedKeys: string[];
  unmatchedTerms: string[];
}

/**
 * Translates a free-text query into the combinable filter chips available
 * within the given profile — a fixed keyword lookup over the real filter
 * vocabulary, not a language model. Terms that don't map to anything are
 * reported back so the UI can say so honestly instead of pretending the
 * whole query was understood.
 */
export function parseNaturalSearch(query: string, purpose: Purpose): NaturalSearchResult {
  const available = new Set(PROFILE_FILTER_GROUPS[purpose].flatMap((g) => g.filterKeys));
  const normalized = query.toLowerCase().trim();
  if (!normalized) return { matchedKeys: [], unmatchedTerms: [] };

  const matchedKeys = new Set<string>();
  let remaining = normalized;

  // longest phrases first, so "ohne geschlossene augen" wins over "geschlossene augen"
  const sortedEntries = [...KEYWORDS].sort((a, b) => Math.max(...b.terms.map((t) => t.length)) - Math.max(...a.terms.map((t) => t.length)));
  for (const entry of sortedEntries) {
    if (!available.has(entry.filterKey)) continue;
    for (const term of entry.terms) {
      if (remaining.includes(term)) {
        matchedKeys.add(entry.filterKey);
        remaining = remaining.replace(term, ' ');
      }
    }
  }

  const unmatchedTerms = remaining
    .split(/[\s,.!?]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  return { matchedKeys: [...matchedKeys], unmatchedTerms };
}

const STOPWORDS = new Set([
  'zeige', 'zeig', 'mir', 'nur', 'die', 'der', 'das', 'und', 'von', 'mit', 'ohne', 'fotos', 'bilder', 'bild', 'foto',
  'show', 'me', 'only', 'the', 'and', 'with', 'without', 'photos', 'pictures', 'images', 'photo', 'find', 'finde',
]);
