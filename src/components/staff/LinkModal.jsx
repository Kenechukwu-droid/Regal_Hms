import { useState } from 'react';

// In the prototype the link is shown here. The real backend emails it and returns only { email, expiresAt }.
export default function LinkModal({ title, result, onClose }) {
  const link = result.inviteLink || result.resetLink;
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* the field below can be selected by hand */ } };
  const when = new Date(result.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {link ? (
          <>
            <p>Send this link to <b>{result.email}</b>. It works once and expires {when}.</p>
            <div className="field"><label htmlFor="lk">Link</label><input id="lk" readOnly value={link} onFocus={(e) => e.target.select()} /></div>
            <p className="muted small-text">Prototype only: the real system emails the link and never shows it on screen.</p>
          </>
        ) : <p>An email with the link has been sent to <b>{result.email}</b>. It expires {when}.</p>}
        <div className="modal-actions">{link && <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>}<button className="btn primary" onClick={onClose} autoFocus>Done</button></div>
      </div>
    </div>
  );
}
