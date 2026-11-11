import { CLEARANCE_STATUSES } from '../../utils/planning';
import { todayISO } from '../../utils/dates';

export default function ClearanceSection({ f, change, can, actor }) {
  const upd = (key, patch) => change({ clearances: f.clearances.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  const setStatus = (c, status) => upd(c.key, status === 'Pending' ? { status, by: '', date: '' } : { status, by: c.by || actor, date: c.date || todayISO() });

  return (
    <section className="card">
      <h2>Medical clearance</h2>
      <fieldset className="plain" disabled={!can.surgeon}>
        {f.clearances.map((c) => (
          <div className="subcard" key={c.key}>
            <h3>{c.label}{!c.required && <span className="opt">Optional</span>}
              <select aria-label={`${c.label} status`} value={c.status} onChange={(e) => setStatus(c, e.target.value)}>
                {CLEARANCE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </h3>
            {c.status !== 'Pending' && (
              <>
                <div className="row2">
                  <div className="field"><label htmlFor={`${c.key}-cb`}>Decided by</label><input id={`${c.key}-cb`} value={c.by} onChange={(e) => upd(c.key, { by: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`${c.key}-cd`}>Date</label><input id={`${c.key}-cd`} type="date" max={todayISO()} value={c.date} onChange={(e) => upd(c.key, { date: e.target.value })} /></div>
                </div>
                <div className="field"><label htmlFor={`${c.key}-cn`}>{c.status === 'Approved' ? 'Note (optional)' : c.status === 'Declined' ? 'Reason' : 'Conditions'}</label>
                  <textarea id={`${c.key}-cn`} rows={2} value={c.note} onChange={(e) => upd(c.key, { note: e.target.value })} /></div>
              </>
            )}
          </div>
        ))}
      </fieldset>
    </section>
  );
}
