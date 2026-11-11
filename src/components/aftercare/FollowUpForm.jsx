import { useEffect, useState } from 'react';
import FormModal from '../common/FormModal';
import { api } from '../../services/api';
import { CLINICIANS, DAY_END, DAY_START, clinicianName } from '../appointments/constants';
import { isSunday, minToTime, timeToMin, todayISO } from '../../utils/dates';
import { endMin, findConflict } from '../../utils/scheduling';

// Books a real appointment for one follow-up, using the same clash rules as the Appointments calendar.
export default function FollowUpForm({ followUp, surgeonId, onSave, onClose }) {
  const today = todayISO();
  const [f, setF] = useState({
    clinicianId: followUp.type === 'Wound review' ? 'joy' : surgeonId,
    date: followUp.dueDate < today ? today : followUp.dueDate, start: '09:00', duration: followUp.type === 'Wound review' ? 15 : 30,
  });
  const [day, setDay] = useState([]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  useEffect(() => {
    let live = true;
    api.getAppointments({ from: f.date, to: f.date }).then((d) => live && setDay(d)).catch(() => {});
    return () => { live = false; };
  }, [f.date]);

  const errors = [];
  const s = timeToMin(f.start || '00:00');
  if (f.date < today) errors.push('That date has passed. Choose today or a later date.');
  else if (isSunday(f.date)) errors.push('The centre is closed on Sundays.');
  else if (s < DAY_START || s + Number(f.duration) > DAY_END) errors.push('Appointments run 08:00 to 18:00.');
  const c = findConflict(day, { ...f, status: 'Confirmed' });
  if (c) errors.push(`${clinicianName(f.clinicianId)} already has ${c.patient} from ${c.start} to ${minToTime(endMin(c))}.`);

  return (
    <FormModal title={`Book: ${followUp.label}`} submitLabel="Book appointment" canSubmit={errors.length === 0 && !!f.date && !!f.start} onSubmit={() => onSave(f)} onClose={onClose}>
      <p style={{ marginTop: 0 }} className="muted">{followUp.type}, due {followUp.dueDate}</p>
      <div className="row2">
        <div className="field"><label htmlFor="fu-c">With</label>
          <select id="fu-c" value={f.clinicianId} onChange={set('clinicianId')}>{CLINICIANS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div className="field"><label htmlFor="fu-d">Date</label><input id="fu-d" type="date" value={f.date} onChange={set('date')} autoFocus /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="fu-s">Start</label><input id="fu-s" type="time" step="900" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label htmlFor="fu-l">Length</label>
          <select id="fu-l" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>{[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d} min</option>)}</select></div>
      </div>
      {errors.map((m) => <p key={m} className="form-error" role="alert">{m}</p>)}
    </FormModal>
  );
}
