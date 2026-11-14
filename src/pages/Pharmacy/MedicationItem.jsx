import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { ReceiveForm, AdjustForm } from '../../components/pharmacy/StockForms';
import { fmtDateTime } from '../../components/aftercare/constants';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { batchState, expiredStock, stockState, usableStock } from '../../utils/pharmacy';
import { api } from '../../services/api';

export default function MedicationItem() {
  const { id } = useParams();
  const { role } = useRole();
  const [d, setD] = useState(undefined);            // undefined = loading, null = not found
  const [form, setForm] = useState(null);           // 'receive' | { adjust: batch }
  const [err, setErr] = useState('');
  const canStock = ['director', 'nurse', 'pharmacist'].includes(role);
  const by = ROLES[role];

  const load = () => api.getMedication(id).then(setD).catch(() => setD(null));
  useEffect(() => { setD(undefined); load(); }, [id]); // eslint-disable-line

  if (d === undefined) return <p className="empty">Loading medicine…</p>;
  if (d === null) return <p className="empty">Medicine not found. <Link to="/pharmacy">Back to pharmacy</Link></p>;
  const { item, movements } = d;
  const tone = { Expired: 'bad', Expiring: 'warn', OK: 'ok' };

  const writeOff = async () => { setErr(''); try { await api.writeOffExpired(item.id, by); load(); } catch (e) { setErr(e.message); } };

  return (
    <>
      <Link to="/pharmacy" className="back"><ArrowLeft size={16} aria-hidden /> Pharmacy</Link>
      <div className="profile-head">
        <div><h1>{item.name}</h1><p className="muted">{item.class} · counted in {item.unit}s{item.controlled && ' · controlled medicine'}</p></div>
        <div className="spacer" /><StatusBadge value={stockState(item)} />
      </div>
      {err && <p className="form-error" role="alert">{err}</p>}
      <div className="grid two">
        <section className="card">
          <div className="section-head"><h2>Batches</h2>
            <div className="actions" style={{ margin: 0 }}>
              {canStock && expiredStock(item) > 0 && <button className="btn small danger-text" onClick={writeOff}>Write off {expiredStock(item)} expired</button>}
              {canStock && <button className="btn small" onClick={() => setForm('receive')}>Receive stock</button>}
            </div></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Batch</th><th>Expiry</th><th className="num">Quantity</th><th>State</th><th /></tr></thead>
            <tbody>{[...item.batches].sort((a, b) => a.expiry.localeCompare(b.expiry)).map((b) => {
              const st = batchState(b);
              return (
                <tr key={b.batchNo}><td>{b.batchNo}</td><td>{b.expiry}</td><td className="num">{b.qty}</td>
                  <td><span className={`badge ${tone[st]}`}>{st === 'OK' ? 'In date' : st}</span></td>
                  <td>{canStock && <button className="btn small" onClick={() => setForm({ adjust: b })}>Adjust</button>}</td></tr>);
            })}</tbody>
          </table></div>
        </section>
        <section className="card"><h2>Stock level</h2>
          <dl className="facts"><dt>In date</dt><dd>{usableStock(item)} {item.unit}s</dd><dt>Reorder at</dt><dd>{item.reorderLevel}</dd><dt>Expired</dt><dd>{expiredStock(item)}</dd></dl></section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Stock movements</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>When</th><th>What</th><th className="num">Qty</th><th>Batch</th><th>By</th><th>Note</th></tr></thead>
          <tbody>{movements.map((m) => (
            <tr key={m.id}><td>{fmtDateTime(m.at)}</td><td>{m.type}</td><td className="num">{m.qty > 0 ? `+${m.qty}` : m.qty}</td><td>{m.batchNo}</td><td>{m.by}</td>
              <td className="muted">{m.note}{m.ref && <> · <Link className="plink" to={`/pharmacy/prescriptions/${m.ref}`}>{m.ref}</Link></>}</td></tr>))}</tbody>
        </table></div>
      </section>

      {form === 'receive' && <ReceiveForm meds={[item]} item={item} onSave={async (b) => { await api.receiveStock(b, by); load(); }} onClose={() => setForm(null)} />}
      {form?.adjust && <AdjustForm item={item} batch={form.adjust} onSave={async (b) => { await api.adjustStock(b, by); load(); }} onClose={() => setForm(null)} />}
    </>
  );
}
