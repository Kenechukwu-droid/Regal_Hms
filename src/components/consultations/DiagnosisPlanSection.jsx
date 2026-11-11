import { CANDIDACY, INVESTIGATIONS, NEXT_STEPS, PROCEDURES } from './constants';

export default function DiagnosisPlanSection({ f, change, bind, can }) {
  const toggle = (name) => change({
    investigations: f.investigations.includes(name) ? f.investigations.filter((i) => i !== name) : [...f.investigations, name],
  });
  return (
    <>
      <section className="card">
        <h2>Diagnosis and recommendation</h2>
        <fieldset className="plain" disabled={!can.clinical}>
          <div className="field"><label htmlFor="d-d">Diagnosis</label><input id="d-d" {...bind('diagnosis')} placeholder="For example: mild breast hypoplasia" /></div>
          <div className="row2">
            <div className="field"><label htmlFor="d-p">Recommended procedure</label>
              <select id="d-p" {...bind('procedure')}><option value="">None / not applicable</option>{PROCEDURES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="field"><label htmlFor="d-c">Suitability for surgery</label>
              <select id="d-c" {...bind('candidacy')}><option value="">Select…</option>{CANDIDACY.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
        </fieldset>
      </section>

      <section className="card">
        <h2>Plan</h2>
        <fieldset className="plain" disabled={!can.clinical}>
          <div className="field"><label>Investigations requested</label>
            <div className="checks">
              {INVESTIGATIONS.map((i) => (
                <label key={i} className="check"><input type="checkbox" checked={f.investigations.includes(i)} onChange={() => toggle(i)} /> {i}</label>
              ))}
            </div>
          </div>
          <div className="field"><label htmlFor="p-n">Next step</label>
            <select id="p-n" {...bind('nextStep')}><option value="">Select…</option>{NEXT_STEPS.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div className="field"><label htmlFor="p-c">Counselling given</label>
            <textarea id="p-c" rows={3} {...bind('counselling')} placeholder="Risks, realistic outcomes, alternatives and recovery discussed" /></div>
        </fieldset>
      </section>

      <section className="card">
        <h2>Surgeon’s notes</h2>
        <p className="muted" style={{ marginTop: 0 }}>Visible to clinical staff only.</p>
        <fieldset className="plain" disabled={!can.clinical}>
          <div className="field"><textarea aria-label="Surgeon’s notes" rows={3} {...bind('surgeonNotes')} /></div>
        </fieldset>
      </section>
    </>
  );
}
