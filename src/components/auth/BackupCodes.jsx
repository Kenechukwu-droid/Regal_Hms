import { useState } from 'react';

// Shown once. Each code works one time if the phone is lost. Nothing to tick: copy them or move on.
export default function BackupCodes({ codes, onContinue }) {
  const [copied, setCopied] = useState(false);
  const text = `Regal HMS backup codes\n${codes.join('\n')}\nEach code works once.`;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* they can still write the codes down */ } };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'regal-hms-backup-codes.txt' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  return (
    <>
      <p style={{ marginTop: 0 }}>You’re set up. If you ever lose your phone, any one of these codes lets you in once. <b>This is the only time they’re shown.</b></p>
      <ul className="codes">{codes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
      <div className="actions"><button type="button" className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button><button type="button" className="btn small" onClick={download}>Download</button></div>
      <button className="btn primary wide-btn" onClick={onContinue}>Continue to the HMS</button>
    </>
  );
}
