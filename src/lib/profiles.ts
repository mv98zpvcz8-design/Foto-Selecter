import type { CustomPreset, ProfileRef, Purpose, WeightProfile } from '../types';

/**
 * Weighting presets per intended use. Portfolio work leans hardest on
 * technical sharpness since images are judged large and close-up;
 * Instagram leans on exposure/punchiness since images are viewed small;
 * client delivery weighs faces heavily since most client work is people
 * and a shot with closed eyes rarely gets delivered regardless of how
 * sharp it is; "sonstiges" stays balanced.
 */
export const PURPOSE_WEIGHTS: Record<Purpose, WeightProfile> = {
  instagram: { sharpness: 0.3, exposure: 0.3, group: 0.2, faces: 0.2 },
  kunde: { sharpness: 0.3, exposure: 0.25, group: 0.15, faces: 0.3 },
  portfolio: { sharpness: 0.45, exposure: 0.2, group: 0.15, faces: 0.2 },
  sonstiges: { sharpness: 0.35, exposure: 0.25, group: 0.2, faces: 0.2 },
};

export const DEFAULT_PROFILE_REF: ProfileRef = { kind: 'builtin', purpose: 'kunde' };

export function resolveWeights(ref: ProfileRef, customPresets: CustomPreset[]): WeightProfile {
  if (ref.kind === 'builtin') return PURPOSE_WEIGHTS[ref.purpose];
  const preset = customPresets.find((p) => p.id === ref.presetId);
  return preset?.weights ?? PURPOSE_WEIGHTS.sonstiges;
}

export function resolveStyleHint(ref: ProfileRef, customPresets: CustomPreset[]): Purpose {
  if (ref.kind === 'builtin') return ref.purpose;
  const preset = customPresets.find((p) => p.id === ref.presetId);
  return preset?.styleHint ?? 'sonstiges';
}

export function resolveCustomPreset(ref: ProfileRef, customPresets: CustomPreset[]): CustomPreset | undefined {
  if (ref.kind === 'builtin') return undefined;
  return customPresets.find((p) => p.id === ref.presetId);
}

/** Normalizes raw slider values (any positive scale) into weights that sum to 1. */
export function normalizeWeights(raw: WeightProfile): WeightProfile {
  const sum = raw.sharpness + raw.exposure + raw.group + raw.faces;
  if (sum <= 0) return { sharpness: 0.25, exposure: 0.25, group: 0.25, faces: 0.25 };
  return {
    sharpness: raw.sharpness / sum,
    exposure: raw.exposure / sum,
    group: raw.group / sum,
    faces: raw.faces / sum,
  };
}
