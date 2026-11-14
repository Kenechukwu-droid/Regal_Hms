import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import KpiCard from '../dashboard/KpiCard';
import RevenueChart from '../dashboard/RevenueChart';
import StatusBadge from '../common/StatusBadge';
import BarCard from './BarCard';
import { naira } from '../billing/constants';
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

export default function MoneyOverview() {
  const [period, setPeriod] = useState('Last 90 days');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [from, to] = useMemo(() => PERIODS[period](), [period]);

  useEffect(() => { let live = true; setData(null); setErr(''); api.getMoneyReport({ from, to }).then((d) => live && setData(d)).catch(() => live && setErr('Couldn’t load the money overview.')); return () => { live = false; }; }, [from, to]);

  const f = data;
  const stamp = `${from}_to_${to}`;
  return (
    <>
      <div className="toolbar">
        <select className="role-filter" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Report period">{Object.keys(PERIODS).map((p) => <option key={p}>{p}</option>)}</select>
        <span className="muted">{fmtDay(from, { day: 'numeric', month: 'short', year: 'numeric' })} to {fmtDay(to, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
      {err && <p className="form-error" role="alert">{err}</p>}
      {!data && !err && <p className="empty">Working out the figures…</p>}

      {f && (
        <>
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

    </>
  );
}
