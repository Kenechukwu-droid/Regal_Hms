import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import DocHeader from '../../components/billing/DocHeader';
import { naira } from '../../components/billing/constants';
import { fmtDateTime } from '../../components/aftercare/constants';
import { api } from '../../services/api';

export default function ReceiptView() {
  const { no } = useParams();
  const [r, setR] = useState(undefined);
  useEffect(() => { setR(undefined); api.getReceipt(no).then(setR).catch(() => setR(null)); }, [no]);
  if (r === undefined) return <p className="empty">Loading receipt…</p>;
  if (r === null) return <p className="empty">Receipt not found. <Link to="/billing">Back to billing</Link></p>;
  return (
    <>
      <Link to={`/billing/invoices/${r.invoiceId}`} className="back no-print"><ArrowLeft size={16} aria-hidden /> Invoice {r.invoiceId}</Link>
      <div className="actions no-print" style={{ marginTop: 0, marginBottom: 12 }}><button className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden /> Print receipt</button></div>
      <section className="card doc receipt">
        <DocHeader title="Receipt" number={r.receiptNo} rows={[['Date', fmtDateTime(r.at)], ['Received from', r.patient], ['For', `${r.procedure} (invoice ${r.invoiceId})`], ['Method', r.method + (r.reference ? `, ref ${r.reference}` : '')]]} />
        <dl className="totals">
          <dt className="grand">Amount received</dt><dd className="grand">{naira(r.amount)}</dd>
          <dt>Invoice total</dt><dd>{naira(r.invoiceTotal)}</dd>
          <dt>Balance after this payment</dt><dd>{naira(r.balanceAfter)}</dd>
        </dl>
        <p className="muted">Received by {r.by}. Thank you.</p>
      </section>
    </>
  );
}
