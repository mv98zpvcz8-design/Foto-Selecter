import { useMemo, useState } from 'react';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { PhotoCard } from './PhotoCard';
import { CarouselSection } from './CarouselSection';
import { FilterPanel } from './FilterPanel';
import { AnalyticsScreen } from './AnalyticsScreen';
import { VirtualizedGrid } from './VirtualizedGrid';
import { PosterGeneratorScreen } from './PosterGeneratorScreen';
import { LightroomPicksPanel } from './LightroomPicksPanel';
import { exportAsCsv, exportAsTxt } from '../lib/exportResults';
import { resolveCustomPreset, resolveStyleHint } from '../lib/profiles';
import { TIER_EDIT_THRESHOLD, TIER_POTENTIAL_THRESHOLD, tierForScore } from '../lib/scoring';
import { matchesActiveFilters } from '../lib/filters';
import type { PhotoResult, Tier } from '../types';

function TierSection({
  titleKey,
  descKey,
  descVars,
  photos,
}: {
  titleKey: string;
  descKey: string;
  descVars?: Record<string, number>;
  photos: PhotoResult[];
}) {
  const t = useT();
  if (photos.length === 0) return null;
  return (
    <>
      <div className="section-heading">{t(titleKey)} ({photos.length})</div>
      <div className="tier-desc">{t(descKey, descVars)}</div>
      <VirtualizedGrid
        items={photos}
        renderItem={(p, i) => <PhotoCard key={p.id} photo={p} allPhotos={photos} index={i} />}
      />
    </>
  );
}

