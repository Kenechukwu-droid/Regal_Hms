import { getBlockers, getProgress } from '../../utils/planning';

export default function ReadinessCard({ plan }) {
  const { done, total, pct } = getProgress(plan);
  const blockers = getBlockers(plan);
  return (
    <section className="card">
      <h2>Readiness for surgery</h2>
      <div className={`progress ${blockers.length === 0 ? 'full' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress"><i style={{ width: `${pct}%` }} /></div>
      <p className="muted" style={{ margin: '8px 0 0' }}>{done} of {total} requirements met</p>
      {blockers.length === 0
        ? <p className="ok-text">Everything required is in place.</p>
        : <><p style={{ margin: '10px 0 0' }}><b>Still needed before surgery:</b></p><ul className="blockers">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></>}
    </section>
  );
}
