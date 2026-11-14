import { useState } from 'react';
import FormModal from '../common/FormModal';
import { addDays, todayISO } from '../../utils/dates';

export function ReceiveForm({ meds, item, onSave, onClose }) {
  const [f, setF] = useState({ itemId: item?.id ?? '', batchNo: '', expiry: '', qty: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const ok = f.itemId && f.batchNo.trim() && f.expiry > todayISO() && Number.isInteger(Number(f.qty)) && Number(f.qty) >= 1;
  return (
    <FormModal title="Receive stock" submitLabel="Add to stock" canSubmit={ok} onSubmit={() => onSave(f)} onClose={onClose}>
      <div className="field"><label htmlFor="rc-i">Medicine</label>
        <select id="rc-i" value={f.itemId} onChange={set('itemId')} disabled={!!item} autoFocus={!item}><option value="">Select…</option>{meds.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
      <div className="row3 even">
        <div className="field"><label htmlFor="rc-b">Batch number</label><input id="rc-b" value={f.batchNo} onChange={set('batchNo')} autoFocus={!!item} /></div>
        <div className="field"><label htmlFor="rc-e">Expiry</label><input id="rc-e" type="date" min={addDays(todayISO(), 1)} value={f.expiry} onChange={set('expiry')} /></div>
        <div className="field"><label htmlFor="rc-q">Quantity</label><input id="rc-q" inputMode="numeric" value={f.qty} onChange={set('qty')} /></div>
      </div>
      <p className="muted small-text">Check the batch number and expiry against the delivery note. Expired stock can’t be received.</p>
    </FormModal>
  );
}

export function AdjustForm({ item, batch, onSave, onClose }) {
  const [f, setF] = useState({ newQty: String(batch.qty), reason: '' });
  const ok = Number.isInteger(Number(f.newQty)) && Number(f.newQty) >= 0 && Number(f.newQty) !== batch.qty && f.reason.trim();
  return (
    <FormModal title={`Adjust count: batch ${batch.batchNo}`} submitLabel="Save count" canSubmit={ok}
      onSubmit={() => onSave({ itemId: item.id, batchNo: batch.batchNo, newQty: f.newQty, reason: f.reason })} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{item.name}: the system has <b>{batch.qty}</b>.</p>
      <div className="field"><label htmlFor="ad-q">Counted quantity</label><input id="ad-q" inputMode="numeric" value={f.newQty} onChange={(e) => setF({ ...f, newQty: e.target.value })} autoFocus /></div>
      <div className="field"><label htmlFor="ad-r">Reason (required)</label><textarea id="ad-r" rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Stock take difference, breakage, and so on" /></div>
    </FormModal>
  );
}
