import type { PhotoResult, SemanticTag } from '../types';

let counter = 0;

/** Minimal but realistic PhotoResult stand-in for pure-logic unit tests — no real File I/O involved. */
export function makePhoto(overrides: Partial<PhotoResult> = {}): PhotoResult {
  counter += 1;
  const name = overrides.name ?? `photo-${counter}.jpg`;
  return {
    id: `id-${counter}`,
    file: new File([`fake-${counter}`], name, { type: 'image/jpeg' }),
    name,
    status: 'done',
    ...overrides,
  };
}

export function tag(key: string, confidence: number): SemanticTag {
  return { key: key as SemanticTag['key'], confidence };
}
