import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import KpiCard from '../../components/dashboard/KpiCard';
import { fmtDateTime } from '../../components/aftercare/constants';
import { clinicianName } from '../../components/appointments/constants';
import { daysBetween, followUpState, overdueFollowUps, unreviewed } from '../../utils/aftercare';
import { todayISO } from '../../utils/dates';
import { api } from '../../services/api';

export default function Aftercare() {
  const [cases, setCases] = useState(null);
  const [status, setStatus] = useState('In recovery');
  const [q, setQ] = useState('');
  const today = todayISO();

  useEffect(() => { api.getAftercareCases().then(setCases); }, []);

  const attn = (r) => ({ flagged: unreviewed(r).length, overdue: overdueFollowUps(r).length });
  const stats = useMemo(() => {
    const live = (cases || []).filter((r) => r.status === 'In recovery');
    return { live: live.length, flagged: live.filter((r) => attn(r).flagged).length, overdue: live.filter((r) => attn(r).overdue).length };
  }, [cases]);

  if (cases === null) return <p className="empty">Loading aftercare…</p>;
  const rows = cases
    .filter((r) => (status === 'All' || r.status === status) && `${r.patient} ${r.procedure}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (attn(b).flagged - attn(a).flagged) || (attn(b).overdue - attn(a).overdue) || b.surgeryDate.localeCompare(a.surgeryDate));

  return (
    <>
      <PageHeader title="Recovery & aftercare" subtitle="Monitor patients after surgery and keep their follow-ups on track. Patients arrive here when surgery hands them over." />
      <div className="grid kpis">
        <KpiCard label="In recovery" value={stats.live} note="Under active monitoring" />
        <KpiCard label="Flagged readings" value={stats.flagged} note={stats.flagged ? 'Waiting for clinician review' : 'Nothing waiting'} />
        <KpiCard label="Overdue follow-ups" value={stats.overdue} note={stats.overdue ? 'Book or chase these' : 'All on track'} />
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Search patient or procedure" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search aftercare" />
        <select className="role-filter" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option>In recovery</option><option>Routine follow-up</option><option>All</option>
        </select>
      </div>
      <div className="card table-wrap">
        {rows.length === 0 ? <p className="empty">{cases.length === 0
          ? 'No one is in aftercare yet. In Surgery & theatre, “Hand over to aftercare” on a recovering case adds the patient here.'
          : 'No patients match. Clear the search or change the status filter.'}</p> : (
          <table>
            <thead><tr><th>Patient</th><th>Procedure</th><th>Post-op day</th><th>Latest check</th><th>Next follow-up</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => {
              const last = [...r.observations].sort((a, b) => b.at.localeCompare(a.at))[0];
              const next = r.followUps.find((f) => ['Due', 'Overdue', 'Booked'].includes(followUpState(f)));
              const a = attn(r);
              return (
                <tr key={r.id}>
                  <td><Link className="plink" to={`/aftercare/${r.id}`}>{r.patient}</Link>
                    <div className="muted small-text">{clinicianName(r.surgeonId)}</div></td>
                  <td>{r.procedure}</td>
                  <td>Day {daysBetween(r.surgeryDate, today)}</td>
                  <td>{last ? <>Pain {last.pain}/10 · {last.wound}<div className="muted small-text">{fmtDateTime(last.at)}</div></> : <span className="muted">None yet</span>}</td>
                  <td>{next ? <>{next.label}<div className="muted small-text">{followUpState(next)}{next.appointment ? ` · ${next.appointment.date}` : ` · due ${next.dueDate}`}</div></> : <span className="muted">None pending</span>}</td>
                  <td><StatusBadge value={r.status} />
                    {a.flagged > 0 && <> <span className="badge bad">Needs review</span></>}
                    {a.overdue > 0 && <> <span className="badge warn">Overdue</span></>}</td>
                </tr>);
            })}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
