import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import AllergyBanner from '../../components/patients/AllergyBanner';
import DispenseForm from '../../components/pharmacy/DispenseForm';
import { fmtDateTime } from '../../components/aftercare/constants';
import { clinicianName } from '../../components/appointments/constants';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { RX_REPLIES, RX_REPLY_KEYS, allergyConflict, remaining, rxBlocked, rxStatus, usableStock } from '../../utils/pharmacy';
import { api } from '../../services/api';

export default function PrescriptionView() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = user.role;
  const [rx, setRx] = useState(undefined);          // undefined = loading, null = not found
  const [meds, setMeds] = useState([]);
  const [profile, setProfile] = useState(null);
  const [dispensing, setDispensing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [responding, setResponding] = useState(null);   // the reply being written: approve | act | return | decline
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const load = () => api.getPrescription(id).then((x) => setRx(x)).catch(() => setRx(null));
  useEffect(() => { setRx(undefined); load(); api.getMedications().then(setMeds); }, [id]); // eslint-disable-line
  const patientId = rx?.patientId;
  useEffect(() => { if (patientId) api.getPatient(patientId).then(setProfile); }, [patientId]);

  if (rx === undefined) return <p className="empty">Loading prescription…</p>;
  if (rx === null) return <p className="empty">Prescription not found. <Link to="/pharmacy">Back to pharmacy</Link></p>;

  const status = rxStatus(rx);
  const allergies = profile?.allergies ?? [];
  const canDispense = ['director', 'nurse', 'pharmacist'].includes(role) && ['Pending', 'Part-dispensed'].includes(status) && meds.length > 0 && !rxBlocked(rx);
  const canCancel = (['director', 'surgeon'].includes(role) || (role === 'pharmacist' && rx.createdById === user.staffId)) && status === 'Pending';
  const mustRespond = rx.sentToId === user.staffId && !rx.receipt;
  const respond = (action) => async () => { setErr(''); try { setRx(await api.respondPrescription(rx.id, { action, note })); setResponding(null); setNote(''); } catch (e) { setErr(e.message); } };
  const reply = responding ? RX_REPLIES[responding] : null;
  const medOf = (mid) => meds.find((m) => m.id === mid);

  return (
    <>
      <Link to="/pharmacy" className="back"><ArrowLeft size={16} aria-hidden /> Pharmacy</Link>
      <div className="profile-head">
        <div>
          <h1>{rx.id}: <Link className="plink h1link" to={`/patients/${rx.patientId}`}>{rx.patient}</Link></h1>
          <p className="muted">Prescribed by {rx.prescriberName || clinicianName(rx.prescriberId)} · {fmtDateTime(rx.createdAt)}{rx.source !== 'Manual' && ` · from ${rx.source}`}</p>
        </div>
        <div className="spacer" /><StatusBadge value={status} />
      </div>
      {profile && <AllergyBanner allergies={allergies} recorded={profile.allergiesRecorded} />}
      {rx.allergyOverride && <p className="locked-note"><b>Allergy override ({rx.allergyOverride.allergen})</b> by {rx.allergyOverride.by}: {rx.allergyOverride.reason}</p>}
      {rx.sentToId && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2>{mustRespond ? 'Sent to you: reply with the action taken' : `Sent to ${rx.sentToId === user.staffId ? 'you' : rx.sentToName}`}</h2>
          <p className="muted">{rx.prescriberName} sent this to {rx.sentToId === user.staffId ? 'you' : `${rx.sentToName} (${rx.sentToRole === 'surgeon' ? 'surgeon' : 'nurse'})`} on {fmtDateTime(rx.sentAt)}.</p>
          {rx.receipt
            ? <p className={rxBlocked(rx) ? 'form-error' : ''}><b>{rx.receipt.state}</b> by {rx.receiptByName} on {fmtDateTime(rx.receipt.at)}{rx.receipt.note && `: ${rx.receipt.note}`}</p>
            : <p><b>Waiting for a reply.</b></p>}
          {mustRespond && !responding && !rx.cancelledAt && (
            <div className="actions">{RX_REPLY_KEYS.map((k) => (
              <button key={k} className={`btn ${k === 'approve' ? 'primary' : k === 'decline' ? 'danger-text' : ''}`} title={RX_REPLIES[k].hint}
                onClick={() => { setNote(''); setErr(''); setResponding(k); }}>{RX_REPLIES[k].label}</button>))}</div>)}
          {mustRespond && reply && (
            <><p className="muted small-text">{reply.hint}</p>
              <div className="field"><label htmlFor="rt">{reply.prompt}</label><textarea id="rt" rows={2} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></div>
              {err && <p className="form-error" role="alert">{err}</p>}
              <div className="actions"><button className="btn" onClick={() => setResponding(null)}>Back</button>
                <button className="btn primary" disabled={reply.needsNote && !note.trim()} onClick={respond(responding)}>{reply.label}</button></div></>)}
          {err && !responding && <p className="form-error" role="alert">{err}</p>}
        </section>)}
      {rx.cancelledAt && <p className="locked-note">Cancelled {fmtDateTime(rx.cancelledAt)}: {rx.cancelReason}.</p>}
      {rx.notes && <p className="locked-note">Note for the pharmacy: {rx.notes}</p>}

      <section className="card" style={{ marginBottom: 16 }}>
        <h2>Medicines</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Medicine</th><th>Directions</th><th className="num">Prescribed</th><th className="num">Dispensed</th><th className="num">In stock</th></tr></thead>
          <tbody>{rx.lines.map((l) => {
            const m = medOf(l.itemId); const clash = m && allergyConflict(m, allergies);
            return (
              <tr key={l.itemId}>
                <td>{l.name}{l.controlled && <span className="badge bad" style={{ marginLeft: 6 }}>Controlled</span>}
                  {clash && !rx.allergyOverride && <div className="form-error small-text">Conflicts with {clash} allergy</div>}</td>
                <td>{l.dose}, {l.frequency.toLowerCase()} for {l.days} days</td>
                <td className="num">{l.qty}</td><td className="num">{l.dispensedQty}{remaining(l) > 0 && l.dispensedQty > 0 ? ` (${remaining(l)} left)` : ''}</td>
                <td className="num">{m ? <span className={usableStock(m) < remaining(l) ? 'form-error' : ''}>{usableStock(m)}</span> : '—'}</td>
              </tr>);
          })}</tbody>
        </table></div>
        <div className="actions">
          {canDispense && <button className="btn primary" onClick={() => setDispensing(true)}>Dispense</button>}
          {canCancel && <button className="btn danger-text" onClick={() => { setReason(''); setCancelling(true); }}>Cancel prescription</button>}
        </div>
      </section>

      <section className="card">
        <h2>Dispensing record</h2>
        {rx.dispensings.length === 0 ? <p className="muted">Nothing dispensed yet.</p> : (
          <ul className="list">{rx.dispensings.map((d) => (
            <li key={d.id}><div><div className="muted">{fmtDateTime(d.at)} · {d.by}{d.witness && ` · witness: ${d.witness}`}</div>
              {d.lines.map((l) => <div key={l.itemId}>{l.qty} × {l.name} <span className="muted">(batch {l.batches.map((b) => `${b.batchNo}: ${b.qty}`).join(', ')})</span></div>)}</div></li>))}
          </ul>)}
      </section>

      {dispensing && <DispenseForm rx={rx} meds={meds} allergies={allergies} onClose={() => setDispensing(false)}
        onSave={async (b) => { setRx(await api.dispensePrescription(rx.id, b, ROLES[role])); api.getMedications().then(setMeds); }} />}
      {cancelling && (
        <FormModal title="Cancel prescription" submitLabel="Cancel prescription" canSubmit={reason.trim().length > 0} onClose={() => setCancelling(false)}
          onSubmit={async () => setRx(await api.cancelPrescription(rx.id, reason))}>
          <div className="field"><label htmlFor="cx">Reason</label><textarea id="cx" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
        </FormModal>)}
    </>
  );
}
