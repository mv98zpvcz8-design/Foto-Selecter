import { useRef, useState, type DragEvent } from 'react';
import { useAppState } from '../state/AppState';
import { SUPPORTED_EXTENSIONS } from '../lib/fileTypes';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadScreen() {
  const { state, dispatch } = useAppState();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    dispatch({ type: 'ADD_FILES', files: Array.from(fileList) });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="dropzone-icon">📁</div>
        <h2>RAW- oder JPEG-Dateien hierher ziehen</h2>
        <p>
          Unterstützt: {SUPPORTED_EXTENSIONS.map((e) => `.${e.toUpperCase()}`).join(', ')} — oder klicken, um
          Dateien auszuwählen. Alles bleibt lokal in deinem Browser.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
          className="file-input-hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {state.rejectedFileNames.length > 0 && (
        <div className="warning-banner">
          {state.rejectedFileNames.length} Datei(en) übersprungen (nicht unterstütztes Format):{' '}
          {state.rejectedFileNames.slice(0, 5).join(', ')}
          {state.rejectedFileNames.length > 5 ? ', …' : ''}
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
                aria-label={`${p.name} entfernen`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="actions-row">
        <span className="summary-line">
          {state.photos.length === 0
            ? 'Noch keine Fotos ausgewählt'
            : `${state.photos.length} Foto(s) bereit`}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          {state.photos.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => dispatch({ type: 'CLEAR_FILES' })}>
              Alle entfernen
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={state.photos.length === 0}
            onClick={() => dispatch({ type: 'GO_TO_CONFIG' })}
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
