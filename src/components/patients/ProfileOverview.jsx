import { Link } from 'react-router-dom';

const bmi = (h, w) => (h && w ? (w / ((h / 100) ** 2)).toFixed(1) : '—');

export default function ProfileOverview({ p }) {
  return (
    <div className="grid two">
      <section className="card"><h2>Details</h2>
        <dl className="facts">
          <dt>Date of birth</dt><dd>{p.dob}</dd><dt>Sex</dt><dd>{p.sex}</dd><dt>Blood group</dt><dd>{p.bloodGroup}</dd>
          <dt>Height / weight</dt><dd>{p.heightCm ? `${p.heightCm} cm / ${p.weightKg} kg` : '—'}</dd>
          <dt>BMI</dt><dd>{bmi(p.heightCm, p.weightKg)}</dd>
          <dt>Phone</dt><dd>{p.phone}</dd><dt>Email</dt><dd>{p.email}</dd><dt>Address</dt><dd>{p.address}</dd>
        </dl>
      </section>
      <div className="grid">
        <section className="card"><h2>Current care</h2>
          <dl className="facts"><dt>Procedure</dt><dd>{p.procedure}</dd><dt>Surgeon</dt><dd>{p.surgeon}</dd><dt>Stage</dt><dd>{p.stage}</dd></dl>
          <div className="quick">
            <Link className="btn primary" to={`/appointments?book=${p.id}`}>Book appointment</Link>
            <Link className="btn" to={`/consultations?patient=${p.id}`}>Consultations</Link>
            <Link className="btn" to={`/surgical-planning?patient=${p.id}`}>Surgical planning</Link>
            <Link className="btn" to={`/aftercare?patient=${p.id}`}>Aftercare</Link>
          </div>
        </section>
        <section className="card"><h2>Emergency contact</h2>
          {p.emergency
            ? <dl className="facts"><dt>Name</dt><dd>{p.emergency.name}</dd><dt>Relation</dt><dd>{p.emergency.relation}</dd><dt>Phone</dt><dd>{p.emergency.phone}</dd></dl>
            : <p className="muted">Not recorded. Ask the patient at their next visit.</p>}
        </section>
      </div>
    </div>
  );
}
