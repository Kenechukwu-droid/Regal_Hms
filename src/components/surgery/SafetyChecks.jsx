import { Check } from 'lucide-react';
import { SAFETY_STEPS, fmtTime } from './constants';

// Each step can only be confirmed in order, and once confirmed it stays on the record.
export default function SafetyChecks({ surgery, canConfirm, onConfirm, busy }) {
  const inTheatre = surgery.status === 'In theatre';
  return (
    <section className="card">
      <h2>Surgical safety checks</h2>
      <ul className="steps">
        {SAFETY_STEPS.map((st, i) => {
          const rec = surgery.safety[st.key];
          const prevDone = i === 0 || surgery.safety[SAFETY_STEPS[i - 1].key];
          return (
            <li key={st.key} className={rec ? 'done' : ''}>
              <span className="tick" aria-hidden>{rec ? <Check size={14} /> : i + 1}</span>
              <div className="grow">
                <b>{st.label}</b> <span className="muted">· {st.when}</span>
                <div className="muted">{st.text}</div>
                {rec && <div className="item-by">Confirmed by {rec.by} at {fmtTime(rec.at)}</div>}
              </div>
              {!rec && canConfirm && (
                <button className="btn small" disabled={!inTheatre || !prevDone || busy} onClick={() => onConfirm(st.key)}
                  title={!inTheatre ? 'Available once the patient is in theatre' : !prevDone ? 'Complete the previous step first' : ''}>Confirm</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
