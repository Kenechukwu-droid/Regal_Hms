import { todayISO } from '../../utils/dates';

export default function ChecklistSection({ f, change, can, actor }) {
  const set = (key, patch) => change({ checklist: f.checklist.map((i) => (i.key === key ? { ...i, ...patch } : i)) });
  const done = (i) => set(i.key, i.state === 'done' ? { state: 'pending', by: '', at: '' } : { state: 'done', by: actor, at: todayISO() });
  const na = (i) => set(i.key, i.state === 'na' ? { state: 'pending', by: '', at: '' } : { state: 'na', by: actor, at: todayISO() });

  return (
    <section className="card">
      <h2>Pre-op checklist</h2>
      <fieldset className="plain" disabled={!can.checklist}>
        <ul className="checklist">
          {f.checklist.map((i) => (
            <li key={i.key}>
              <input type="checkbox" id={`ck-${i.key}`} checked={i.state === 'done'} disabled={i.state === 'na'} onChange={() => done(i)} />
              <div className="grow">
                <label htmlFor={`ck-${i.key}`}>{i.label}{!i.required && <span className="opt">Optional</span>}</label>
                {i.state !== 'pending' && <div className="item-by">{i.state === 'na' ? 'Not applicable' : 'Done'} · {i.by} · {i.at}</div>}
              </div>
              {i.allowNA && <button type="button" className="btn small" onClick={() => na(i)} aria-pressed={i.state === 'na'}>{i.state === 'na' ? 'Undo N/A' : 'N/A'}</button>}
            </li>
          ))}
        </ul>
      </fieldset>
    </section>
  );
}
