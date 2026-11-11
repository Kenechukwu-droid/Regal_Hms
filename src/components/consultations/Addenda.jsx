import { useState } from 'react';
import { fmtDateTime } from './constants';

// Completed consultations are locked. Corrections and new findings are appended here with a timestamp.
export default function Addenda({ items, canAdd, onAdd }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async () => {
    setBusy(true); setError('');
    try { await onAdd(text.trim()); setText(''); } catch { setError('Couldn’t add the addendum. Try again.'); }
    setBusy(false);
  };
  return (
    <section className="card">
      <h2>Addenda</h2>
      {items.length === 0 && <p className="muted">None. This consultation is locked; add a dated note below to correct or extend it.</p>}
      <ul className="list">{items.map((a) => (
        <li key={a.id}><div><div className="muted">{fmtDateTime(a.at)} · {a.by}</div><div>{a.text}</div></div></li>))}
      </ul>
      {canAdd && (
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="ad">Add an addendum</label>
          <textarea id="ad" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          {error && <small className="form-error">{error}</small>}
          <div><button className="btn" disabled={!text.trim() || busy} onClick={add}>{busy ? 'Adding…' : 'Add addendum'}</button></div>
        </div>
      )}
    </section>
  );
}
