import { useEffect, useRef, useState, type ReactNode } from 'react';

const ROW_GAP = 20;
const CARD_MIN_WIDTH_DESKTOP = 260;
const CARD_MIN_WIDTH_MOBILE = 200;
const MOBILE_BREAKPOINT = 640;
// Rough estimate of a rendered PhotoCard's height (3:2 thumb + info block).
// Real cards vary slightly with content (reasoning text length, number of
// Lightroom suggestions), so this is padded with overscan rows rather than
// measured exactly — good enough for windowing, not for pixel-perfect
// scrollbar sizing.
const ESTIMATED_ROW_HEIGHT = 360;
const OVERSCAN_ROWS = 3;
// Below this count, just render everything — windowing only earns its
// complexity once a shoot has hundreds to 1000+ photos in one grid.
const VIRTUALIZE_THRESHOLD = 60;

/**
 * Windowed version of the `.photo-grid` CSS grid: only mounts the rows
 * currently near the viewport, with two spacer cells (spanning all
 * columns) standing in for the rows above/below. Keeps large shoots
 * (hundreds to 1000+ photos) from turning into thousands of live <img>/
 * DOM nodes at once, which is where real scroll/memory jank starts for
 * event/sport-sized batches. Falls back to plain rendering for smaller
 * lists, where the extra bookkeeping isn't worth it.
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  className = 'photo-grid',
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [range, setRange] = useState({ start: 0, end: items.length });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (items.length < VIRTUALIZE_THRESHOLD || containerWidth === 0) {
      setRange({ start: 0, end: items.length });
      return;
    }

    const minColWidth = containerWidth < MOBILE_BREAKPOINT ? CARD_MIN_WIDTH_MOBILE : CARD_MIN_WIDTH_DESKTOP;
    const columns = Math.max(1, Math.floor((containerWidth + ROW_GAP) / (minColWidth + ROW_GAP)));
    const rowHeight = ESTIMATED_ROW_HEIGHT + ROW_GAP;

    function updateRange() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolledPastTop = Math.max(0, -rect.top);
      const viewportHeight = window.innerHeight;

      const firstRow = Math.max(0, Math.floor(scrolledPastTop / rowHeight) - OVERSCAN_ROWS);
      const lastRow = Math.ceil((scrolledPastTop + viewportHeight) / rowHeight) + OVERSCAN_ROWS;

      setRange({
        start: Math.min(items.length, firstRow * columns),
        end: Math.min(items.length, (lastRow + 1) * columns),
      });
    }

    updateRange();
    window.addEventListener('scroll', updateRange, { passive: true });
    window.addEventListener('resize', updateRange);
    return () => {
      window.removeEventListener('scroll', updateRange);
      window.removeEventListener('resize', updateRange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, containerWidth]);

  if (items.length < VIRTUALIZE_THRESHOLD) {
    return (
      <div className={className} ref={containerRef}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    );
  }

  const minColWidth = containerWidth < MOBILE_BREAKPOINT ? CARD_MIN_WIDTH_MOBILE : CARD_MIN_WIDTH_DESKTOP;
  const columns = containerWidth > 0 ? Math.max(1, Math.floor((containerWidth + ROW_GAP) / (minColWidth + ROW_GAP))) : 1;
  const rowHeight = ESTIMATED_ROW_HEIGHT + ROW_GAP;
  const rowsBefore = Math.floor(range.start / columns);
  const rowsAfter = Math.ceil((items.length - range.end) / columns);

  return (
    <div className={className} ref={containerRef}>
      {rowsBefore > 0 && <div style={{ gridColumn: '1 / -1', height: rowsBefore * rowHeight }} />}
      {items.slice(range.start, range.end).map((item, i) => renderItem(item, range.start + i))}
      {rowsAfter > 0 && <div style={{ gridColumn: '1 / -1', height: rowsAfter * rowHeight }} />}
    </div>
  );
}
