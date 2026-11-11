import { useEffect, useState } from 'react';

// Shared modal for add/edit forms. Handles Escape, saving state, errors and a two-step delete.
export default function FormModal({ title, submitLabel, onSubmit, onClose, onDelete, deleteLabel = 'Remove', confirmText = 'Remove this entry from the patient’s record?', confirmYes = 'Yes, remove', confirmNo = 'Keep', canSubmit = true, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); onClose(); }
    catch { setError('Couldn’t save. Check the connection and try again.'); setBusy(false); }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); run(onSubmit); }}>
        <h2>{title}</h2>
        {children}
        {error && <p className="form-error" role="alert">{error}</p>}
        {confirming ? (
          <div className="confirm-row">
            <span>{confirmText}</span>
            <button type="button" className="btn" onClick={() => setConfirming(false)} disabled={busy}>{confirmNo}</button>
            <button type="button" className="btn danger" onClick={() => run(onDelete)} disabled={busy}>{confirmYes}</button>
          </div>
        ) : (
          <div className="modal-actions">
            {onDelete && <button type="button" className="btn danger-text" onClick={() => setConfirming(true)}>{deleteLabel}</button>}
            <span className="grow" />
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!canSubmit || busy}>{busy ? 'Saving…' : submitLabel}</button>
          </div>
        )}
      </form>
    </div>
  );
}
