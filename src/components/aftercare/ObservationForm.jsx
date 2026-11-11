import { useState } from 'react';
import FormModal from '../common/FormModal';
import { WOUND_STATES } from './constants';
import { getFlags, validateObservation } from '../../utils/aftercare';

export default function ObservationForm({ onSave, onClose }) {
  const [f, setF] = useState({ bp: '', pulse: '', temp: '', pain: '', wound: '', notes: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const errors = validateObservation(f);
  const flags = errors.length === 0 ? getFlags(f) : [];
  return (
    <FormModal title="Record observation" submitLabel="Save observation" canSubmit={errors.length === 0} onSubmit={() => onSave(f)} onClose={onClose}>
      <div className="row3 even">
        <div className="field"><label htmlFor="ob-bp">Blood pressure</label><input id="ob-bp" placeholder="120/80" value={f.bp} onChange={set('bp')} autoFocus /></div>
        <div className="field"><label htmlFor="ob-p">Pulse (bpm)</label><input id="ob-p" inputMode="numeric" value={f.pulse} onChange={set('pulse')} /></div>
        <div className="field"><label htmlFor="ob-t">Temperature (°C)</label><input id="ob-t" inputMode="decimal" value={f.temp} onChange={set('temp')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="ob-pain">Pain score (0 to 10)</label>
          <select id="ob-pain" value={f.pain} onChange={set('pain')}><option value="">Select…</option>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select></div>
        <div className="field"><label htmlFor="ob-w">Wound</label>
          <select id="ob-w" value={f.wound} onChange={set('wound')}><option value="">Select…</option>{WOUND_STATES.map((w) => <option key={w.value}>{w.value}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="ob-n">Notes (optional)</label><textarea id="ob-n" rows={2} value={f.notes} onChange={set('notes')} /></div>
      {f.pain !== '' && f.wound && errors.length > 0 && errors.map((m) => <p key={m} className="form-error" role="alert">{m}</p>)}
      {flags.length > 0 && (
        <div className="allergy severe" role="status">
          <div><b>This reading will be flagged for clinician review:</b>
            <ul className="blockers dark">{flags.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
      )}
    </FormModal>
  );
}
