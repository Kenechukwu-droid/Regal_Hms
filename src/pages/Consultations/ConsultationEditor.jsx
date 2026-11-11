import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import AllergyBanner from '../../components/patients/AllergyBanner';
import AssessmentSection from '../../components/consultations/AssessmentSection';
import DiagnosisPlanSection from '../../components/consultations/DiagnosisPlanSection';
import PatientContext from '../../components/consultations/PatientContext';
import Addenda from '../../components/consultations/Addenda';
import { BP_PATTERN, REQUIRED, fmtDateTime } from '../../components/consultations/constants';
import { clinicianName } from '../../components/appointments/constants';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function ConsultationEditor() {
  const { id } = useParams();
  const { role } = useRole();
  const [f, setF] = useState(undefined);          // undefined = loading, null = not found
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setF(undefined); setDirty(false); setMsg('');
    api.getConsultation(id).then(setF).catch(() => setF(null));
  }, [id]);

  const patientId = f?.patientId;
  useEffect(() => {
    if (!patientId) return;
    api.getPatient(patientId).then(setProfile);
    api.getConsultations({ patientId }).then((l) => setHistory(l.filter((x) => x.id !== id)));
  }, [patientId, id]);

  // Warn before closing the tab with unsaved work
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const nav = useNavigate();
  const [plan, setPlan] = useState(undefined); // undefined = n/a or checking, null = none yet
  const proceeds = f?.status === 'Completed' && f?.nextStep === 'Proceed to surgical planning';
  useEffect(() => {
    if (!proceeds) { setPlan(undefined); return; }
    api.getPlanByConsultation(f.id).then(setPlan).catch(() => setPlan(null));
  }, [proceeds, f?.id]); // eslint-disable-line

  if (f === undefined) return <p className="empty">Loading consultation…</p>;
  if (f === null) return <p className="empty">Consultation not found. <Link to="/consultations">Back to consultations</Link></p>;

  const locked = f.status === 'Completed';
  const can = {
    assess: !locked && ['director', 'surgeon', 'nurse'].includes(role),   // vitals, complaint, history
    clinical: !locked && ['director', 'surgeon'].includes(role),          // exam, diagnosis, plan, notes
  };
  const change = (patch) => { setF((p) => ({ ...p, ...patch })); setDirty(true); setMsg(''); };
  const bind = (k) => ({ value: f[k], onChange: (e) => change({ [k]: e.target.value }) });

  const missing = REQUIRED.filter(([k]) => !String(f[k]).trim()).map(([, label]) => label);
  if (f.vitals.bp && !BP_PATTERN.test(f.vitals.bp)) missing.push('blood pressure in the form 120/80');

  const saveDraft = async () => {
    setSaving(true);
    try {
      const saved = await api.saveConsultation(f);
      setF(saved); setDirty(false);
      setMsg(`Draft saved at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`);
    } catch { setMsg('Couldn’t save. Check the connection and try again.'); }
    setSaving(false);
  };
  const complete = async () => {
    const done = await api.completeConsultation(f, clinicianName(f.clinicianId));
    setF(done); setDirty(false); setMsg('Consultation completed and locked.');
  };
  const addAddendum = async (text) => setF(await api.addAddendum(f.id, text, ROLES[role]));

  return (
    <>
      <Link to="/consultations" className="back"><ArrowLeft size={16} aria-hidden /> Consultations</Link>
      <div className="profile-head">
        <div>
          <h1>{f.type}: <Link className="plink h1link" to={`/patients/${f.patientId}`}>{f.patient}</Link></h1>
          <p className="muted">{f.date} · {clinicianName(f.clinicianId)} · {f.id}</p>
        </div>
        <div className="spacer" /><StatusBadge value={f.status} />
      </div>
      {profile && <AllergyBanner allergies={profile.allergies} recorded={profile.allergiesRecorded} />}
      {locked && <p className="locked-note">Completed {fmtDateTime(f.completedAt)} by {f.completedBy}. This record is locked; use addenda to add or correct anything.</p>}
      {proceeds && plan !== undefined && ['director', 'surgeon'].includes(role) && (
        <p><button className="btn primary" onClick={async () => nav(`/surgical-planning/${(plan || await api.startPlan(f.id)).id}`)}>
          {plan ? 'Open surgical plan' : 'Start surgical planning'}</button></p>
      )}
      {!locked && !can.clinical && can.assess && <p className="locked-note">You can record vitals, complaint and history. Examination, diagnosis and plan are for the surgeon.</p>}

      <div className="grid two">
        <div className="grid">
          <AssessmentSection f={f} change={change} bind={bind} can={can} />
          <DiagnosisPlanSection f={f} change={change} bind={bind} can={can} />
          {locked && <Addenda items={f.addenda} canAdd={['director', 'surgeon'].includes(role)} onAdd={addAddendum} />}
        </div>
        <PatientContext profile={profile} history={history} />
      </div>

      {!locked && (
        <div className="savebar">
          <div className="grow" aria-live="polite">
            {dirty ? <span>Unsaved changes</span> : msg ? <span>{msg}</span> : null}
            {can.clinical && missing.length > 0 && <div className="muted">To complete, add: {missing.join(', ')}.</div>}
          </div>
          {can.assess && <button className="btn" onClick={saveDraft} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save draft'}</button>}
          {can.clinical && <button className="btn primary" disabled={missing.length > 0} onClick={() => setCompleting(true)}>Complete consultation</button>}
        </div>
      )}

      {completing && (
        <FormModal title="Complete consultation" submitLabel="Complete and lock" onSubmit={complete} onClose={() => setCompleting(false)}>
          <p>This locks the record and marks the appointment as completed. Later changes can only be added as addenda.</p>
          {dirty && <p className="muted">Your unsaved changes will be saved as part of the completed record.</p>}
        </FormModal>
      )}
    </>
  );
}
