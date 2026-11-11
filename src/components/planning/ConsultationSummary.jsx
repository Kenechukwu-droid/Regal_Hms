import { Link } from 'react-router-dom';

export default function ConsultationSummary({ consultation }) {
  return (
    <section className="card">
      <h2>From the consultation</h2>
      {!consultation ? <p className="muted">This plan was created without a consultation record.</p> : (
        <dl className="facts">
          <dt>Diagnosis</dt><dd>{consultation.diagnosis}</dd>
          <dt>Recommended</dt><dd>{consultation.procedure || '—'}</dd>
          <dt>Suitability</dt><dd>{consultation.candidacy}</dd>
          <dt>Tests asked</dt><dd>{consultation.investigations.join(', ') || 'None'}</dd>
          <dt>Record</dt><dd><Link className="plink" to={`/consultations/${consultation.id}`}>Open consultation</Link></dd>
        </dl>
      )}
    </section>
  );
}