export function ResultsScreen() {
  const { state, dispatch } = useAppState();
  const t = useT();
  const { photos, showAll } = state;
  const isTriage = state.selectionMode === 'triage';
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPosterGenerator, setShowPosterGenerator] = useState(false);

  const profileDisplayName =
    state.profileRef.kind === 'builtin'
      ? t(`purpose.${state.profileRef.purpose}`)
      : resolveCustomPreset(state.profileRef, state.customPresets)?.name ?? t('purpose.sonstiges');

  const purpose = resolveStyleHint(state.profileRef, state.customPresets);

  const donePhotos = useMemo(() => photos.filter((p) => p.status === 'done'), [photos]);
  const errorPhotos = useMemo(() => photos.filter((p) => p.status === 'error'), [photos]);
  const preselected = useMemo(() => donePhotos.filter((p) => p.isPreselected), [donePhotos]);
  const selectedCount = useMemo(() => photos.filter((p) => p.isSelected).length, [photos]);

  const isInstagram = purpose === 'instagram';
  const carouselPhotos = useMemo(
    () => preselected.filter((p) => p.carouselPosition != null),
    [preselected],
  );

  const visiblePhotos = showAll ? donePhotos : preselected;
  const filteredVisible = useMemo(
    () => visiblePhotos.filter((p) => matchesActiveFilters(p, state.activeFilterKeys, state.filterCombineMode)),
    [visiblePhotos, state.activeFilterKeys, state.filterCombineMode],
  );
  const sortedVisible = useMemo(
    () => [...filteredVisible].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)),
    [filteredVisible],
  );

  const tierBuckets = useMemo(() => {
    const buckets: Record<Tier, PhotoResult[]> = { edit: [], potential: [], skip: [] };
    for (const p of sortedVisible) {
      const tier = p.tier ?? tierForScore(p.overallScore ?? 0);
      buckets[tier].push(p);
    }
    return buckets;
  }, [sortedVisible]);

  const editCount = useMemo(() => donePhotos.filter((p) => p.tier === 'edit').length, [donePhotos]);
  const potentialCount = useMemo(() => donePhotos.filter((p) => p.tier === 'potential').length, [donePhotos]);

  return (
    <div>
      <div className="results-toolbar">
        <div className="results-stats">
          {isTriage ? (
            <>
              <div>
                <strong>{editCount}</strong>
                <div>{t('results.tierEdit')}</div>
              </div>
              <div>
                <strong>{potentialCount}</strong>
                <div>{t('results.tierPotential')}</div>
              </div>
              <div>
                <strong>{donePhotos.length}</strong>
                <div>{t('results.totalAnalyzed')}</div>
              </div>
            </>
          ) : (
            <>
              <div>
                <strong>{selectedCount}</strong>
                <div>{t('results.selected')}</div>
              </div>
              <div>
                <strong>{preselected.length}</strong>
                <div>{t('results.suggested', { purpose: profileDisplayName })}</div>
              </div>
              <div>
                <strong>{donePhotos.length}</strong>
                <div>{t('results.totalAnalyzed')}</div>
              </div>
            </>
          )}
        </div>
        <div className="toolbar-actions">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => dispatch({ type: 'SET_SHOW_ALL', showAll: e.target.checked })}
            />
            {t('results.showAll')}
          </label>
          <button type="button" className="btn btn-sm" onClick={() => exportAsTxt(photos)}>
            {t('results.exportTxt')}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportAsCsv(photos, t)}>
            {t('results.exportCsv')}
          </button>
          <button
            type="button"
            className={`btn btn-sm${showAnalytics ? ' btn-primary' : ' btn-ghost'}`}
            onClick={() => setShowAnalytics((v) => !v)}
          >
            {t('analytics.toggle')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPosterGenerator(true)}>
            {t('poster.toggle')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => dispatch({ type: 'GO_TO_STEP', step: 'config' })}
          >
            {t('results.backToConfig')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'RESET' })}>
            {t('results.newRun')}
          </button>
        </div>
      </div>

      <LightroomPicksPanel />

      {showAnalytics ? (
        <AnalyticsScreen photos={donePhotos} purpose={purpose} />
      ) : (
        <>
          <FilterPanel photos={visiblePhotos} purpose={purpose} />

          {isInstagram && carouselPhotos.length > 0 && <CarouselSection photos={carouselPhotos} />}

          {isTriage ? (
            sortedVisible.length === 0 ? (
              <div className="empty-state">
                {t(visiblePhotos.length > 0 ? 'results.emptyFiltered' : 'results.empty')}
              </div>
            ) : (
              <>
                <TierSection
                  titleKey="results.tierEdit"
                  descKey="results.tierEdit.desc"
                  descVars={{ threshold: TIER_EDIT_THRESHOLD }}
                  photos={tierBuckets.edit}
                />
                <TierSection
                  titleKey="results.tierPotential"
                  descKey="results.tierPotential.desc"
                  descVars={{ lower: TIER_POTENTIAL_THRESHOLD, upper: TIER_EDIT_THRESHOLD - 1 }}
                  photos={tierBuckets.potential}
                />
                <TierSection
                  titleKey="results.tierSkip"
                  descKey="results.tierSkip.desc"
                  descVars={{ threshold: TIER_POTENTIAL_THRESHOLD }}
                  photos={tierBuckets.skip}
                />
              </>
            )
          ) : sortedVisible.length === 0 ? (
            <div className="empty-state">
              {t(visiblePhotos.length > 0 ? 'results.emptyFiltered' : 'results.empty')}
            </div>
          ) : (
            <VirtualizedGrid
              items={sortedVisible}
              renderItem={(p, i) => <PhotoCard key={p.id} photo={p} allPhotos={sortedVisible} index={i} />}
            />
          )}

          {errorPhotos.length > 0 && (
            <>
              <div className="section-heading">{t('results.errorSection', { count: errorPhotos.length })}</div>
              <div className="photo-grid">
                {errorPhotos.map((p, i) => (
                  <PhotoCard key={p.id} photo={p} allPhotos={errorPhotos} index={i} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showPosterGenerator && (
        <div className="modal-backdrop" onClick={() => setShowPosterGenerator(false)}>
          <div
            className="series-compare-panel poster-panel-wrapper"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <PosterGeneratorScreen onClose={() => setShowPosterGenerator(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
