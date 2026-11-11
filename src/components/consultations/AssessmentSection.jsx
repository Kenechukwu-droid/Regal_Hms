import { BP_PATTERN, bmi } from './constants';

export default function AssessmentSection({ f, change, bind, can }) {
  const v = (k) => (e) => change({ vitals: { ...f.vitals, [k]: e.target.value } });
  const bpBad = f.vitals.bp && !BP_PATTERN.test(f.vitals.bp);
  return (
    <>
      <section className="card">
        <h2>Vitals and measurements</h2>
        <fieldset className="plain" disabled={!can.assess}>
          <div className="vitals">
            <div className="field"><label htmlFor="v-bp">Blood pressure</label>
              <input id="v-bp" placeholder="120/80" value={f.vitals.bp} onChange={v('bp')} />
              {bpBad && <small className="form-error">Use the form 120/80.</small>}</div>
            <div className="field"><label htmlFor="v-p">Pulse (bpm)</label><input id="v-p" type="number" min="0" value={f.vitals.pulse} onChange={v('pulse')} /></div>
            <div className="field"><label htmlFor="v-t">Temp (°C)</label><input id="v-t" type="number" step="0.1" value={f.vitals.temp} onChange={v('temp')} /></div>
            <div className="field"><label htmlFor="v-w">Weight (kg)</label><input id="v-w" type="number" step="0.1" value={f.vitals.weight} onChange={v('weight')} /></div>
            <div className="field"><label htmlFor="v-h">Height (cm)</label><input id="v-h" type="number" value={f.vitals.height} onChange={v('height')} /></div>
            <div className="field"><label>BMI</label><output className="bmi">{bmi(f.vitals.height, f.vitals.weight) || '—'}</output></div>
          </div>
        </fieldset>
      </section>

      <section className="card">
        <h2>Assessment</h2>
        <fieldset className="plain" disabled={!can.assess}>
          <div className="field"><label htmlFor="a-c">Chief complaint</label>
            <textarea id="a-c" rows={2} {...bind('chiefComplaint')} placeholder="What the patient wants, in their words" /></div>
          <div className="field"><label htmlFor="a-h">History of presenting complaint</label>
            <textarea id="a-h" rows={3} {...bind('history')} placeholder="Duration, previous treatment, expectations" /></div>
        </fieldset>
        <fieldset className="plain" disabled={!can.clinical}>
          <div className="field"><label htmlFor="a-e">Examination findings</label>
            <textarea id="a-e" rows={3} {...bind('examination')} /></div>
        </fieldset>
      </section>
    </>
  );
}
