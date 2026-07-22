import { useEffect, useRef, useState } from 'react';
import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { recordSignal } from '../lib/preferenceLearning';
import { PhotoDetailView } from './PhotoDetailView';

const DRAG_THRESHOLD_PX = 6;

/**
 * Pointer-events-based reordering (not native HTML5 drag-and-drop, which
 * is unreliable across trackpads/touch and doesn't fire on mobile at
 * all): works uniformly for mouse and touch, and cleanly tells a tap
 * (open the photo large) apart from a drag (reorder) by how far the
 * pointer actually moved before release.
 */
export function CarouselSection({ photos }: { photos: PhotoResult[] }) {
  const { dispatch } = useAppState();
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState(() => [...photos].sort((a, b) => (a.carouselPosition ?? 0) - (b.carouselPosition ?? 0)));
  useEffect(() => {
    setOrder([...photos].sort((a, b) => (a.carouselPosition ?? 0) - (b.carouselPosition ?? 0)));
  }, [photos]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; dragging: boolean } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, id: string) {
    dragState.current = { id, startX: e.clientX, startY: e.clientY, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const ds = dragState.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;

    if (!ds.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      ds.dragging = true;
      setDraggingId(ds.id);
    }

    const items = containerRef.current?.querySelectorAll<HTMLElement>('.carousel-item');
    if (!items) return;
    const currentIndex = order.findIndex((p) => p.id === ds.id);
    let targetIndex = currentIndex;
    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (e.clientX > rect.left + rect.width / 2) targetIndex = i;
    });

    if (targetIndex !== currentIndex) {
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    }
  }

  function handlePointerUp(index: number) {
    const ds = dragState.current;
    dragState.current = null;
    setDraggingId(null);
    if (ds?.dragging) {
      dispatch({ type: 'REORDER_CAROUSEL', orderedIds: order.map((p) => p.id) });
      // the carousel is instagram-only, and the cover position is the
      // strongest "which photo do you consider your best" signal here
      if (order[0]) void recordSignal('instagram', order[0], 'carouselUsed');
    } else {
      setOpenIndex(index);
    }
  }

  function handlePointerCancel() {
    dragState.current = null;
    setDraggingId(null);
  }

  return (
    <div className="carousel-section">
      <div className="section-heading">{t('results.carouselHeading')}</div>
      <p className="config-hint" style={{ marginBottom: 14 }}>
        {t('results.carouselHint')}
      </p>
      <div className="carousel-strip" ref={containerRef}>
        {order.map((photo, index) => (
          <div
            key={photo.id}
            className={`carousel-item${draggingId === photo.id ? ' dragging' : ''}`}
            onPointerDown={(e) => handlePointerDown(e, photo.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={() => handlePointerUp(index)}
            onPointerCancel={handlePointerCancel}
          >
            <span className="carousel-position">{index + 1}</span>
            {(photo.thumbnailUrl ?? photo.previewUrl) && (
              <img src={photo.thumbnailUrl ?? photo.previewUrl} alt={photo.name} draggable={false} />
            )}
          </div>
        ))}
      </div>

      {openIndex != null && <PhotoDetailView photos={order} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />}
    </div>
  );
}
