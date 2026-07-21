import { createPortal } from 'react-dom';
import { useT } from '../i18n/useT';
import type { SessionSnapshot } from '../lib/persistence';

export function RestoreSessionDialog({
  snapshot,
  onRestore,
  onDiscard,
}: {
  snapshot: SessionSnapshot;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const t = useT();
  const when = new Date(snapshot.savedAt).toLocaleString();

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true">
        <h3 style={{ marginBottom: 12 }}>{t('restore.title')}</h3>
        <p style={{ color: 'var(--label-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          {t('restore.message', { count: snapshot.files.length, when })}
        </p>
        <div className="actions-row">
          <button type="button" className="btn btn-ghost" onClick={onDiscard}>
            {t('restore.discard')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onRestore}>
            {t('restore.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
