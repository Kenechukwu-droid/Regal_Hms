import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import FormModal from '../common/FormModal';
import { CLINICIANS } from '../appointments/constants';
import { api } from '../../services/api';
import { FREQUENCIES, allergyConflict, usableStock, validatePrescription } from '../../utils/pharmacy';

const blank = () => ({ itemId: '', dose: '', frequency: 'Twice daily', days: '5', qty: '' });

// A pharmacist's prescription is sent to a surgeon or nurse ('recipients'); a surgeon's or the director's names the prescriber.
export default function RxForm({ patients, meds, initialPatientId = '', by, recipients = null, onSave, onClose }) {
  const toPeople = recipients !== null;
  const [f, setF] = useState({ patientId: initialPatientId, prescriberId: 'bello', sendToId: '', lines: [blank()], notes: '', overrideReason: '' });
  const [profile, setProfile] = useState(null);
  const medOf = (id) => meds.find((m) => m.id === id);
  const setLine = (i, patch) => setF((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  useEffect(() => {
    if (!f.patientId) { setProfile(null); return; }
    let live = true;
    api.getPatient(f.patientId).then((p) => live && setProfile(p));
    return () => { live = false; };
  }, [f.patientId]);

  const allergies = profile?.allergies ?? [];
  const clashes = f.lines.map((l) => (l.itemId ? allergyConflict(medOf(l.itemId), allergies) : null));
  const anyClash = clashes.some(Boolean);
  const errors = validatePrescription(f);
  const blocked = errors.length > 0 || (anyClash && !f.overrideReason.trim()) || (toPeople && !f.sendToId);

  return (
    <FormModal wide title="New prescription" submitLabel={toPeople ? 'Save and send' : 'Save prescription'} canSubmit={!blocked}
      onSubmit={() => onSave({ patientId: f.patientId, prescriberId: toPeople ? null : f.prescriberId, sendToId: toPeople ? f.sendToId : null, lines: f.lines, notes: f.notes, allergyOverride: anyClash ? { reason: f.overrideReason } : null, by })} onClose={onClose}>
      <div className="row2">
        <div className="field"><label htmlFor="rx-p">Patient</label>
          <select id="rx-p" value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })} autoFocus>
            <option value="">Select a patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></div>
        {toPeople ? (
          <div className="field"><label htmlFor="rx-s">Send to</label>
            <select id="rx-s" value={f.sendToId} onChange={(e) => setF({ ...f, sendToId: e.target.value })}>
              <option value="">Choose a surgeon or nurse…</option>
              {recipients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role === 'surgeon' ? 'Surgeon' : 'Nurse'})</option>)}</select>
            <small className="muted">They will see it in Pharmacy and reply with the action taken: approve, record an action, send it back or decline.</small></div>
        ) : (
          <div className="field"><label htmlFor="rx-d">Prescribed by</label>
            <select id="rx-d" value={f.prescriberId} onChange={(e) => setF({ ...f, prescriberId: e.target.value })}>
              {CLINICIANS.filter((c) => c.role === 'Surgeon').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        )}
      </div>
      {profile && (allergies.length > 0
        ? <p className="allergy moderate"><b>Allergies:</b> {allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')}</p>
        : profile.allergiesRecorded === false ? <p className="allergy unknown">Allergies haven’t been recorded for this patient. Ask before prescribing.</p> : null)}

      {f.lines.map((l, i) => {
        const m = medOf(l.itemId);
        return (
          <div className="subcard" key={i}>
            <div className="field"><label htmlFor={`rx-m${i}`}>Medicine {i + 1}</label>
              <select id={`rx-m${i}`} value={l.itemId} onChange={(e) => setLine(i, { itemId: e.target.value })}>
                <option value="">Select…</option>{meds.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              {m && <small className="muted">In stock: {usableStock(m)} {m.unit}s{m.controlled ? ' · controlled medicine' : ''}</small>}
              {clashes[i] && <small className="form-error">Matches the recorded {clashes[i]} allergy.</small>}</div>
            <div className="row4">
              <div className="field"><label htmlFor={`rx-o${i}`}>Dose</label><input id={`rx-o${i}`} value={l.dose} onChange={(e) => setLine(i, { dose: e.target.value })} placeholder="1 tablet" /></div>
              <div className="field"><label htmlFor={`rx-f${i}`}>How often</label>
                <select id={`rx-f${i}`} value={l.frequency} onChange={(e) => setLine(i, { frequency: e.target.value })}>{FREQUENCIES.map((x) => <option key={x}>{x}</option>)}</select></div>
              <div className="field"><label htmlFor={`rx-y${i}`}>Days</label><input id={`rx-y${i}`} inputMode="numeric" value={l.days} onChange={(e) => setLine(i, { days: e.target.value })} /></div>
              <div className="field"><label htmlFor={`rx-q${i}`}>Quantity</label><input id={`rx-q${i}`} inputMode="numeric" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></div>
            </div>
            {f.lines.length > 1 && <button type="button" className="btn small danger-text" onClick={() => setF((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))}><Trash2 size={14} aria-hidden /> Remove medicine</button>}
          </div>);
      })}
      <button type="button" className="btn small" onClick={() => setF((p) => ({ ...p, lines: [...p.lines, blank()] }))}><Plus size={14} aria-hidden /> Add another medicine</button>

      {anyClash && (
        <div className="field" style={{ marginTop: 12 }}><label htmlFor="rx-ov">Allergy override: why is this safe for the patient? (required)</label>
          <textarea id="rx-ov" rows={2} value={f.overrideReason} onChange={(e) => setF({ ...f, overrideReason: e.target.value })} /></div>)}
      <div className="field" style={{ marginTop: 12 }}><label htmlFor="rx-n">{toPeople ? 'Note for the person it is going to (optional)' : 'Notes for the pharmacy (optional)'}</label>
        <textarea id="rx-n" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      {blocked && f.patientId && <p className="muted small-text">{anyClash && !f.overrideReason.trim() ? 'Record the allergy override to continue. ' : ''}{errors[0] || ''}</p>}
    </FormModal>
  );
}
