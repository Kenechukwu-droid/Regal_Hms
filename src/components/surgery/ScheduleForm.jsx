import { useEffect, useState } from 'react';
import FormModal from '../common/FormModal';
import { api } from '../../services/api';
import { THEATRES, TURNOVER, theatreName } from './constants';
import { clinicianName, DAY_START, DAY_END, DURATIONS } from '../appointments/constants';
import { isSunday, minToTime, timeToMin, todayISO } from '../../utils/dates';
import { findSurgeryConflicts, surgeryEnd } from '../../utils/theatre';

const LENGTHS = [...DURATIONS, 150, 180, 240, 300].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

export default function ScheduleForm({ item, plans, initial, onSave, onClose }) {
  const [f, setF] = useState(() => item ? { ...item } : { planId: '', theatreId: 't1', date: todayISO(), start: '09:00', duration: 120, anaesthetist: '', notes: '', ...initial });
  const [day, setDay] = useState([]);
  const plan = item ? null : plans.find((p) => p.id === f.planId);
  const surgeonId = item ? item.surgeonId : plan?.surgeonId;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    let live = true;
    api.getSurgeries({ from: f.date, to: f.date }).then((d) => live && setDay(d)).catch(() => {});
    return () => { live = false; };
  }, [f.date]);

  const pickPlan = (e) => {
    const p = plans.find((x) => x.id === e.target.value);
    setF({ ...f, planId: e.target.value, ...(p ? { duration: p.durationMin, date: p.targetDate && p.targetDate >= todayISO() ? p.targetDate : f.date } : {}) });
  };

  const errors = [];
  const s = timeToMin(f.start || '00:00');
  if (isSunday(f.date)) errors.push('The centre is closed on Sundays.');
  else if (s < DAY_START || s + Number(f.duration) > DAY_END) errors.push('Cases must start after 08:00 and finish by 18:00.');
  if (!item && f.date < todayISO()) errors.push('That date has passed. Choose today or a later date.');
  if (surgeonId) {
    const c = findSurgeryConflicts(day, { ...f, id: item?.id, surgeonId });
    if (c.theatre) errors.push(`${theatreName(c.theatre.theatreId)} is booked ${c.theatre.start} to ${minToTime(surgeryEnd(c.theatre))} for ${c.theatre.patient}. Leave ${TURNOVER} minutes for cleaning between cases.`);
    if (c.surgeon) errors.push(`${clinicianName(surgeonId)} is operating on ${c.surgeon.patient} from ${c.surgeon.start} to ${minToTime(surgeryEnd(c.surgeon))}.`);
  }
  const canSubmit = (item || plan) && f.date && f.start && errors.length === 0;

  const submit = () => onSave(item ? { ...f, duration: Number(f.duration), status: 'Scheduled', reason: '' } : {
    planId: plan.id, patientId: plan.patientId, patient: plan.patient, procedure: plan.procedure, surgeonId: plan.surgeonId,
    anaesthesia: plan.anaesthesia, theatreId: f.theatreId, date: f.date, start: f.start, duration: Number(f.duration), anaesthetist: f.anaesthetist, notes: f.notes,
  });

  return (
    <FormModal title={item ? 'Reschedule surgery' : 'Schedule surgery'} submitLabel={item ? 'Save new time' : 'Schedule surgery'} canSubmit={canSubmit} onSubmit={submit} onClose={onClose}>
      {item ? (
        <p style={{ marginTop: 0 }}><b>{item.procedure}</b> for {item.patient}, {clinicianName(item.surgeonId)}</p>
      ) : (
        <div className="field"><label htmlFor="sc-p">Surgical plan</label>
          <select id="sc-p" value={f.planId} onChange={pickPlan} autoFocus>
            <option value="">{plans.length ? 'Select a ready plan…' : 'No plans are ready to schedule'}</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.patient}: {p.procedure} ({clinicianName(p.surgeonId)})</option>)}
          </select>
        </div>
      )}
      <div className="row2">
        <div className="field"><label htmlFor="sc-t">Theatre</label>
          <select id="sc-t" value={f.theatreId} onChange={set('theatreId')}>{THEATRES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="field"><label htmlFor="sc-d">Date</label><input id="sc-d" type="date" value={f.date} onChange={set('date')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="sc-s">Start</label><input id="sc-s" type="time" step="900" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label htmlFor="sc-l">Length</label>
          <select id="sc-l" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>{LENGTHS.map((d) => <option key={d} value={d}>{d} min</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="sc-a">Anaesthetist (optional)</label><input id="sc-a" value={f.anaesthetist} onChange={set('anaesthetist')} /></div>
      {errors.map((m) => <p key={m} className="form-error" role="alert">{m}</p>)}
    </FormModal>
  );
}
