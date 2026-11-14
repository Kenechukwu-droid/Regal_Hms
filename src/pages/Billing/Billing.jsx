import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import KpiCard from '../../components/dashboard/KpiCard';
import NewQuoteForm from '../../components/billing/NewQuoteForm';
import MoneyOverview from '../../components/reports/MoneyOverview';
import { fmtDate, naira } from '../../components/billing/constants';
import { fmtDateTime } from '../../components/aftercare/constants';
import { clinicianName } from '../../components/appointments/constants';
import { invoiceBalance, invoiceStatus, invoiceTotal, quoteStatus, quoteTotals } from '../../utils/billing';
import { todayISO } from '../../utils/dates';
import { api } from '../../services/api';
import { useRole } from '../../context/RoleContext';
import { can } from '../../utils/permissions';

const TABS = ['Quotations', 'Invoices', 'Receipts'];

export default function Billing() {
  const nav = useNavigate();
  const { role } = useRole();
  const seeTotals = can(role, 'viewRevenue');   // front desk handles invoices but doesn't see company totals
  const tabs = seeTotals ? [...TABS, 'Money overview'] : TABS;   // company money figures: Finance and the Medical Director only
  const [tab, setTab] = useState('Quotations');
  const [q, setQ] = useState('');
  const [quotes, setQuotes] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [patients, setPatients] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api.getQuotations().then(setQuotes); api.getInvoices().then(setInvoices); api.getReceipts().then(setReceipts);
    api.getPlansWithoutQuotation().then(setPlans); api.getPatients().then(setPatients);
  }, []);
  useEffect(load, [load]);

  const stats = useMemo(() => {
    const live = invoices.filter((i) => !i.voidedAt);
    const overdue = live.filter((i) => invoiceStatus(i) === 'Overdue');
    const month = todayISO().slice(0, 7);
    return {
      outstanding: live.reduce((s, i) => s + Math.max(0, invoiceBalance(i)), 0),
      overdueN: overdue.length, overdueAmt: overdue.reduce((s, i) => s + invoiceBalance(i), 0),
      collected: receipts.filter((r) => r.at.startsWith(month)).reduce((s, r) => s + r.amount, 0),
      awaiting: (quotes || []).filter((x) => quoteStatus(x) === 'Sent').length,
    };
  }, [invoices, receipts, quotes]);

  const create = async (body) => { const made = await api.createQuotation(body); nav(`/billing/quotations/${made.id}`); };
  const quickQuote = async (planId) => { const made = await api.createQuotation({ planId }); nav(`/billing/quotations/${made.id}`); };

  if (quotes === null) return <p className="empty">Loading billing…</p>;
  const match = (s) => s.toLowerCase().includes(q.toLowerCase());
  const byNewest = (a, b) => (b.createdAt || b.issuedAt || b.at).localeCompare(a.createdAt || a.issuedAt || a.at);

  return (
    <>
      <PageHeader title="Billing & payments" subtitle="Quote the patient, invoice what they accept, then record payments and issue receipts."
        action={<button className="btn primary" onClick={() => setCreating(true)}><FilePlus size={16} aria-hidden /> New quotation</button>} />
      <div className="grid kpis">
        {seeTotals && <KpiCard label="Outstanding" value={naira(stats.outstanding)} note="Unpaid on open invoices" />}
        {seeTotals && <KpiCard label="Overdue" value={stats.overdueN} note={stats.overdueN ? `${naira(stats.overdueAmt)} past due` : 'Nothing past due'} />}
        {seeTotals && <KpiCard label="Collected this month" value={naira(stats.collected)} note="From recorded receipts" />}
        <KpiCard label="Quotes awaiting a decision" value={stats.awaiting} note="Sent, not yet answered" />
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Plans waiting for a quotation</h2>
        {plans.length === 0 ? <p className="empty">Every active surgical plan has a quotation.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Patient</th><th>Procedure</th><th>Surgeon</th><th>Plan status</th><th /></tr></thead>
            <tbody>{plans.map((p) => (
              <tr key={p.id}><td>{p.patient}</td><td>{p.procedure}</td><td>{clinicianName(p.surgeonId)}</td><td><StatusBadge value={p.status} /></td>
                <td><button className="btn small primary" onClick={() => quickQuote(p.id)}>Create quotation</button></td></tr>))}
            </tbody>
          </table></div>
        )}
      </section>

      <div className="tabs" role="tablist">{tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Money overview' ? <MoneyOverview /> : (<>
      <div className="toolbar"><input className="search" placeholder="Search patient or procedure" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search billing" /></div>

      <div className="card table-wrap">
        {tab === 'Quotations' && (() => {
          const rows = quotes.filter((x) => match(`${x.patient} ${x.procedure}`)).sort(byNewest);
          return rows.length === 0 ? <p className="empty">No quotations match.</p> : (
            <table><thead><tr><th>Quotation</th><th>Patient</th><th>For</th><th className="num">Total</th><th>Valid until</th><th>Status</th></tr></thead>
              <tbody>{rows.map((x) => (
                <tr key={x.id}><td><Link className="plink" to={`/billing/quotations/${x.id}`}>{x.id}</Link></td><td>{x.patient}</td><td>{x.procedure}</td>
                  <td className="num">{naira(quoteTotals(x).total)}</td><td>{fmtDate(x.validUntil)}</td><td><StatusBadge value={quoteStatus(x)} /></td></tr>))}</tbody></table>);
        })()}
        {tab === 'Invoices' && (() => {
          const rows = invoices.filter((x) => match(`${x.patient} ${x.procedure}`)).sort(byNewest);
          return rows.length === 0 ? <p className="empty">No invoices match.</p> : (
            <table><thead><tr><th>Invoice</th><th>Patient</th><th>For</th><th className="num">Total</th><th className="num">Balance</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>{rows.map((x) => (
                <tr key={x.id}><td><Link className="plink" to={`/billing/invoices/${x.id}`}>{x.id}</Link></td><td>{x.patient}</td><td>{x.procedure}</td>
                  <td className="num">{naira(invoiceTotal(x))}</td><td className="num">{x.voidedAt ? '—' : naira(invoiceBalance(x))}</td><td>{fmtDate(x.dueDate)}</td><td><StatusBadge value={invoiceStatus(x)} /></td></tr>))}</tbody></table>);
        })()}
        {tab === 'Receipts' && (() => {
          const rows = receipts.filter((x) => match(`${x.patient} ${x.procedure} ${x.receiptNo}`));
          return rows.length === 0 ? <p className="empty">No receipts match.</p> : (
            <table><thead><tr><th>Receipt</th><th>Date</th><th>Patient</th><th>Invoice</th><th>Method</th><th className="num">Amount</th></tr></thead>
              <tbody>{rows.map((x) => (
                <tr key={x.receiptNo}><td><Link className="plink" to={`/billing/receipts/${x.receiptNo}`}>{x.receiptNo}</Link></td><td>{fmtDateTime(x.at)}</td><td>{x.patient}</td>
                  <td><Link className="plink" to={`/billing/invoices/${x.invoiceId}`}>{x.invoiceId}</Link></td><td>{x.method}</td><td className="num">{naira(x.amount)}</td></tr>))}</tbody></table>);
        })()}
      </div></>)}

      {creating && <NewQuoteForm plans={plans} patients={patients} onSave={create} onClose={() => setCreating(false)} />}
    </>
  );
}
