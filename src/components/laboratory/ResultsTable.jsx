import { TESTS, fieldFlag, refText } from '../../utils/laboratory';

const TONE = { Low: 'warn', High: 'warn', Abnormal: 'bad', Normal: 'ok' };

// Shows the fields for one test. `onChange` is omitted when the results are read-only.
export default function ResultsTable({ req, results, onChange }) {
  const fields = TESTS[req.test].fields;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Measure</th><th>Result</th><th>Reference</th><th>Flag</th></tr></thead>
        <tbody>{fields.map((f) => {
          const v = results[f.key] ?? '';
          const flag = fieldFlag(f, v, req.sex);
          const id = `res-${f.key}`;
          return (
            <tr key={f.key}>
              <td><label htmlFor={id}>{f.label}</label></td>
              <td>{!onChange ? (v === '' ? <span className="muted">Not entered</span> : <>{v} {f.unit}</>)
                : f.type === 'number' ? <span className="inline-unit"><input id={id} inputMode="decimal" value={v} onChange={(e) => onChange(f.key, e.target.value)} /> {f.unit}</span>
                : f.type === 'select' ? <select id={id} value={v} onChange={(e) => onChange(f.key, e.target.value)}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                : <textarea id={id} rows={2} value={v} onChange={(e) => onChange(f.key, e.target.value)} />}</td>
              <td className="muted">{refText(f, req.sex) || '—'}</td>
              <td>{flag && <span className={`badge ${TONE[flag]}`}>{flag}</span>}</td>
            </tr>);
        })}</tbody>
      </table>
    </div>
  );
}
