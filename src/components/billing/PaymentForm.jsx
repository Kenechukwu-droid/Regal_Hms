import { useState } from 'react';
import FormModal from '../common/FormModal';
import { METHODS, NEEDS_REFERENCE, naira } from './constants';
import { invoiceBalance, validatePayment } from '../../utils/billing';

export default function PaymentForm({ invoice, onSave, onClose }) {
  const bal = invoiceBalance(invoice);
  const [f, setF] = useState({ amount: String(bal), method: 'Bank transfer', reference: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const errors = validatePayment(invoice, f);
  return (
    <FormModal title="Record payment" submitLabel="Record payment and issue receipt" canSubmit={errors.length === 0} onSubmit={() => onSave(f)} onClose={onClose}>
      <p style={{ marginTop: 0 }}>Balance on {invoice.id}: <b>{naira(bal)}</b></p>
      <div className="row2">
        <div className="field"><label htmlFor="py-a">Amount received (₦)</label><input id="py-a" inputMode="numeric" value={f.amount} onChange={set('amount')} autoFocus /></div>
        <div className="field"><label htmlFor="py-m">Method</label><select id="py-m" value={f.method} onChange={set('method')}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
      </div>
      {NEEDS_REFERENCE.includes(f.method) && (
        <div className="field"><label htmlFor="py-r">{f.method === 'POS card' ? 'POS slip reference' : 'Transfer reference'}</label><input id="py-r" value={f.reference} onChange={set('reference')} /></div>
      )}
      {errors.map((m) => <p key={m} className="form-error" role="alert">{m}</p>)}
      <p className="muted small-text" style={{ marginBottom: 0 }}>A receipt can’t be edited once issued.</p>
    </FormModal>
  );
}
