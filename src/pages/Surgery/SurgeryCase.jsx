import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import AllergyBanner from '../../components/patients/AllergyBanner';
import SafetyChecks from '../../components/surgery/SafetyChecks';
import ScheduleForm from '../../components/surgery/ScheduleForm';
import { fmtTime, theatreName } from '../../components/surgery/constants';
import { clinicianName } from '../../components/appointments/constants';
import { getBlockers } from '../../utils/planning';
import { minToTime, timeToMin } from '../../utils/dates';
import { surgeryEnd } from '../../utils/theatre';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function SurgeryCase() {
  const { id } = useParams();
  const { role } = useRole();
  const [s, setS] = useState(undefined);              // undefined = loading, null = not found
  const [plan, setPlan] = useState(null);
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState({ anaesthetist: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reasonFor, setReasonFor] = useState(null);   // 'postpone' | 'cancel'
  const [reason, setReason] = useState('');
  const [resched, setResched] = useState(false);
  const [aftercare, setAftercare] = useState(null);

  const apply = (c) => { setS(c); setDraft({ anaesthetist: c.anaesthetist, notes: c.notes }); };
  useEffect(() => { setS(undefined); api.getSurgery(id).then((c) => (c ? apply(c) : setS(null))).catch(() => setS(null)); }, [id]);

  const planId = s?.planId, patientId = s?.patientId;
  useEffect(() => {
    if (planId) api.getPlan(planId).then(setPlan);
    if (patientId) api.getPatient(patientId).then(setProfile);
  }, [planId, patientId]);

  const status = s?.status;
  useEffect(() => { if (status === 'Completed') api.getAftercareBySurgery(id).then(setAftercare).catch(() => {}); }, [id, status]);

  if (s === undefined) return <p className="empty">Loading case…</p>;
  if (s === null) return <p className="empty">Case not found. <Link to="/surgery">Back to surgery</Link></p>;

  const staff = ['director', 'surgeon', 'nurse'].includes(role);
  const lead = ['director', 'surgeon'].includes(role);
  const closed = ['Completed', 'Cancelled'].includes(s.status);
  const blockers = plan ? getBlockers(plan) : [];
  const allSafe = s.safety.signIn && s.safety.timeOut && s.safety.signOut;

  // Notes typed in the box travel with every action, so nothing is lost when the status changes.
  const act = async (patch) => {
    setBusy(true); setErr('');
    try { apply(await api.saveSurgery({ ...s, ...draft, ...patch })); }
    catch (e) { setErr(`That change was refused. ${e.message}`); }
    setBusy(false);
  };
  const confirmStep = (key) => act({ safety: { ...s.safety, [key]: { by: ROLES[role], at: new Date().toISOString() } } });
  const submitReason = async () => {
    apply(await api.saveSurgery({ ...s, ...draft, status: reasonFor === 'postpone' ? 'Postponed' : 'Cancelled', reason: reason.trim() }));
  };
  const reschedule = async (next) => apply(await api.saveSurgery({ ...next, ...draft }));
  const notesChanged = draft.anaesthetist !== s.anaesthetist || draft.notes !== s.notes;

  return (
    <>
      <Link to="/surgery" className="back"><ArrowLeft size={16} aria-hidden /> Surgery & theatre</Link>
      <div className="profile-head">
        <div>
          <h1>{s.procedure}: <Link className="plink h1link" to={`/patients/${s.patientId}`}>{s.patient}</Link></h1>
          <p className="muted">{s.date} · {s.start} to {minToTime(surgeryEnd(s))} · {theatreName(s.theatreId)} · {clinicianName(s.surgeonId)} · {s.id}</p>
        </div>
        <div className="spacer" /><StatusBadge value={s.status} />
      </div>
      {profile && <AllergyBanner allergies={profile.allergies} recorded={profile.allergiesRecorded} />}
      {blockers.length > 0 && !closed && ['Scheduled', 'Postponed'].includes(s.status) && (
        <div className="allergy severe" role="alert">
          <div><b>Surgical plan incomplete. The patient can’t go into theatre yet.</b>
            <ul className="blockers dark">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            <Link className="plink" to={`/surgical-planning/${s.planId}`}>Open the surgical plan</Link></div>
        </div>
      )}
      {['Postponed', 'Cancelled'].includes(s.status) && <p className="locked-note">{s.status}: {s.reason || 'no reason recorded'}.</p>}
      {err && <p className="form-error" role="alert">{err}</p>}

      <div className="grid two">
        <div className="grid">
          <SafetyChecks surgery={s} canConfirm={staff && !closed} onConfirm={confirmStep} busy={busy} />
          <section className="card">
            <h2>Case notes</h2>
            <fieldset className="plain" disabled={!staff || closed}>
              <div className="field"><label htmlFor="c-a">Anaesthetist</label>
                <input id="c-a" value={draft.anaesthetist} onChange={(e) => setDraft({ ...draft, anaesthetist: e.target.value })} /></div>
              <div className="field"><label htmlFor="c-n">Theatre notes</label>
                <textarea id="c-n" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
              {notesChanged && <button className="btn small" onClick={() => act({})} disabled={busy}>Save notes</button>}
            </fieldset>
          </section>
        </div>

        <aside className="grid ctx">
          <section className="card">
            <h2>Case progress</h2>
            <dl className="facts">
              <dt>Status</dt><dd>{s.status}</dd>
              <dt>In theatre</dt><dd>{s.inTheatreAt ? fmtTime(s.inTheatreAt) : '—'}</dd>
              <dt>To recovery</dt><dd>{s.recoveryAt ? fmtTime(s.recoveryAt) : '—'}</dd>
              <dt>Completed</dt><dd>{s.completedAt ? fmtTime(s.completedAt) : '—'}</dd>
            </dl>
            {staff && !closed && (
              <div className="actions">
                {s.status === 'Scheduled' && <button className="btn primary" disabled={busy || blockers.length > 0} onClick={() => act({ status: 'In theatre' })}>Patient in theatre</button>}
                {s.status === 'In theatre' && <button className="btn primary" disabled={busy || !allSafe} onClick={() => act({ status: 'Recovering' })}
                  title={allSafe ? '' : 'Confirm all three safety checks first'}>Move to recovery</button>}
                {s.status === 'Recovering' && <button className="btn primary" disabled={busy} onClick={() => act({ status: 'Completed' })}>Hand over to aftercare</button>}
                {s.status === 'In theatre' && !allSafe && <p className="muted">Confirm sign in, time out and sign out to move on.</p>}
              </div>
            )}
            {lead && ['Scheduled', 'Postponed'].includes(s.status) && (
              <div className="actions">
                <button className="btn" onClick={() => setResched(true)}>Reschedule</button>
                {s.status === 'Scheduled' && <button className="btn" onClick={() => { setReason(''); setReasonFor('postpone'); }}>Postpone</button>}
                <button className="btn danger-text" onClick={() => { setReason(''); setReasonFor('cancel'); }}>Cancel surgery</button>
              </div>
            )}
          </section>
          {s.status === 'Completed' && aftercare && (
            <section className="card">
              <h2>Aftercare</h2>
              <p style={{ margin: 0 }}>Handed over. <Link className="plink" to={`/aftercare/${aftercare.id}`}>Open the aftercare record</Link></p>
            </section>
          )}
          <section className="card">
            <h2>From the surgical plan</h2>
            {!plan ? <p className="muted">Loading…</p> : (
              <dl className="facts">
                <dt>Anaesthesia</dt><dd>{plan.anaesthesia || '—'}</dd>
                <dt>Admission</dt><dd>{plan.admission}</dd>
                <dt>Implants and equipment</dt><dd>{plan.equipmentNotes || 'None noted'}</dd>
                <dt>Plan</dt><dd><Link className="plink" to={`/surgical-planning/${plan.id}`}>Open plan</Link></dd>
              </dl>
            )}
          </section>
        </aside>
      </div>

      {reasonFor && (
        <FormModal title={reasonFor === 'postpone' ? 'Postpone surgery' : 'Cancel surgery'} submitLabel={reasonFor === 'postpone' ? 'Postpone' : 'Cancel surgery'}
          canSubmit={reason.trim().length > 0} onSubmit={submitReason} onClose={() => setReasonFor(null)}>
          <div className="field"><label htmlFor="why">Reason</label><textarea id="why" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
          <p className="muted">{reasonFor === 'postpone' ? 'The theatre slot is freed. Reschedule when a new time is agreed.' : 'The slot is freed and the plan can be scheduled again later.'}</p>
        </FormModal>
      )}
      {resched && <ScheduleForm item={s} plans={[]} onSave={reschedule} onClose={() => setResched(false)} />}
    </>
  );
}
