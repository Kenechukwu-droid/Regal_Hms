import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import LineItems from '../../components/billing/LineItems';
import Totals from '../../components/billing/Totals';
import DocHeader from '../../components/billing/DocHeader';
import PaymentForm from '../../components/billing/PaymentForm';
import { fmtDate, naira } from '../../components/billing/constants';
import { fmtDateTime } from '../../components/aftercare/constants';
import { invoiceBalance, invoicePaid, invoiceStatus, invoiceTotal, quoteTotals } from '../../utils/billing';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function InvoiceView() {
  const { id } = useParams();
  const { role } = useRole();
  const [inv, setInv] = useState(undefined);       // undefined = loading, null = not found
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const by = ROLES[role];
  useEffect(() => { setInv(undefined); api.getInvoice(id).then(setInv).catch(() => setInv(null)); }, [id]);

  if (inv === undefined) return <p className="empty">Loading invoice…</p>;
  if (inv === null) return <p className="empty">Invoice not found. <Link to="/billing">Back to billing</Link></p>;

  const status = invoiceStatus(inv);
  const open = !inv.voidedAt && invoiceBalance(inv) > 0;
  const canVoid = ['director', 'finance'].includes(role) && !inv.voidedAt && inv.payments.length === 0;
  const t = quoteTotals(inv);

  return (
    <>
      <Link to="/billing" className="back no-print"><ArrowLeft size={16} aria-hidden /> Billing & payments</Link>
      <div className="profile-head no-print">
        <div>
          <h1>Invoice: <Link className="plink h1link" to={`/patients/${inv.patientId}`}>{inv.patient}</Link></h1>
          <p className="muted">{inv.procedure} · {inv.id} · from <Link className="plink" to={`/billing/quotations/${inv.quotationId}`}>{inv.quotationId}</Link></p>
        </div>
        <div className="spacer" /><StatusBadge value={status} />
        <button className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden /> Print</button>
      </div>
      {inv.voidedAt && <p className="locked-note">Void since {fmtDateTime(inv.voidedAt)} ({inv.voidedBy}): {inv.voidReason}. A new invoice can be raised from the quotation.</p>}

      <section className="card doc">
        <DocHeader title="Invoice" number={inv.id} rows={[['Patient', inv.patient], ['For', inv.procedure], ['Issued', fmtDate(inv.issuedAt)], ['Due', fmtDate(inv.dueDate)]]} />
        <LineItems lines={inv.lines} editable={false} />
        <Totals {...t}>
          <dt>Paid</dt><dd>{naira(invoicePaid(inv))}</dd>
          <dt className="grand">Balance due</dt><dd className="grand">{naira(inv.voidedAt ? 0 : invoiceBalance(inv))}</dd>
        </Totals>
      </section>

      <section className="card no-print" style={{ marginTop: 16 }}>
        <div className="section-head"><h2>Payments</h2>
          {open && <button className="btn primary small" onClick={() => setPaying(true)}>Record payment</button>}</div>
        {inv.payments.length === 0 ? <p className="empty">No payments yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th className="num">Amount</th><th className="num">Balance after</th><th>Received by</th></tr></thead>
            <tbody>{inv.payments.map((p) => (
              <tr key={p.receiptNo}>
                <td><Link className="plink" to={`/billing/receipts/${p.receiptNo}`}>{p.receiptNo}</Link></td>
                <td>{fmtDateTime(p.at)}</td><td>{p.method}{p.reference && <div className="muted small-text">{p.reference}</div>}</td>
                <td className="num">{naira(p.amount)}</td><td className="num">{naira(p.balanceAfter)}</td><td>{p.by}</td>
              </tr>))}</tbody>
          </table></div>
        )}
        {canVoid && <div className="actions"><button className="btn danger-text" onClick={() => { setReason(''); setVoiding(true); }}>Void invoice</button></div>}
      </section>

      {paying && <PaymentForm invoice={inv} onSave={async (p) => setInv(await api.recordPayment(inv.id, p, by))} onClose={() => setPaying(false)} />}
      {voiding && (
        <FormModal title="Void invoice" submitLabel="Void invoice" canSubmit={reason.trim().length > 0}
          onSubmit={async () => setInv(await api.voidInvoice(inv.id, reason, by))} onClose={() => setVoiding(false)}>
          <div className="field"><label htmlFor="vr">Reason</label><textarea id="vr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
          <p className="muted">Only invoices with no payments can be voided.</p>
        </FormModal>
      )}
    </>
  );
}
