import { PROCEDURES } from '../consultations/constants';
import { ADMISSIONS, ANAESTHESIA } from '../../utils/planning';
import { isSunday, todayISO } from '../../utils/dates';

export default function ProcedureSection({ f, change, bind, can }) {
  const dateIssue = !f.targetDate ? '' : isSunday(f.targetDate) ? 'The centre is closed on Sundays.' : f.targetDate < todayISO() ? 'This date has passed.' : '';
  return (
    <section className="card">
      <h2>Procedure</h2>
      <fieldset className="plain" disabled={!can.surgeon}>
        <div className="row2">
          <div className="field"><label htmlFor="pr-p">Procedure</label>
            <select id="pr-p" {...bind('procedure')}><option value="">Select…</option>{PROCEDURES.map((p) => <option key={p}>{p}</option>)}</select></div>
          <div className="field"><label htmlFor="pr-t">Target date</label>
            <input id="pr-t" type="date" {...bind('targetDate')} />{dateIssue && <small className="form-error">{dateIssue}</small>}</div>
        </div>
        <div className="row3 even">
          <div className="field"><label htmlFor="pr-a">Anaesthesia</label>
            <select id="pr-a" {...bind('anaesthesia')}><option value="">Select…</option>{ANAESTHESIA.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field"><label htmlFor="pr-ad">Admission</label>
            <select id="pr-ad" {...bind('admission')}>{ADMISSIONS.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field"><label htmlFor="pr-d">Estimated length (min)</label>
            <input id="pr-d" type="number" min="15" step="15" {...bind('durationMin')} /></div>
        </div>
        <div className="field"><label htmlFor="pr-e">Implants and special equipment</label>
          <textarea id="pr-e" rows={2} {...bind('equipmentNotes')} placeholder="Implant type and size, instruments to reserve" /></div>
      </fieldset>
    </section>
  );
}
