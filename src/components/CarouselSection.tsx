import { useRef, useState } from 'react';
import type { PhotoResult } from '../types';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';

export function CarouselSection({ photos }: { photos: PhotoResult[] }) {
  const { dispatch } = useAppState();
  const t = useT();
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const ordered = [...photos].sort((a, b) => (a.carouselPosition ?? 0) - (b.carouselPosition ?? 0));

  function handleDrop(targetIndex: number) {
    if (dragIndexRef.current === null || dragIndexRef.current === targetIndex) return;
    const next = [...ordered];
    const [moved] = next.splice(dragIndexRef.current, 1);
    next.splice(targetIndex, 0, moved);
    dispatch({ type: 'REORDER_CAROUSEL', orderedIds: next.map((p) => p.id) });
  }

  return (
    <div className="carousel-section">
      <div className="section-heading">{t('results.carouselHeading')}</div>
      <p className="config-hint" style={{ marginBottom: 14 }}>
        {t('results.carouselHint')}
      </p>
      <div className="carousel-strip">
        {ordered.map((photo, index) => (
          <div
            key={photo.id}
            className={`carousel-item${dragId === photo.id ? ' dragging' : ''}`}
            draggable
            onDragStart={() => {
              setDragId(photo.id);
              dragIndexRef.current = index;
            }}
            onDragEnd={() => {
              setDragId(null);
              dragIndexRef.current = null;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
          >
            <span className="carousel-position">{index + 1}</span>
            {photo.previewUrl && <img src={photo.previewUrl} alt={photo.name} />}
          </div>
        ))}
      </div>
    </div>
  );
}
