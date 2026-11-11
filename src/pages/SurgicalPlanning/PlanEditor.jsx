import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import AllergyBanner from '../../components/patients/AllergyBanner';
import PatientContext from '../../components/consultations/PatientContext';
import ReadinessCard from '../../components/planning/ReadinessCard';
import ProcedureSection from '../../components/planning/ProcedureSection';
import ChecklistSection from '../../components/planning/ChecklistSection';
import ConsentSection from '../../components/planning/ConsentSection';
import ClearanceSection from '../../components/planning/ClearanceSection';
import ConsultationSummary from '../../components/planning/ConsultationSummary';
import { clinicianName } from '../../components/appointments/constants';
import { getBlockers } from '../../utils/planning';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function PlanEditor() {
  const { id } = useParams();
  const { role } = useRole();
  const [f, setF] = useState(undefined);            // undefined = loading, null = not found
  const [profile, setProfile] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [history, setHistory] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [reasonFor, setReasonFor] = useState(null); // 'hold' | 'cancel'
  const [reason, setReason] = useState('');

  useEffect(() => { setF(undefined); setDirty(false); setMsg(''); api.getPlan(id).then(setF).catch(() => setF(null)); }, [id]);

  const patientId = f?.patientId, consultationId = f?.consultationId;
  useEffect(() => {
    if (!patientId) return;
    api.getPatient(patientId).then(setProfile);
    api.getConsultations({ patientId }).then(setHistory);
    if (consultationId) api.getConsultation(consultationId).then(setConsultation);
  }, [patientId, consultationId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (f === undefined) return <p className="empty">Loading surgical plan…</p>;
  if (f === null) return <p className="empty">Plan not found. <Link to="/surgical-planning">Back to surgical planning</Link></p>;

  const cancelled = f.status === 'Cancelled';
  const actor = ROLES[role];
  const can = {
    checklist: !cancelled && ['director', 'surgeon', 'nurse'].includes(role),
    surgeon: !cancelled && ['director', 'surgeon'].includes(role),
  };
  const change = (patch) => { setF((p) => ({ ...p, ...patch })); setDirty(true); setMsg(''); };
  const bind = (k) => ({ value: f[k], onChange: (e) => change({ [k]: e.target.value }) });
  const blockers = getBlockers(f);

  // A "Ready" plan that picks up a blocker (for example withdrawn consent) drops back to Planning.
  const persist = async (patch = {}) => {
    setSaving(true);
    try {
      let next = { ...f, ...patch };
      const reverted = next.status === 'Ready' && getBlockers(next).length > 0;
      if (reverted) next = { ...next, status: 'Planning', readyAt: null };
      const saved = await api.savePlan(next);
      setF(saved); setDirty(false);
      setMsg(reverted ? 'Saved. The plan went back to Planning because something is no longer in place.' : 'Saved.');
    } catch { setMsg('Couldn’t save. Check the connection and try again.'); }
    setSaving(false);
  };
  const markReady = () => persist({ status: 'Ready', readyAt: new Date().toISOString() });

  const submitReason = async () => {
    const next = { ...f, status: reasonFor === 'hold' ? 'On hold' : 'Cancelled', holdReason: reason.trim() };
    setF(await api.savePlan(next)); setDirty(false);
  };

  return (
    <>
      <Link to="/surgical-planning" className="back"><ArrowLeft size={16} aria-hidden /> Surgical planning</Link>
      <div className="profile-head">
        <div>
          <h1>{f.procedure || 'Surgical plan'}: <Link className="plink h1link" to={`/patients/${f.patientId}`}>{f.patient}</Link></h1>
          <p className="muted">{clinicianName(f.surgeonId)} · {f.id}{f.diagnosis && ` · ${f.diagnosis}`}</p>
        </div>
        <div className="spacer" /><StatusBadge value={f.status} />
      </div>
      {profile && <AllergyBanner allergies={profile.allergies} recorded={profile.allergiesRecorded} />}
      {f.status === 'On hold' && <p className="locked-note">On hold: {f.holdReason || 'no reason recorded'}.</p>}
      {cancelled && <p className="locked-note">Cancelled: {f.holdReason || 'no reason recorded'}. This plan can no longer be edited.</p>}
      {f.status === 'Ready' && <p className="locked-note ok">Ready for surgery. <Link className="plink" to={`/surgery?plan=${f.id}`}>Schedule surgery</Link></p>}
      {!can.surgeon && can.checklist && <p className="locked-note">You can update the pre-op checklist. Procedure, consent and clearance are for the surgeon.</p>}

      <div className="grid two">
        <div className="grid">
          <ReadinessCard plan={f} />
          <ProcedureSection f={f} change={change} bind={bind} can={can} />
          <ChecklistSection f={f} change={change} can={can} actor={actor} />
          <ConsentSection f={f} change={change} can={can} />
          <ClearanceSection f={f} change={change} can={can} actor={actor} />
        </div>
        <PatientContext profile={profile} history={history} extra={<ConsultationSummary consultation={consultation} />} />
      </div>

      {!cancelled && (
        <div className="savebar">
          <div className="grow" aria-live="polite">{dirty ? 'Unsaved changes' : msg}</div>
          {can.surgeon && f.status !== 'On hold' && <button className="btn danger-text" onClick={() => { setReason(''); setReasonFor('hold'); }}>Put on hold</button>}
          {can.surgeon && <button className="btn danger-text" onClick={() => { setReason(''); setReasonFor('cancel'); }}>Cancel plan</button>}
          {f.status === 'On hold' && can.surgeon && <button className="btn" onClick={() => persist({ status: 'Planning', holdReason: '' })}>Resume planning</button>}
          {can.checklist && <button className="btn" onClick={() => persist()} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>}
          {can.surgeon && f.status === 'Planning' && (
            <button className="btn primary" onClick={markReady} disabled={blockers.length > 0 || saving} title={blockers.length ? 'Resolve the items listed under Readiness first' : ''}>Mark ready for surgery</button>
          )}
        </div>
      )}

      {reasonFor && (
        <FormModal title={reasonFor === 'hold' ? 'Put plan on hold' : 'Cancel surgical plan'} submitLabel={reasonFor === 'hold' ? 'Put on hold' : 'Cancel plan'}
          canSubmit={reason.trim().length > 0} onSubmit={submitReason} onClose={() => setReasonFor(null)}>
          <div className="field"><label htmlFor="why">Reason</label>
            <textarea id="why" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
          {reasonFor === 'cancel' && <p className="muted">A cancelled plan is kept on the record but can’t be reopened. Start a new plan if surgery goes ahead later.</p>}
        </FormModal>
      )}
    </>
  );
}
