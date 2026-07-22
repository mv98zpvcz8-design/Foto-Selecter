import { useEffect, useMemo, useState } from 'react';
import type { PhotoResult, Purpose } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { computeShotAnalytics } from '../lib/analytics';
import { buildCoachingResume, type TextSlot } from '../lib/coaching';
import { clearShootingHistory, loadShootingHistory } from '../lib/shootingHistory';
import type { ShootingSnapshot } from '../types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="analytics-stat">
      <strong>{value}</strong>
      <div>{label}</div>
    </div>
  );
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

interface BestCategory {
  labelKey: string;
  photos: PhotoResult[];
  filterKey?: string;
}

function topByScore(photos: PhotoResult[], n: number, predicate?: (p: PhotoResult) => boolean): PhotoResult[] {
  return [...photos]
    .filter((p) => (predicate ? predicate(p) : true))
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    .slice(0, n);
}

function hasTag(photo: PhotoResult, key: string): boolean {
  return (photo.semanticTags?.find((t) => t.key === key)?.confidence ?? 0) >= 0.5;
}

export function AnalyticsScreen({ photos, purpose }: { photos: PhotoResult[]; purpose: Purpose }) {
  const { state, dispatch } = useAppState();
  const t = useT();
  const [history, setHistory] = useState<ShootingSnapshot[] | null>(null);

  useEffect(() => {
    loadShootingHistory().then(setHistory);
  }, []);

  // The current shoot's own snapshot may already be saved to history by the
  // time this loads — exclude it so comparisons/recurring-strength checks
  // don't compare the shoot against itself.
  const priorHistory = useMemo(
    () => (history ? history.filter((h) => h.id !== state.currentSnapshotId) : null),
    [history, state.currentSnapshotId],
  );

  const analytics = useMemo(() => computeShotAnalytics(photos, purpose), [photos, purpose]);
  const resume = useMemo(
    () => (priorHistory ? buildCoachingResume(photos, analytics, priorHistory, purpose) : null),
    [photos, analytics, priorHistory, purpose],
  );

  const bestCategories: BestCategory[] = useMemo(
    () => [
      { labelKey: 'analytics.bestOverall', photos: topByScore(photos, 5) },
      { labelKey: 'analytics.bestEmotion', photos: topByScore(photos, 3, (p) => hasTag(p, 'emotion')), filterKey: 'emotion' },
      { labelKey: 'analytics.bestCrowd', photos: topByScore(photos, 3, (p) => hasTag(p, 'crowdLikely')), filterKey: 'crowdLikely' },
      { labelKey: 'analytics.bestAction', photos: topByScore(photos, 3, (p) => hasTag(p, 'freezeMotion')), filterKey: 'freezeMotion' },
      { labelKey: 'analytics.bestBw', photos: topByScore(photos, 3, (p) => hasTag(p, 'bw')), filterKey: 'bw' },
      {
        labelKey: 'analytics.bestTechnical',
        photos: [...photos].sort((a, b) => (b.sharpnessScore ?? 0) + (b.exposureScore ?? 0) - ((a.sharpnessScore ?? 0) + (a.exposureScore ?? 0))).slice(0, 3),
      },
    ],
    [photos],
  );

  function jumpToFilter(filterKey?: string) {
    if (!filterKey) return;
    dispatch({ type: 'CLEAR_FILTERS' });
    dispatch({ type: 'TOGGLE_FILTER', key: filterKey });
  }

  function renderSlot(slot: TextSlot, key?: string) {
    return <li key={key ?? slot.key}>{t(slot.key, slot.vars)}</li>;
  }

  return (
    <div className="analytics-screen">
      <p className="analytics-scope-note">{t('analytics.scopeNote')}</p>

      <div className="analytics-stats-grid">
        <Stat label={t('analytics.uploaded')} value={analytics.photoCount} />
        <Stat label={t('analytics.analyzed')} value={analytics.analyzedCount} />
        <Stat label={t('analytics.selected')} value={analytics.selectedCount} />
        <Stat label={t('analytics.selectionRate')} value={pct(analytics.selectionRate)} />
        <Stat label={t('analytics.groupCount')} value={analytics.groupCount} />
        <Stat label={t('analytics.avgGroupSize')} value={analytics.avgGroupSize.toFixed(1)} />
        <Stat label={t('analytics.avgOverallScore')} value={analytics.avgOverallScore} />
        <Stat label={t('analytics.avgSharpnessScore')} value={analytics.avgSharpnessScore} />
        <Stat label={t('analytics.avgExposureScore')} value={analytics.avgExposureScore} />
        <Stat label={t('analytics.portraitShare')} value={pct(analytics.portraitShare)} />
        <Stat label={t('analytics.landscapeShare')} value={pct(analytics.landscapeShare)} />
        <Stat label={t('analytics.bwShare')} value={pct(analytics.bwShare)} />
      </div>

      {(analytics.focalLengthStats.length > 0 || analytics.isoStats.length > 0 || analytics.lensStats.length > 0) && (
        <>
          <div className="section-heading">{t('analytics.technicalHeading')}</div>
          <div className="analytics-bucket-tables">
            {analytics.focalLengthStats.length > 0 && (
              <table className="analytics-table">
                <caption>{t('analytics.focalLengthTable')}</caption>
                <thead>
                  <tr>
                    <th>{t('analytics.colBucket')}</th>
                    <th>{t('analytics.colCount')}</th>
                    <th>{t('analytics.colAvgSharpness')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.focalLengthStats.map((b) => (
                    <tr key={b.label}>
                      <td>{b.label}</td>
                      <td>{b.count}</td>
                      <td>{b.avgSharpnessScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {analytics.isoStats.length > 0 && (
              <table className="analytics-table">
                <caption>{t('analytics.isoTable')}</caption>
                <thead>
                  <tr>
                    <th>{t('analytics.colBucket')}</th>
                    <th>{t('analytics.colCount')}</th>
                    <th>{t('analytics.colAvgScore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.isoStats.map((b) => (
                    <tr key={b.label}>
                      <td>ISO {b.label}</td>
                      <td>{b.count}</td>
                      <td>{b.avgOverallScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {analytics.lensStats.length > 0 && (
              <table className="analytics-table">
                <caption>{t('analytics.lensTable')}</caption>
                <thead>
                  <tr>
                    <th>{t('analytics.colBucket')}</th>
                    <th>{t('analytics.colCount')}</th>
                    <th>{t('analytics.colAvgScore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.lensStats.map((b) => (
                    <tr key={b.label}>
                      <td>{b.label}</td>
                      <td>{b.count}</td>
                      <td>{b.avgOverallScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {analytics.insights.length > 0 && (
        <>
          <div className="section-heading">{t('analytics.insightsHeading')}</div>
          <ul className="analytics-insight-list">{analytics.insights.map((i) => renderSlot({ key: i.textKey, vars: i.vars }, i.key))}</ul>
        </>
      )}

      <div className="section-heading">{t('analytics.bestOfHeading')}</div>
      <p className="analytics-scope-note">{t('analytics.bestOfScopeNote')}</p>
      <div className="analytics-best-of-grid">
        {bestCategories.map(
          (cat) =>
            cat.photos.length > 0 && (
              <div className="best-of-card" key={cat.labelKey}>
                <div className="best-of-title">{t(cat.labelKey)}</div>
                <div className="best-of-thumbs">
                  {cat.photos.map((p) => (
                    <img key={p.id} src={p.thumbnailUrl ?? p.previewUrl} alt={p.name} loading="lazy" />
                  ))}
                </div>
                {cat.filterKey && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => jumpToFilter(cat.filterKey)}>
                    {t('analytics.jumpToFilter')}
                  </button>
                )}
              </div>
            ),
        )}
      </div>

      {resume && (
        <>
          <div className="section-heading">{t('coaching.resumeHeading')}</div>
          <div className="coaching-resume">
            <p className="coaching-overall">{t(resume.overall.key, resume.overall.vars)}</p>

            {!resume.hasEnoughData ? (
              <ul className="coaching-notes">{resume.insufficientDataNotes.map((n, i) => renderSlot(n, `insufficient-${i}`))}</ul>
            ) : (
              <>
                {resume.strengths.length > 0 && (
                  <>
                    <h4>{t('coaching.strengthsHeading')}</h4>
                    <ul>{resume.strengths.map((s, i) => renderSlot(s, `strength-${i}`))}</ul>
                  </>
                )}
                {resume.recurringStrengths.length > 0 && (
                  <>
                    <h4>{t('coaching.recurringHeading')}</h4>
                    <ul>{resume.recurringStrengths.map((s, i) => renderSlot(s, `recurring-${i}`))}</ul>
                  </>
                )}
                {resume.weaknesses.length > 0 && (
                  <>
                    <h4>{t('coaching.weaknessesHeading')}</h4>
                    <ul>{resume.weaknesses.map((s, i) => renderSlot(s, `weakness-${i}`))}</ul>
                  </>
                )}
                {resume.practiceAreas.length > 0 && (
                  <>
                    <h4>{t('coaching.practiceHeading')}</h4>
                    <ol className="coaching-practice-list">
                      {resume.practiceAreas.map((area, i) => (
                        <li key={i}>
                          <div className="practice-observation">{t(area.observation.key, area.observation.vars)}</div>
                          <div className="practice-exercise">{t('coaching.exerciseLabel')}: {t(area.exercise.key)}</div>
                          <div className="practice-benefit">{t('coaching.benefitLabel')}: {t(area.benefit.key)}</div>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {resume.comparisons.length > 0 && (
                  <>
                    <h4>{t('coaching.comparisonHeading')}</h4>
                    <ul>{resume.comparisons.map((c, i) => renderSlot(c, `comparison-${i}`))}</ul>
                  </>
                )}
                {resume.insufficientDataNotes.length > 0 && (
                  <ul className="coaching-notes">{resume.insufficientDataNotes.map((n, i) => renderSlot(n, `note-${i}`))}</ul>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              clearShootingHistory().then(() => setHistory([]));
            }}
          >
            {t('coaching.clearHistory')}
          </button>
        </>
      )}
    </div>
  );
}
