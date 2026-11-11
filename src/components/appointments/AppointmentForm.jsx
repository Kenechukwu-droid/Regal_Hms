import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import { CONSULT_TYPES } from '../consultations/constants';
import FormModal from '../common/FormModal';
import { api } from '../../services/api';
import { CLINICIANS, TYPES, STATUSES, DURATIONS, DAY_START, DAY_END, clinicianName } from './constants';
import { isSunday, minToTime, timeToMin, todayISO } from '../../utils/dates';
import { blocks, endMin, findConflict } from '../../utils/scheduling';

export default function AppointmentForm({ item, initial, patients, onSave, onClose }) {
  const [f, setF] = useState(() => item ? { ...item } : {
    patientId: '', patient: '', type: 'Consultation', clinicianId: 'bello', date: todayISO(),
    start: '09:00', duration: TYPES.Consultation, status: 'Confirmed', notes: '', ...initial,
  });
  const [dayAppts, setDayAppts] = useState([]);
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const nav = useNavigate();
  const { role } = useRole();
  const [consult, setConsult] = useState(undefined); // undefined = checking, null = none yet

  useEffect(() => {
    if (!item) return;
    let live = true;
    api.getConsultationByAppointment(item.id).then((c) => live && setConsult(c)).catch(() => live && setConsult(null));
    return () => { live = false; };
  }, [item]);

  const canConsult = item && consult !== undefined && CONSULT_TYPES.includes(item.type) && blocks(item)
    && ['director', 'surgeon', 'nurse'].includes(role);
  const consultLabel = !consult ? 'Start consultation' : consult.status === 'Draft' ? 'Continue consultation' : 'View consultation';
  const openConsult = async () => {
    const c = consult || await api.startConsultation(item.id);
    onClose();
    nav(`/consultations/${c.id}`);
  };

  // Check against whatever is already booked on the chosen date, even if it is outside the visible week.
  useEffect(() => {
    let live = true;
    api.getAppointments({ from: f.date, to: f.date }).then((d) => live && setDayAppts(d)).catch(() => {});
    return () => { live = false; };
  }, [f.date]);

  const pickPatient = (e) => {
    const p = patients.find((x) => x.id === e.target.value);
    setF({ ...f, patientId: e.target.value, patient: p ? p.name : '' });
  };
  const pickType = (e) => setF({ ...f, type: e.target.value, ...(item ? {} : { duration: TYPES[e.target.value] }) });

  const errors = [];
  const s = timeToMin(f.start || '00:00');
  if (isSunday(f.date)) errors.push('The centre is closed on Sundays.');
  else if (s < DAY_START || s + Number(f.duration) > DAY_END) errors.push('Appointments run 08:00 to 18:00. Choose a time that finishes by 18:00.');
  if (!item && f.date < todayISO()) errors.push('That date has passed. Choose today or a later date.');
  const conflict = blocks(f) && findConflict(dayAppts, f);
  if (conflict) errors.push(`${clinicianName(f.clinicianId)} already has ${conflict.patient} from ${conflict.start} to ${minToTime(endMin(conflict))}. Pick another time or clinician.`);

  const canSubmit = f.patientId && f.date && f.start && errors.length === 0;
  const cancelable = item && item.status !== 'Cancelled';

  return (
    <FormModal title={item ? 'Appointment details' : 'Book appointment'} submitLabel={item ? 'Save changes' : 'Book appointment'}
      canSubmit={canSubmit} onSubmit={() => onSave(f)} onClose={onClose}
      onDelete={cancelable ? () => onSave({ ...f, status: 'Cancelled' }) : undefined}
      deleteLabel="Cancel appointment" confirmText="Cancel this appointment? The slot will be freed for someone else."
      confirmYes="Yes, cancel it" confirmNo="Keep it">
      <div className="field"><label htmlFor="ap-p">Patient</label>
        <select id="ap-p" value={f.patientId} onChange={pickPatient} disabled={!!item} autoFocus={!item}>
          <option value="">Select a patient…</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
        </select>
        {item && <Link className="plink" to={`/patients/${f.patientId}`}>View patient profile</Link>}
      </div>
      {canConsult && <button type="button" className="btn primary" style={{ marginBottom: 12 }} onClick={openConsult}>{consultLabel}</button>}
      <div className="row2">
        <div className="field"><label htmlFor="ap-t">Type</label>
          <select id="ap-t" value={f.type} onChange={pickType}>{Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="ap-c">With</label>
          <select id="ap-c" value={f.clinicianId} onChange={set('clinicianId')}>{CLINICIANS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div className="row3">
        <div className="field"><label htmlFor="ap-d">Date</label><input id="ap-d" type="date" value={f.date} onChange={set('date')} /></div>
        <div className="field"><label htmlFor="ap-s">Start</label><input id="ap-s" type="time" step="900" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label htmlFor="ap-l">Length</label>
          <select id="ap-l" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>{DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}</select></div>
      </div>
      {item && (
        <div className="field"><label htmlFor="ap-st">Status</label>
          <select id="ap-st" value={f.status} onChange={set('status')}>{STATUSES.map((s2) => <option key={s2}>{s2}</option>)}</select></div>
      )}
      <div className="field"><label htmlFor="ap-n">Notes (optional)</label>
        <textarea id="ap-n" rows={2} value={f.notes} onChange={set('notes')} placeholder="Reason for visit, access needs…" /></div>
      {errors.map((m) => <p key={m} className="form-error" role="alert">{m}</p>)}
    </FormModal>
  );
}
