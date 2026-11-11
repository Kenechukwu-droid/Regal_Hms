const LABEL = { Registered: 'Registered', Consultation: 'Consultation', Planning: 'Surgical planning', Surgery: 'Surgery', Aftercare: 'Aftercare', Billing: 'Billing' };
const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PatientTimeline({ events }) {
  if (events.length === 0) return <p className="empty">No activity yet. Events appear here as the patient moves through the centre.</p>;
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="timeline">
      {sorted.map((e) => (
        <li key={e.id} className={e.upcoming ? 'upcoming' : ''}>
          <span className="dot" aria-hidden />
          <div>
            <div className="t-meta">{fmt(e.date)} · {LABEL[e.type] || e.type}{e.upcoming && ' · Upcoming'}</div>
            <div className="t-title">{e.title}</div>
            {e.note && <p className="t-note">{e.note}</p>}
            <div className="t-by">{e.by}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
