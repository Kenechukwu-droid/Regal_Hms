import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import FormModal from '../common/FormModal';
import { fmtDateTime } from './constants';

const vitals = (o) => [o.bp && `BP ${o.bp}`, o.pulse && `Pulse ${o.pulse}`, o.temp && `${o.temp}°C`].filter(Boolean).join(' · ');

export default function ObservationLog({ observations, canReview, onReview }) {
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState('');
  const rows = [...observations].sort((a, b) => b.at.localeCompare(a.at));
  const trend = [...observations].sort((a, b) => a.at.localeCompare(b.at)).map((o) => ({ when: fmtDateTime(o.at), pain: o.pain }));

  if (rows.length === 0) return <p className="empty">No observations yet. Record the first reading after the patient arrives in aftercare.</p>;
  return (
    <>
      {trend.length > 1 && (
        <div className="trend" role="img" aria-label={`Pain score over ${trend.length} readings, latest ${trend[trend.length - 1].pain} out of 10`}>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trend} margin={{ top: 6, right: 12, bottom: 0, left: -24 }}>
              <CartesianGrid stroke="#e6ece8" vertical={false} />
              <XAxis dataKey="when" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} out of 10`, 'Pain']} />
              <Line type="monotone" dataKey="pain" stroke="#1f7a4d" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="muted small-text">Pain score over time</div>
        </div>
      )}
      <ul className="obs">
        {rows.map((o) => (
          <li key={o.id} className={o.flags.length && !o.review ? 'flagged' : ''}>
            <div className="obs-head"><b>{fmtDateTime(o.at)}</b><span className="muted"> · {o.by}</span></div>
            <div>Pain {o.pain}/10 · {o.wound}</div>
            {vitals(o) && <div className="muted">{vitals(o)}</div>}
            {o.notes && <div>{o.notes}</div>}
            {o.flags.length > 0 && (
              <div className="obs-flags">
                {o.flags.map((x) => <span key={x} className={`badge ${o.review ? 'warn' : 'bad'}`}>{x}</span>)}
                {o.review
                  ? <div className="item-by">Reviewed by {o.review.by}, {fmtDateTime(o.review.at)}: {o.review.note}</div>
                  : canReview
                    ? <button className="btn small" onClick={() => { setNote(''); setTarget(o); }}>Review</button>
                    : <span className="muted small-text">Waiting for a surgeon or the Medical Director to review.</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {target && (
        <FormModal title="Review flagged reading" submitLabel="Mark as reviewed" canSubmit={note.trim().length > 0}
          onSubmit={() => onReview(target.id, note)} onClose={() => setTarget(null)}>
          <p style={{ marginTop: 0 }}>{fmtDateTime(target.at)}: {target.flags.join(', ')}</p>
          <div className="field"><label htmlFor="rv-n">What was decided?</label>
            <textarea id="rv-n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus placeholder="Assessment and action taken, e.g. started antibiotics, review again tomorrow" /></div>
        </FormModal>
      )}
    </>
  );
}
