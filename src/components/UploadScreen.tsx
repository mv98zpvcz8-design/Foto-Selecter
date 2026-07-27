import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useAppState } from '../state/AppState';
import { useT } from '../i18n/useT';
import { SUPPORTED_EXTENSIONS } from '../lib/fileTypes';
import { clearAnalysisCache } from '../lib/analysisCache';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadScreen() {
  const { state, dispatch } = useAppState();
  const t = useT();
  const [dragging, setDragging] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Not a standard HTML attribute React/TS knows about — set imperatively so
  // this input picks a whole folder's contents in one go. Meant for a
  // Lightroom Mobile export destination folder (e.g. "On My iPad/Lightroom"),
  // so re-exporting an album and re-selecting the same folder is a 2-step
  // refresh instead of re-picking every photo individually.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  function handleClearAnalysisCache() {
    clearAnalysisCache().then(() => setCacheCleared(true));
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    dispatch({ type: 'ADD_FILES', files: Array.from(fileList) });
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current += 1;
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragging(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    // required so the browser allows dropping here at all
    e.preventDefault();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="dropzone-icon">📁</div>
        <h2>{t('upload.title')}</h2>
        <p>{t('upload.subtitle', { formats: SUPPORTED_EXTENSIONS.map((e) => `.${e.toUpperCase()}`).join(', ') })}</p>
        <p className="dropzone-hint">{t('upload.iPadHint')}</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            folderInputRef.current?.click();
          }}
        >
          {t('upload.selectFolder')}
        </button>
        <p className="dropzone-hint">{t('upload.selectFolderHint')}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          className="file-input-hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="file-input-hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {state.rejectedFileNames.length > 0 && (
        <div className="warning-banner">
          {t('upload.rejected', {
            count: state.rejectedFileNames.length,
            names:
              state.rejectedFileNames.slice(0, 5).join(', ') + (state.rejectedFileNames.length > 5 ? ', …' : ''),
          })}
        </div>
      )}

      {state.photos.length > 0 && (
        <div className="file-list">
          {state.photos.map((p) => (
            <div className="file-row" key={p.id}>
              <span className="name">{p.name}</span>
              <span className="size">{formatSize(p.file.size)}</span>
              <button
                type="button"
                className="file-remove"
                onClick={() => dispatch({ type: 'REMOVE_FILE', id: p.id })}
                aria-label={t('upload.removeAria', { name: p.name })}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="actions-row">
        <span className="summary-line">
          {state.photos.length === 0 ? t('upload.noneSelected') : t('upload.readyCount', { count: state.photos.length })}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          {state.photos.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'CLEAR_FILES' })}>
              {t('upload.clearAll')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={state.photos.length === 0}
            onClick={() => dispatch({ type: 'GO_TO_STEP', step: 'config' })}
          >
            {t('upload.next')}
          </button>
        </div>
      </div>

      <div className="upload-cache-row">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleClearAnalysisCache}
          title={t('upload.clearAnalysisCacheHint')}
        >
          {t('upload.clearAnalysisCache')}
        </button>
        {cacheCleared && <span className="cache-cleared-note">{t('upload.analysisCacheCleared')}</span>}
      </div>
    </div>
  );
}
