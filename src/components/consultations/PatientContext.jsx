import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

export default function PatientContext({ profile, history, extra }) {
  return (
    <aside className="grid ctx">
      {extra}
      <section className="card">
        <h2>Background</h2>
        {!profile ? <p className="muted">Loading…</p> : (
          <>
            <h3 className="sub">Allergies</h3>
            {profile.allergies.length === 0 ? <p className="muted">{profile.allergiesRecorded === false ? 'Not yet recorded' : 'None known'}</p> : (
              <ul className="plainlist">{profile.allergies.map((a) => <li key={a.id}><b>{a.substance}</b> <span className="muted">({a.severity})</span></li>)}</ul>)}
            <h3 className="sub">Conditions</h3>
            {profile.conditions.length === 0 ? <p className="muted">None recorded</p> : (
              <ul className="plainlist">{profile.conditions.map((c) => <li key={c.id}>{c.name} <span className="muted">({c.status})</span></li>)}</ul>)}
            <h3 className="sub">Medication</h3>
            {profile.medications.length === 0 ? <p className="muted">None recorded</p> : (
              <ul className="plainlist">{profile.medications.map((m) => <li key={m.id}>{m.name} <span className="muted">· {m.dose}</span></li>)}</ul>)}
            <h3 className="sub">Previous surgeries</h3>
            {profile.pastSurgeries.length === 0 ? <p className="muted">None recorded</p> : (
              <ul className="plainlist">{profile.pastSurgeries.map((s) => <li key={s.id}>{s.name} <span className="muted">({s.year})</span></li>)}</ul>)}
            <Link className="plink" to={`/patients/${profile.id}`}>Open full profile</Link>
          </>
        )}
      </section>
      <section className="card">
        <h2>Previous consultations</h2>
        {history.length === 0 ? <p className="muted">No earlier consultations.</p> : (
          <ul className="plainlist">{history.map((h) => (
            <li key={h.id}><Link className="plink" to={`/consultations/${h.id}`}>{h.date}</Link> <StatusBadge value={h.status} />
              <div className="muted">{h.diagnosis || 'No diagnosis yet'}</div></li>))}
          </ul>)}
      </section>
    </aside>
  );
}
