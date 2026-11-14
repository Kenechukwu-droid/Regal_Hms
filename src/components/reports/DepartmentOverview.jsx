import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { DEPARTMENTS, monthLabel, shiftMonth } from '../../utils/departments';
import { todayISO } from '../../utils/dates';
import { api } from '../../services/api';

const when = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// What the Medical Director sees: one card per department, and everything the heads have raised.
export default function DepartmentOverview() {
  const thisMonth = todayISO().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { let live = true; setRows(null); setErr(''); api.getDepartmentReports({ month }).then((r) => live && setRows(r)).catch(() => live && setErr('Couldn’t load the reports.')); return () => { live = false; }; }, [month]);

  const filed = (rows || []).filter((r) => ['Submitted', 'Acknowledged'].includes(r.status));
  const toReview = filed.filter((r) => r.status === 'Submitted').length;
  const label = (d) => DEPARTMENTS.find((x) => x.key === d).label;

  return (
    <>
      <div className="cal-toolbar">
        <div className="nav">
          <button className="btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <strong className="range">{monthLabel(month)}</strong>
          <button className="btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        {rows && <span className="muted">{filed.length} of {rows.length} departments have reported{toReview > 0 && `, ${toReview} waiting for you`}</span>}
      </div>
      {err && <p className="form-error" role="alert">{err}</p>}
      {!rows && !err && <p className="empty">Loading reports…</p>}
      {rows && (
        <>
          <div className="dept-grid">{rows.map((r) => {
            const open = ['Submitted', 'Acknowledged'].includes(r.status);
            const body = (
              <>
                <div className="section-head"><h3>{label(r.department)}</h3><StatusBadge value={r.status} /></div>
                <p className="muted small-text" style={{ margin: 0 }}>{r.head ? `Head: ${r.head.name}` : 'No head assigned yet'}</p>
                <p className="small-text" style={{ margin: '8px 0 0' }}>{open ? `Submitted ${when(r.submittedAt)}${r.status === 'Acknowledged' ? ` · you acknowledged it` : ' · needs your review'}`
                  : r.status === 'In progress' ? 'Being written. Not submitted yet.' : 'Nothing submitted yet.'}</p>
              </>);
            return open ? <Link key={r.department} className="card dept-card" to={`/staff/reports/${r.department}/${month}`}>{body}</Link> : <div key={r.department} className="card dept-card idle">{body}</div>;
          })}</div>

          <section className="card" style={{ marginTop: 16 }}>
            <h2>Problems and requests raised</h2>
            {filed.filter((r) => r.issues || r.requests).length === 0 ? <p className="muted">Nothing raised yet this month.</p> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Department</th><th>Problems</th><th>Asking for</th></tr></thead>
                <tbody>{filed.map((r) => (
                  <tr key={r.department}><td><Link className="plink" to={`/staff/reports/${r.department}/${month}`}>{label(r.department)}</Link></td><td>{r.issues}</td><td>{r.requests || <span className="muted">Nothing</span>}</td></tr>))}</tbody>
              </table></div>)}
          </section>
        </>)}
    </>
  );
}
