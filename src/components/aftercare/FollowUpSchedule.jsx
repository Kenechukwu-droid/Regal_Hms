import { useState } from 'react';
import { Link } from 'react-router-dom';
import FollowUpForm from './FollowUpForm';
import { clinicianName } from '../appointments/constants';
import { followUpState } from '../../utils/aftercare';

const TONE = { Done: 'ok', Booked: '', Due: 'warn', Overdue: 'bad' };

export default function FollowUpSchedule({ followUps, surgeonId, canBook, onBook }) {
  const [target, setTarget] = useState(null);
  return (
    <section className="card">
      <h2>Follow-up schedule</h2>
      <ul className="steps">
        {followUps.map((f) => {
          const st = followUpState(f);
          const a = f.appointment;
          return (
            <li key={f.key}>
              <div className="grow">
                <b>{f.label}</b> <span className={`badge ${TONE[st]}`}>{st}</span>
                <div className="muted">{a && !['Cancelled', 'No-show'].includes(a.status)
                  ? `${a.date} at ${a.start} · ${clinicianName(a.clinicianId)}` : `Due ${f.dueDate}`}</div>
              </div>
              {(st === 'Due' || st === 'Overdue') && canBook && <button className="btn small" onClick={() => setTarget(f)}>Book</button>}
            </li>
          );
        })}
      </ul>
      <p className="muted small-text" style={{ marginBottom: 0 }}>Booked visits appear in <Link className="plink" to="/appointments">Appointments</Link>. Change or cancel them there.</p>
      {target && <FollowUpForm followUp={target} surgeonId={surgeonId} onSave={(a) => onBook(target.key, a)} onClose={() => setTarget(null)} />}
    </section>
  );
}
