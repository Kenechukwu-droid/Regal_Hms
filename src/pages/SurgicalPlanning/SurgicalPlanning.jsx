import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { clinicianName } from '../../components/appointments/constants';
import { useRole } from '../../context/RoleContext';
import { api } from '../../services/api';
import { getBlockers, getProgress } from '../../utils/planning';

export default function SurgicalPlanning() {
  const [params, setParams] = useSearchParams();
  const patientFilter = params.get('patient');
  const nav = useNavigate();
  const { role } = useRole();
  const [plans, setPlans] = useState(null);
  const [consults, setConsults] = useState([]);
  const [status, setStatus] = useState('Active');
  const [q, setQ] = useState('');

  useEffect(() => {
    setPlans(null);
    api.getPlans({ patientId: patientFilter }).then(setPlans);
    api.getConsultations({ patientId: patientFilter }).then(setConsults);
  }, [patientFilter]);

  const planned = useMemo(() => new Set((plans || []).map((p) => p.consultationId)), [plans]);
  const ready = consults.filter((c) => c.status === 'Completed' && c.nextStep === 'Proceed to surgical planning' && !planned.has(c.id));
  const canStart = ['director', 'surgeon'].includes(role);

  const rows = (plans || []).filter((p) => (status === 'All' ? true : status === 'Active' ? p.status !== 'Cancelled' : p.status === status)
    && `${p.patient} ${p.procedure}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.targetDate || '9').localeCompare(b.targetDate || '9'));

  if (plans === null) return <p className="empty">Loading surgical plans…</p>;
  return (
    <>
      <PageHeader title="Surgical planning" subtitle="Pre-op checklist, consent and clearance. A plan is ready only when every requirement is in place." />
      {patientFilter && <p className="filter-chip">Showing one patient only. <button className="linklike" onClick={() => setParams({})}>Show everyone</button></p>}

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Ready to plan</h2>
        {ready.length === 0 ? <p className="empty">No one is waiting. Completed consultations with the next step “Proceed to surgical planning” appear here.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Patient</th><th>Recommended</th><th>Surgeon</th><th>Consulted</th><th /></tr></thead>
            <tbody>{ready.map((c) => (
              <tr key={c.id}><td>{c.patient}</td><td>{c.procedure || c.diagnosis}</td><td>{clinicianName(c.clinicianId)}</td><td>{c.date}</td>
                <td>{canStart && <button className="btn small primary" onClick={async () => nav(`/surgical-planning/${(await api.startPlan(c.id)).id}`)}>Start plan</button>}</td></tr>))}
            </tbody>
          </table></div>
        )}
      </section>

      <div className="toolbar">
        <input className="search" placeholder="Search patient or procedure" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plans" />
        <select className="role-filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option>Active</option><option>Planning</option><option>Ready</option><option>On hold</option><option>Cancelled</option><option>All</option>
        </select>
      </div>
      <div className="card table-wrap">
        {rows.length === 0 ? <p className="empty">No plans match. Clear the search or change the status filter.</p> : (
          <table>
            <thead><tr><th>Target date</th><th>Patient</th><th>Procedure</th><th>Surgeon</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>{rows.map((p) => {
              const pr = getProgress(p); const first = getBlockers(p)[0];
              return (
                <tr key={p.id}>
                  <td>{p.targetDate || <span className="muted">Not set</span>}</td>
                  <td><Link className="plink" to={`/surgical-planning/${p.id}`}>{p.patient}</Link></td>
                  <td>{p.procedure}</td><td>{clinicianName(p.surgeonId)}</td>
                  <td><div className="progress sm"><i style={{ width: `${pr.pct}%` }} /></div>
                    <div className="muted small-text">{p.status === 'Ready' ? 'All in place' : first ? `${pr.done} of ${pr.total} · ${first}` : `${pr.done} of ${pr.total}`}</div></td>
                  <td><StatusBadge value={p.status} /></td>
                </tr>);
            })}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
