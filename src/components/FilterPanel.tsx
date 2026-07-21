import { useState } from 'react';
import type { PhotoResult, Purpose } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { FILTER_DEFS, PROFILE_FILTER_GROUPS, matchesActiveFilters } from '../lib/filters';
import { parseNaturalSearch } from '../lib/naturalSearch';

export function FilterPanel({ photos, purpose }: { photos: PhotoResult[]; purpose: Purpose }) {
  const { state, dispatch } = useAppState();
  const t = useT();
  const [searchText, setSearchText] = useState('');
  const groups = PROFILE_FILTER_GROUPS[purpose];

  function countMatches(key: string): number {
    return photos.filter((p) => matchesActiveFilters(p, [key], 'and')).length;
  }

  function runSearch() {
    if (!searchText.trim()) return;
    const { matchedKeys, unmatchedTerms } = parseNaturalSearch(searchText, purpose);
    dispatch({ type: 'APPLY_NATURAL_SEARCH', matchedKeys, unmatchedTerms });
    setSearchText('');
  }

  if (groups.length === 0) return null;

  return (
    <div className="filter-panel">
      <div className="filter-search-row">
        <input
          type="text"
          className="filter-search-input"
          placeholder={t('filter.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch();
          }}
        />
        <button type="button" className="btn btn-sm" onClick={runSearch} disabled={!searchText.trim()}>
          {t('filter.searchButton')}
        </button>
      </div>
      {state.searchUnmatchedTerms.length > 0 && (
        <p className="filter-search-hint">{t('filter.searchUnmatched', { terms: state.searchUnmatchedTerms.join(', ') })}</p>
      )}

      <div className="filter-groups">
        {groups.map((group) => (
          <div className="filter-group" key={group.labelKey}>
            <span className="filter-group-label">{t(group.labelKey)}</span>
            <div className="filter-chip-row">
              {group.filterKeys.map((key) => {
                const active = state.activeFilterKeys.includes(key);
                const count = countMatches(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`filter-chip${active ? ' active' : ''}`}
                    onClick={() => dispatch({ type: 'TOGGLE_FILTER', key })}
                  >
                    {t(FILTER_DEFS[key].labelKey)}
                    <span className="filter-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {state.activeFilterKeys.length > 0 && (
        <div className="filter-active-row">
          <div className="segmented-control filter-combine-toggle">
            <button
              type="button"
              className={`segment-btn${state.filterCombineMode === 'and' ? ' selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_FILTER_COMBINE_MODE', mode: 'and' })}
            >
              {t('filter.combineAnd')}
            </button>
            <button
              type="button"
              className={`segment-btn${state.filterCombineMode === 'or' ? ' selected' : ''}`}
              onClick={() => dispatch({ type: 'SET_FILTER_COMBINE_MODE', mode: 'or' })}
            >
              {t('filter.combineOr')}
            </button>
          </div>
          <div className="active-filter-chips">
            {state.activeFilterKeys.map((key) => (
              <span key={key} className="active-filter-chip">
                {t(FILTER_DEFS[key].labelKey)}
                <button type="button" onClick={() => dispatch({ type: 'TOGGLE_FILTER', key })} aria-label={t('filter.removeChip')}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}>
            {t('filter.resetAll')}
          </button>
        </div>
      )}
    </div>
  );
}
