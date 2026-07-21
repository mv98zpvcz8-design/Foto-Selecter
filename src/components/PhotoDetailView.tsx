import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PhotoResult } from '../types';
import { useT } from '../i18n/useT';
import { getScoreNotes } from '../lib/scoreNotes';
import { classifyReasoning } from '../lib/reasoning';
import { formatReasoning, formatSuggestionNote } from '../i18n/format';

const SWIPE_THRESHOLD_PX = 50;
const MAX_ZOOM = 4;
const DOUBLE_CLICK_ZOOM = 2.5;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(1, z));
}

function touchDistance(a: React.Touch, b: React.Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Full-detail lightbox: large preview plus every piece of information the
 * app has about a photo in one place (score breakdown with exact
 * weights, reasoning, Lightroom suggestions, excellence/potential notes).
 * Navigable across the given photo list via arrow keys, touch swipes, or
 * the on-screen prev/next buttons. The image itself can be zoomed
 * (mouse wheel, pinch, or double-click) and panned independently of the
 * page/browser zoom.
 */
export function PhotoDetailView({
  photos,
  initialIndex,
  onClose,
}: {
  photos: PhotoResult[];
  initialIndex: number;
  onClose: () => void;
}) {
  const t = useT();
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  const singleTouchStart = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);
  const touchPanStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const mousePanStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const photo = photos[index];

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function goPrev() {
    resetZoom();
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }
  function goNext() {
    resetZoom();
    setIndex((i) => (i + 1) % photos.length);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, onClose]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => {
      const next = clampZoom(z + delta);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function handleImageDoubleClick() {
    setZoom((z) => {
      const next = z > 1 ? 1 : DOUBLE_CLICK_ZOOM;
      setPan({ x: 0, y: 0 });
      return next;
    });
  }

  // --- mouse panning when zoomed ---
  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    mousePanStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!mousePanStart.current) return;
    const dx = e.clientX - mousePanStart.current.x;
    const dy = e.clientY - mousePanStart.current.y;
    setPan({ x: mousePanStart.current.panX + dx, y: mousePanStart.current.panY + dy });
  }
  function handleMouseUp() {
    mousePanStart.current = null;
  }

  // --- touch: single-finger swipe-to-navigate (at zoom 1) or pan (when zoomed), two-finger pinch-to-zoom ---
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDist.current = touchDistance(e.touches[0], e.touches[1]);
      pinchStartZoom.current = zoom;
      setIsGesturing(true);
    } else if (e.touches.length === 1) {
      if (zoom > 1) {
        touchPanStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
      } else {
        singleTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDist.current) {
      e.preventDefault();
      const ratio = touchDistance(e.touches[0], e.touches[1]) / pinchStartDist.current;
      setZoom(clampZoom(pinchStartZoom.current * ratio));
    } else if (e.touches.length === 1 && touchPanStart.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchPanStart.current.x;
      const dy = e.touches[0].clientY - touchPanStart.current.y;
      setPan({ x: touchPanStart.current.panX + dx, y: touchPanStart.current.panY + dy });
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (singleTouchStart.current && zoom <= 1) {
      const delta = e.changedTouches[0].clientX - singleTouchStart.current.x;
      if (delta > SWIPE_THRESHOLD_PX) goPrev();
      else if (delta < -SWIPE_THRESHOLD_PX) goNext();
    }
    singleTouchStart.current = null;
    touchPanStart.current = null;
    pinchStartDist.current = null;
    setIsGesturing(false);
    if (zoom <= 1.02) resetZoom();
  }

  if (!photo) return null;

  const weights = photo.appliedWeights;
  const notes = getScoreNotes(photo);
  const reasoningText = formatReasoning(classifyReasoning(photo), t);

  const rows = weights
    ? [
        { key: 'sharpness', label: t('breakdown.sharpness'), score: photo.sharpnessScore ?? 0, weight: weights.sharpness },
        { key: 'exposure', label: t('breakdown.exposure'), score: photo.exposureScore ?? 0, weight: weights.exposure },
        { key: 'group', label: t('breakdown.group'), score: photo.groupBonusScore ?? 0, weight: weights.group },
        { key: 'faces', label: t('breakdown.faces'), score: photo.faceScore ?? 100, weight: weights.faces },
      ]
    : [];

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="detail-close" onClick={onClose} aria-label={t('breakdown.close')}>
          ✕
        </button>

        <div
          className="detail-image"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {photos.length > 1 && (
            <button type="button" className="detail-nav detail-nav-prev" onClick={goPrev} aria-label={t('detail.prev')}>
              ‹
            </button>
          )}
          {photo.previewUrl && (
            <img
              src={photo.previewUrl}
              alt={photo.name}
              onDoubleClick={handleImageDoubleClick}
              onMouseDown={handleMouseDown}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? 'grab' : 'zoom-in',
                transition: isGesturing || mousePanStart.current ? 'none' : 'transform 0.15s ease-out',
              }}
            />
          )}
          {photos.length > 1 && (
            <button type="button" className="detail-nav detail-nav-next" onClick={goNext} aria-label={t('detail.next')}>
              ›
            </button>
          )}
          {photos.length > 1 && (
            <span className="detail-position">
              {index + 1} / {photos.length}
            </span>
          )}
        </div>

        <div className="detail-body">
          <h3 className="detail-name">{photo.name}</h3>
          <p className="detail-reasoning">{reasoningText}</p>

          <div className="breakdown-total">
            <span>{t('breakdown.total')}</span>
            <span className="breakdown-total-value">{photo.overallScore ?? 0}</span>
          </div>

          <table className="breakdown-table">
            <thead>
              <tr>
                <th></th>
                <th>{t('breakdown.rawScore')}</th>
                <th>{t('breakdown.weight')}</th>
                <th>{t('breakdown.contribution')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.score}</td>
                  <td>{row.weight.toFixed(2)}</td>
                  <td>{Math.round(row.score * row.weight)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(photo.facesDetected ?? 0) === 0 && <p className="breakdown-hint">{t('breakdown.noFaces')}</p>}

          {notes.length > 0 && (
            <div className="breakdown-notes">
              {notes.map((note, i) => (
                <p key={i}>{t(note.key, note.vars)}</p>
              ))}
            </div>
          )}

          {photo.lightroomSuggestions && photo.lightroomSuggestions.length > 0 && (
            <div className="lr-suggestions">
              <div className="lr-suggestions-heading">{t('photo.lightroomHeading')}</div>
              <ul>
                {photo.lightroomSuggestions.map((s, idx) => (
                  <li key={idx}>
                    <span className="lr-slider">{s.slider}</span>
                    <span className="lr-note">{formatSuggestionNote(s, t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
