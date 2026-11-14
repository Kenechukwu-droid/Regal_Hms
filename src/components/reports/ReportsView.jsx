import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import KpiCard from '../dashboard/KpiCard';
import RevenueChart from '../dashboard/RevenueChart';
import StatusBadge from '../common/StatusBadge';
import BarCard from './BarCard';
import { naira } from '../billing/constants';
import { useRole } from '../../context/RoleContext';
import { addDays, fmtDay, fromISO, toISO, todayISO } from '../../utils/dates';
import { downloadCsv } from '../../utils/csv';
import { api } from '../../services/api';

const PERIODS = {
  'This month': () => { const t = todayISO(); return [`${t.slice(0, 8)}01`, t]; },
  'Last month': () => { const first = fromISO(`${todayISO().slice(0, 8)}01`); const end = new Date(first); end.setDate(0); const start = new Date(end.getFullYear(), end.getMonth(), 1); return [toISO(start), toISO(end)]; },
  'Last 90 days': () => [addDays(todayISO(), -90), todayISO()],
  'This year': () => [`${todayISO().slice(0, 4)}-01-01`, todayISO()],
};

const Table = ({ head, rows, csv }) => (
  <div className="table-wrap">
    <table><thead><tr>{head.map((h) => <th key={h} className={/₦|amount|invoiced|balance|outstanding|hours|surgeries|consultations|invoices|%/i.test(h) ? 'num' : ''}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.cells.map((c, j) => <td key={j} className={head[j] && /amount|invoiced|balance|outstanding|hours|surgeries|consultations|invoices|%/i.test(head[j]) ? 'num' : ''}>{c}</td>)}</tr>)}</tbody></table>
    {csv && <button className="btn small" style={{ marginTop: 10 }} onClick={csv}><Download size={14} aria-hidden /> Download CSV</button>}
  </div>
);

export default function ReportsView() {
  const { role } = useRole();
  const [period, setPeriod] = useState('Last 90 days');
  const [data, setData] = useState(null);
  const [from, to] = useMemo(() => PERIODS[period](), [period]);

  useEffect(() => { let live = true; setData(null); api.getReports({ from, to }, role).then((d) => live && setData(d)); return () => { live = false; }; }, [from, to, role]);

  const c = data?.clinical, f = data?.financial;
  const stamp = `${from}_to_${to}`;
  return (
    <>
      <div className="toolbar">
        <select className="role-filter" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Report period">{Object.keys(PERIODS).map((p) => <option key={p}>{p}</option>)}</select>
        <span className="muted">{fmtDay(from, { day: 'numeric', month: 'short', year: 'numeric' })} to {fmtDay(to, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
      {!data && <p className="empty">Working out the figures…</p>}

      {f && (
        <>
          <h2 className="section-title">Money</h2>
          <div className="grid kpis">
            <KpiCard label="Invoiced" value={naira(f.invoiced)} note="Invoices issued in the period" />
            <KpiCard label="Collected" value={naira(f.collected)} note="Payments received in the period" />
            <KpiCard label="Outstanding now" value={naira(f.outstandingNow)} note="Unpaid on open invoices today" />
            <KpiCard label="Quotes accepted" value={`${f.quotes.conversion}%`} note={`${f.quotes.accepted} of ${f.quotes.sent} sent`} />
          </div>
          <div className="grid two" style={{ marginBottom: 16 }}>
            <section className="card"><h2>Monthly revenue vs target (₦ millions)</h2><RevenueChart data={f.monthly} /><p className="muted small-text">Demonstration series.</p></section>
            <BarCard title="Collected by payment method" data={f.collectedByMethod} y="amount" format={(v) => naira(v)} />
          </div>
          <div className="grid two" style={{ marginBottom: 16 }}>
            <BarCard title="What’s still owed, by how late it is" data={f.aging} y="amount" format={(v) => naira(v)} empty="Nothing is owed." />
            <section className="card"><h2>Largest unpaid invoices</h2>
              {f.topOutstanding.length === 0 ? <p className="muted">No unpaid invoices.</p> : (
                <Table head={['Invoice', 'Patient', 'Balance', 'Due', 'Status']}
                  rows={f.topOutstanding.map((i) => ({ cells: [<Link className="plink" to={`/billing/invoices/${i.id}`}>{i.id}</Link>, i.patient, naira(i.balance), i.dueDate, <StatusBadge value={i.status} />] }))}
                  csv={() => downloadCsv(`unpaid-invoices_${todayISO()}.csv`, [['Invoice', 'Patient', 'Procedure', 'Balance', 'Due', 'Status'], ...f.topOutstanding.map((i) => [i.id, i.patient, i.procedure, i.balance, i.dueDate, i.status])])} />)}
            </section>
          </div>
          <section className="card" style={{ marginBottom: 24 }}><h2>Invoiced by procedure</h2>
            {f.byProcedure.length === 0 ? <p className="muted">No invoices were issued in this period.</p> : (
              <Table head={['Procedure', 'Invoices', 'Invoiced', 'Outstanding']} rows={f.byProcedure.map((r) => ({ cells: [r.procedure, r.invoices, naira(r.invoiced), naira(r.outstanding)] }))}
                csv={() => downloadCsv(`invoiced-by-procedure_${stamp}.csv`, [['Procedure', 'Invoices', 'Invoiced', 'Outstanding'], ...f.byProcedure.map((r) => [r.procedure, r.invoices, r.invoiced, r.outstanding])])} />)}
          </section>
        </>
      )}

      {c && (
        <>
          <h2 className="section-title">Clinic activity</h2>
          <div className="grid kpis">
            <KpiCard label="Appointments" value={c.appointments.total} note={`${c.appointments.completed} completed`} />
            <KpiCard label="No-show rate" value={`${c.appointments.noShowRate}%`} note={`${c.appointments.noShow} no-shows, ${c.appointments.cancelled} cancelled`} />
            <KpiCard label="Consultations completed" value={c.consultationsCompleted} note="Signed off by a surgeon" />
            <KpiCard label="Surgeries performed" value={c.surgeries.performed} note="In theatre, recovering or completed" />
            <KpiCard label="Theatre use" value={`${c.theatreUtilisation}%`} note="Booked hours against 08:00 to 18:00, Mon to Sat" />
            <KpiCard label="Lab turnaround" value={c.lab.avgTurnaroundHours === null ? '—' : `${c.lab.avgTurnaroundHours} h`} note={`${c.lab.abnormalRate}% of results abnormal`} />
          </div>
          <div className="grid two" style={{ marginBottom: 16 }}>
            <BarCard title="Surgeries by procedure" data={c.surgeries.byProcedure} horizontal />
            <BarCard title="Appointments by status" data={c.appointments.byStatus} x="status" />
          </div>
          <div className="grid two">
            <section className="card"><h2>By surgeon</h2>
              {c.bySurgeon.length === 0 ? <p className="muted">No activity in this period.</p> : <Table head={['Surgeon', 'Surgeries', 'Consultations']} rows={c.bySurgeon.map((r) => ({ cells: [r.surgeon, r.surgeries, r.consultations] }))} />}</section>
            <section className="card"><h2>Theatres</h2>
              <Table head={['Theatre', 'Booked hours', 'Use %']} rows={c.theatres.map((t) => ({ cells: [t.theatre, t.bookedHours, `${t.utilisation}%`] }))}
                csv={() => downloadCsv(`theatre-use_${stamp}.csv`, [['Theatre', 'Booked hours', 'Utilisation %'], ...c.theatres.map((t) => [t.theatre, t.bookedHours, t.utilisation])])} /></section>
          </div>
        </>
      )}
    </>
  );
}
