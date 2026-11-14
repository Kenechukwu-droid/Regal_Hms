import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { PackagePlus, Pill } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import KpiCard from '../../components/dashboard/KpiCard';
import RxForm from '../../components/pharmacy/RxForm';
import { ReceiveForm } from '../../components/pharmacy/StockForms';
import { fmtDateTime } from '../../components/aftercare/constants';
import { clinicianName } from '../../components/appointments/constants';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { batchState, expiredStock, nearestExpiry, rxStatus, stockState, usableStock } from '../../utils/pharmacy';
import { api } from '../../services/api';

export default function Pharmacy() {
  const { user } = useAuth();
  const role = user.role;
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const patientFilter = params.get('patient');
  const [tab, setTab] = useState('Prescriptions');
  const [rxs, setRxs] = useState(null);
  const [meds, setMeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [show, setShow] = useState('To dispense');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);   // 'rx' | 'receive'
  const [recipients, setRecipients] = useState([]);
  const prescribe = ['director', 'surgeon', 'pharmacist'].includes(role);
  const fromPharmacy = role === 'pharmacist';
  const stockRole = ['director', 'nurse', 'pharmacist'].includes(role);

  const load = useCallback(() => {
    api.getPrescriptions({ patientId: patientFilter }).then(setRxs);
    api.getMedications().then(setMeds);
  }, [patientFilter]);
  useEffect(load, [load]);
  useEffect(() => { api.getPatients().then(setPatients); }, []);
  // A pharmacist sends prescriptions to surgeons and nurses
  useEffect(() => { if (fromPharmacy) api.getColleagues().then((all) => setRecipients(all.filter((p) => ['surgeon', 'nurse'].includes(p.role) && p.id !== user.staffId))); }, [fromPharmacy, user.staffId]);

  const sentToMe = (rxs || []).filter((r) => r.sentToId === user.staffId && !r.cancelledAt);
  const waitingForMe = sentToMe.filter((r) => !r.receipt).length;
  const stats = useMemo(() => ({
    toDispense: (rxs || []).filter((r) => ['Pending', 'Part-dispensed'].includes(rxStatus(r))).length,
    lowOrOut: meds.filter((m) => stockState(m) !== 'OK').length,
    expiry: meds.filter((m) => m.batches.some((b) => b.qty > 0 && batchState(b) !== 'OK')).length,
  }), [rxs, meds]);

  if (rxs === null) return <p className="empty">Loading pharmacy…</p>;
  const match = (s) => s.toLowerCase().includes(q.toLowerCase());
  const tabs = sentToMe.length > 0 ? ['Prescriptions', 'Sent to me', 'Stock'] : ['Prescriptions', 'Stock'];
  const rxRows = (tab === 'Sent to me' ? sentToMe : rxs).filter((r) => { const st = rxStatus(r); if (tab === 'Sent to me') return match(`${r.patient} ${r.lines.map((l) => l.name).join(' ')}`);
    return (show === 'All' || (show === 'To dispense' ? ['Pending', 'Part-dispensed'].includes(st) : st === show)) && match(`${r.patient} ${r.lines.map((l) => l.name).join(' ')}`); });
  const medRows = meds.filter((m) => match(`${m.name} ${m.class}`));

  return (
    <>
      <PageHeader title="Pharmacy" subtitle={fromPharmacy ? 'Write prescriptions and send them to a surgeon or nurse, dispense, and keep the stock. Expired stock is never dispensed.' : 'Prescriptions to dispense and the stock behind them. Expired stock is never dispensed.'}
        action={<div className="actions" style={{ margin: 0 }}>
          {stockRole && tab === 'Stock' && <button className="btn" onClick={() => setForm('receive')}><PackagePlus size={16} aria-hidden /> Receive stock</button>}
          {prescribe && <button className="btn primary" onClick={() => setForm('rx')}><Pill size={16} aria-hidden /> New prescription</button>}
        </div>} />
      {patientFilter && <p className="filter-chip">Showing one patient only. <button className="linklike" onClick={() => setParams({})}>Show everyone</button></p>}
      <div className="grid kpis">
        <KpiCard label="To dispense" value={stats.toDispense} note={stats.toDispense ? 'Prescriptions waiting' : 'Nothing waiting'} />
        <KpiCard label="Low or out of stock" value={stats.lowOrOut} note={stats.lowOrOut ? 'Reorder these' : 'Stock levels are fine'} />
        <KpiCard label="Expired or expiring" value={stats.expiry} note={`Within 90 days or already past`} />
      </div>

      <div className="tabs" role="tablist">{tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Sent to me' && waitingForMe > 0 ? ` (${waitingForMe})` : ''}</button>)}</div>
      <div className="toolbar">
        <input className="search" placeholder={tab === 'Stock' ? 'Search medicine or type' : 'Search patient or medicine'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search pharmacy" />
        {tab === 'Prescriptions' && <select className="role-filter" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show">
          <option>To dispense</option><option>Dispensed</option><option>Cancelled</option><option>All</option></select>}
      </div>

      <div className="card table-wrap">
        {tab !== 'Stock' ? (rxRows.length === 0 ? <p className="empty">{rxs.length === 0 ? 'No prescriptions yet.' : 'No prescriptions match. Clear the search or change the filter.'}</p> : (
          <table>
            <thead><tr><th>Prescription</th><th>Patient</th><th>Medicines</th><th>Prescriber</th><th>Written</th><th>Status</th></tr></thead>
            <tbody>{rxRows.map((r) => (
              <tr key={r.id}>
                <td><Link className="plink" to={`/pharmacy/prescriptions/${r.id}`}>{r.id}</Link></td><td>{r.patient}</td>
                <td>{r.lines.map((l) => l.name.split(' ')[0]).join(', ')}{r.lines.some((l) => l.controlled) && <span className="badge bad" style={{ marginLeft: 6 }}>Controlled</span>}</td>
                <td>{r.prescriberName || clinicianName(r.prescriberId)}{r.sentToName && <div className="muted small-text">Sent to {r.sentToName}</div>}</td><td>{fmtDateTime(r.createdAt)}</td>
                <td><StatusBadge value={rxStatus(r)} />{r.sentToId && !r.cancelledAt && <div className="small-text">{r.receipt ? `${r.receipt.state} by ${r.receiptByName}` : 'Waiting for a reply'}</div>}</td>
              </tr>))}
            </tbody>
          </table>
        )) : (medRows.length === 0 ? <p className="empty">No medicines match.</p> : (
          <table>
            <thead><tr><th>Medicine</th><th>Type</th><th className="num">In date</th><th className="num">Reorder at</th><th>Nearest expiry</th><th>Status</th></tr></thead>
            <tbody>{medRows.map((m) => (
              <tr key={m.id}>
                <td><Link className="plink" to={`/pharmacy/items/${m.id}`}>{m.name}</Link>{m.controlled && <span className="badge bad" style={{ marginLeft: 6 }}>Controlled</span>}</td>
                <td>{m.class}</td><td className="num">{usableStock(m)}</td><td className="num">{m.reorderLevel}</td><td>{nearestExpiry(m) || '—'}</td>
                <td><StatusBadge value={stockState(m)} />{expiredStock(m) > 0 && <span className="badge bad" style={{ marginLeft: 6 }}>{expiredStock(m)} expired</span>}</td>
              </tr>))}
            </tbody>
          </table>
        ))}
      </div>

      {form === 'rx' && <RxForm patients={patients} meds={meds} initialPatientId={patientFilter || ''} by={ROLES[role]} recipients={fromPharmacy ? recipients : null}
        onSave={async (b) => { const made = await api.createPrescription(b); nav(`/pharmacy/prescriptions/${made.id}`); }} onClose={() => setForm(null)} />}
      {form === 'receive' && <ReceiveForm meds={meds} onSave={async (b) => { await api.receiveStock(b, ROLES[role]); load(); }} onClose={() => setForm(null)} />}
    </>
  );
}
