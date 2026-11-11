import { CONSENT_STATUSES } from '../../utils/planning';
import { clinicianName } from '../appointments/constants';
import { todayISO } from '../../utils/dates';

export default function ConsentSection({ f, change, can }) {
  const upd = (key, patch) => change({ consents: f.consents.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  const setStatus = (c, status) => upd(c.key, status === 'Obtained'
    ? { status, by: c.by || clinicianName(f.surgeonId), date: c.date || todayISO() } : { status });

  return (
    <section className="card">
      <h2>Consent</h2>
      <p className="muted" style={{ marginTop: 0 }}>Record consent only after risks, outcomes and alternatives have been explained to the patient.</p>
      <fieldset className="plain" disabled={!can.surgeon}>
        {f.consents.map((c) => (
          <div className="subcard" key={c.key}>
            <h3>{c.label}
              <select aria-label={`${c.label} status`} value={c.status} onChange={(e) => setStatus(c, e.target.value)}>
                {CONSENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </h3>
            {c.status === 'Obtained' && (
              <>
                <div className="row3 even">
                  <div className="field"><label htmlFor={`${c.key}-by`}>Obtained by</label><input id={`${c.key}-by`} value={c.by} onChange={(e) => upd(c.key, { by: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`${c.key}-d`}>Date</label><input id={`${c.key}-d`} type="date" max={todayISO()} value={c.date} onChange={(e) => upd(c.key, { date: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`${c.key}-w`}>Witness</label><input id={`${c.key}-w`} value={c.witness} onChange={(e) => upd(c.key, { witness: e.target.value })} /></div>
                </div>
                <label className="check"><input type="checkbox" checked={c.filed} onChange={(e) => upd(c.key, { filed: e.target.checked })} /> Signed form filed in the patient’s folder</label>
              </>
            )}
            {(c.status === 'Withdrawn' || c.note) && (
              <div className="field" style={{ marginTop: 10 }}><label htmlFor={`${c.key}-n`}>Note</label>
                <textarea id={`${c.key}-n`} rows={2} value={c.note} onChange={(e) => upd(c.key, { note: e.target.value })} placeholder={c.status === 'Withdrawn' ? 'Why consent was withdrawn' : ''} /></div>
            )}
          </div>
        ))}
      </fieldset>
    </section>
  );
}
