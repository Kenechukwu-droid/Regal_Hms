import { useState } from 'react';

const empty = { name: '', age: '', phone: '', procedure: '', surgeon: 'Dr. Bello' };

export default function PatientForm({ onSave, onClose }) {
  const [f, setF] = useState(empty);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && f.phone.trim();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Register patient" onClick={(e) => e.stopPropagation()}>
        <h2>Register patient</h2>
        <div className="field"><label htmlFor="n">Full name</label><input id="n" value={f.name} onChange={set('name')} autoFocus /></div>
        <div className="field"><label htmlFor="a">Age</label><input id="a" type="number" value={f.age} onChange={set('age')} /></div>
        <div className="field"><label htmlFor="p">Phone</label><input id="p" value={f.phone} onChange={set('phone')} /></div>
        <div className="field"><label htmlFor="pr">Procedure of interest</label><input id="pr" value={f.procedure} onChange={set('procedure')} /></div>
        <div className="field"><label htmlFor="s">Surgeon</label>
          <select id="s" value={f.surgeon} onChange={set('surgeon')}><option>Dr. Bello</option><option>Dr. Amadi</option></select>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!valid} onClick={() => onSave(f)}>Register patient</button>
        </div>
      </div>
    </div>
  );
}
