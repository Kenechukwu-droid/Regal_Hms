import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import LineItems from '../../components/billing/LineItems';
import Totals from '../../components/billing/Totals';
import DocHeader from '../../components/billing/DocHeader';
import { DISCOUNT_LIMIT_PCT, fmtDate } from '../../components/billing/constants';
import { quoteStatus, quoteTotals, validateQuote } from '../../utils/billing';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function QuotationEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { role } = useRole();
  const [q, setQ] = useState(undefined);          // undefined = loading, null = not found
  const [f, setF] = useState(null);               // editable copy while a draft
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(null);   // 'accept' | 'decline'
  const isDirector = role === 'director';
  const by = ROLES[role];

  const apply = (next) => { setQ(next); setF(next.status === 'Draft' ? structuredClone(next) : null); };
  useEffect(() => { setQ(undefined); api.getQuotation(id).then((x) => (x ? apply(x) : setQ(null))).catch(() => setQ(null)); }, [id]);

  if (q === undefined) return <p className="empty">Loading quotation…</p>;
  if (q === null) return <p className="empty">Quotation not found. <Link to="/billing">Back to billing</Link></p>;

  const shown = f ?? q;
  const status = quoteStatus(q);
  const draft = q.status === 'Draft';
  const errors = draft ? validateQuote(f, { isDirector }) : [];
  const dirty = draft && JSON.stringify(f) !== JSON.stringify(q);
  const t = quoteTotals(shown);

  const run = async (fn) => { setBusy(true); setErr(''); try { apply(await fn()); } catch (e) { setErr(e.message); } setBusy(false); };
  const save = () => run(() => api.saveQuotation(f, { isDirector }));
  const send = () => run(async () => { if (dirty) await api.saveQuotation(f, { isDirector }); return api.sendQuotation(q.id, { isDirector }); });
  const makeInvoice = async () => { setBusy(true); setErr(''); try { nav(`/billing/invoices/${(await api.createInvoice(q.id, by)).id}`); } catch (e) { setErr(e.message); setBusy(false); } };

  return (
    <>
      <Link to="/billing" className="back no-print"><ArrowLeft size={16} aria-hidden /> Billing & payments</Link>
      <div className="profile-head no-print">
        <div>
          <h1>Quotation: <Link className="plink h1link" to={`/patients/${q.patientId}`}>{q.patient}</Link></h1>
          <p className="muted">{q.procedure} · {q.id}</p>
        </div>
        <div className="spacer" /><StatusBadge value={status} />
        <button className="btn" onClick={() => window.print()}><Printer size={16} aria-hidden /> Print</button>
      </div>
      {err && <p className="form-error" role="alert">{err}</p>}
      {status === 'Expired' && <p className="locked-note">Expired on {fmtDate(q.validUntil)}. Take it back to draft, extend the date and send it again.</p>}
      {q.status === 'Declined' && <p className="locked-note">Declined by the patient on {fmtDate(q.decidedAt)}.</p>}

      <section className="card doc">
        <DocHeader title="Quotation" number={q.id} rows={[['Patient', q.patient], ['For', q.procedure], ['Valid until', fmtDate(q.validUntil)]]} />
        <LineItems lines={shown.lines} editable={draft} onChange={(lines) => setF({ ...f, lines })} />
        <Totals {...t} editableDiscount={draft} discount={draft ? f.discount : t.discount} onDiscount={(v) => setF({ ...f, discount: v })} />
        {draft && (
          <div className="field no-print" style={{ maxWidth: 220 }}><label htmlFor="vu">Valid until</label>
            <input id="vu" type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} /></div>
        )}
        {(shown.notes || draft) && (
          <div className="field"><label htmlFor="qn">Notes for the patient (optional)</label>
            <textarea id="qn" rows={2} value={shown.notes} readOnly={!draft} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        )}
      </section>

      {draft && errors.map((m) => <p key={m} className="form-error no-print" role="alert">{m}</p>)}
      {draft && <p className="muted small-text no-print">Discounts above {DISCOUNT_LIMIT_PCT}% of the subtotal need the Medical Director.</p>}

      <div className="actions no-print">
        {draft && <>
          <button className="btn" disabled={busy || !dirty || errors.length > 0} onClick={save}>Save draft</button>
          <button className="btn primary" disabled={busy || errors.length > 0} onClick={send}>Send to patient</button>
        </>}
        {q.status === 'Sent' && <>
          {status === 'Sent' && <>
            <button className="btn primary" disabled={busy} onClick={() => setConfirm('accept')}>Patient accepted</button>
            <button className="btn" disabled={busy} onClick={() => setConfirm('decline')}>Patient declined</button>
          </>}
          <button className="btn" disabled={busy} onClick={() => run(() => api.returnQuotationToDraft(q.id))}>Take back to draft</button>
        </>}
        {q.status === 'Accepted' && (q.invoiceId
          ? <Link className="btn primary" to={`/billing/invoices/${q.invoiceId}`}>Open invoice {q.invoiceId}</Link>
          : <button className="btn primary" disabled={busy} onClick={makeInvoice}>Create invoice</button>)}
      </div>

      {confirm && (
        <FormModal title={confirm === 'accept' ? 'Record acceptance' : 'Record decline'} submitLabel={confirm === 'accept' ? 'Yes, accepted' : 'Yes, declined'}
          confirmText="" onSubmit={async () => apply(await api.decideQuotation(q.id, confirm === 'accept' ? 'Accepted' : 'Declined', by))} onClose={() => setConfirm(null)}>
          <p style={{ marginTop: 0 }}>{confirm === 'accept'
            ? 'The patient has agreed to this quotation. You can then raise the invoice. The prices are locked from here.'
            : 'The patient is not going ahead. The surgical plan will appear under “Plans waiting for a quotation” again.'}</p>
        </FormModal>
      )}
    </>
  );
}
