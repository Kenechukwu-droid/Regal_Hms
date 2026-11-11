import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { CONSULT_TYPES } from '../../components/consultations/constants';
import { clinicianName } from '../../components/appointments/constants';
import { api } from '../../services/api';
import { blocks } from '../../utils/scheduling';
import { todayISO } from '../../utils/dates';

export default function Consultations() {
  const [params, setParams] = useSearchParams();
  const patientFilter = params.get('patient');
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [appts, setAppts] = useState([]);
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const today = todayISO();

  useEffect(() => {
    setRows(null);
    api.getConsultations({ patientId: patientFilter }).then(setRows);
    api.getAppointments({ from: today, to: today }).then(setAppts);
  }, [patientFilter, today]);

  const byAppt = useMemo(() => new Map((rows || []).map((c) => [c.appointmentId, c])), [rows]);
  const queue = appts.filter((a) => CONSULT_TYPES.includes(a.type) && blocks(a) && (!patientFilter || a.patientId === patientFilter))
    .sort((a, b) => a.start.localeCompare(b.start));
  const filtered = (rows || []).filter((c) => (status === 'All' || c.status === status)
    && `${c.patient} ${c.diagnosis}`.toLowerCase().includes(q.toLowerCase()));

  const open = async (a) => { const c = byAppt.get(a.id) || await api.startConsultation(a.id); nav(`/consultations/${c.id}`); };

  if (rows === null) return <p className="empty">Loading consultations…</p>;
  return (
    <>
      <PageHeader title="Consultations" subtitle="Assessment, diagnosis and surgeon notes. Start one from today’s list or from a booked appointment."
        action={<Link className="btn" to="/appointments">Open calendar</Link>} />
      {patientFilter && (
        <p className="filter-chip">Showing one patient only. <button className="linklike" onClick={() => setParams({})}>Show everyone</button></p>
      )}

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Today’s appointments</h2>
        {queue.length === 0 ? <p className="empty">Nothing to see today. Consultation-type appointments booked for today appear here.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>With</th><th>Consultation</th><th /></tr></thead>
            <tbody>{queue.map((a) => {
              const c = byAppt.get(a.id);
              return (
                <tr key={a.id}>
                  <td>{a.start}</td><td>{a.patient}</td><td>{a.type}</td><td>{clinicianName(a.clinicianId)}</td>
                  <td>{c ? <StatusBadge value={c.status} /> : <span className="muted">Not started</span>}</td>
                  <td><button className="btn small" onClick={() => open(a)}>{!c ? 'Start' : c.status === 'Draft' ? 'Continue' : 'View'}</button></td>
                </tr>);
            })}</tbody>
          </table></div>
        )}
      </section>

      <div className="toolbar">
        <input className="search" placeholder="Search patient or diagnosis" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search consultations" />
        <select className="role-filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option>All</option><option>Draft</option><option>Completed</option>
        </select>
      </div>
      <div className="card table-wrap">
        {filtered.length === 0 ? <p className="empty">No consultations match. Clear the search or status filter.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Type</th><th>Diagnosis</th><th>Next step</th><th>Status</th></tr></thead>
            <tbody>{filtered.map((c) => (
              <tr key={c.id}>
                <td><Link className="plink" to={`/consultations/${c.id}`}>{c.date}</Link></td>
                <td>{c.patient}</td><td>{c.type}</td><td>{c.diagnosis || <span className="muted">Not yet entered</span>}</td>
                <td>{c.nextStep || <span className="muted">Not yet entered</span>}</td><td><StatusBadge value={c.status} /></td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
