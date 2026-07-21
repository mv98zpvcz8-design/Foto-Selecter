import { useMemo } from 'react';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { PhotoCard } from './PhotoCard';
import { CarouselSection } from './CarouselSection';
import { exportAsCsv, exportAsTxt } from '../lib/exportResults';
import { resolveCustomPreset, resolveStyleHint } from '../lib/profiles';

export function ResultsScreen() {
  const { state, dispatch } = useAppState();
  const t = useT();
  const { photos, showAll } = state;

  const profileDisplayName =
    state.profileRef.kind === 'builtin'
      ? t(`purpose.${state.profileRef.purpose}`)
      : resolveCustomPreset(state.profileRef, state.customPresets)?.name ?? t('purpose.sonstiges');

  const donePhotos = useMemo(() => photos.filter((p) => p.status === 'done'), [photos]);
  const errorPhotos = useMemo(() => photos.filter((p) => p.status === 'error'), [photos]);
  const preselected = useMemo(() => donePhotos.filter((p) => p.isPreselected), [donePhotos]);
  const selectedCount = useMemo(() => photos.filter((p) => p.isSelected).length, [photos]);

  const isInstagram = resolveStyleHint(state.profileRef, state.customPresets) === 'instagram';
  const carouselPhotos = useMemo(
    () => preselected.filter((p) => p.carouselPosition != null),
    [preselected],
  );

  const visiblePhotos = showAll ? donePhotos : preselected;
  const sortedVisible = useMemo(
    () => [...visiblePhotos].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)),
    [visiblePhotos],
  );

  return (
    <div>
      <div className="results-toolbar">
        <div className="results-stats">
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

      {isInstagram && carouselPhotos.length > 0 && <CarouselSection photos={carouselPhotos} />}

      {sortedVisible.length === 0 ? (
        <div className="empty-state">{t('results.empty')}</div>
      ) : (
        <div className="photo-grid">
          {sortedVisible.map((p, i) => (
            <PhotoCard key={p.id} photo={p} allPhotos={sortedVisible} index={i} />
          ))}
        </div>
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
    </div>
  );
}
