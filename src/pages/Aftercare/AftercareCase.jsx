import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import AllergyBanner from '../../components/patients/AllergyBanner';
import ObservationForm from '../../components/aftercare/ObservationForm';
import ObservationLog from '../../components/aftercare/ObservationLog';
import FollowUpSchedule from '../../components/aftercare/FollowUpSchedule';
import { fmtDateTime } from '../../components/aftercare/constants';
import { clinicianName } from '../../components/appointments/constants';
import { daysBetween, getDischargeBlockers, unreviewed } from '../../utils/aftercare';
import { todayISO } from '../../utils/dates';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function AftercareCase() {
  const { id } = useParams();
  const { role } = useRole();
  const [r, setR] = useState(undefined);              // undefined = loading, null = not found
  const [profile, setProfile] = useState(null);
  const [adding, setAdding] = useState(false);
  const [discharging, setDischarging] = useState(false);
  const [note, setNote] = useState('');
  const by = ROLES[role];

  useEffect(() => { setR(undefined); api.getAftercare(id).then(setR).catch(() => setR(null)); }, [id]);
  const patientId = r?.patientId;
  useEffect(() => { if (patientId) api.getPatient(patientId).then(setProfile); }, [patientId]);

  if (r === undefined) return <p className="empty">Loading aftercare record…</p>;
  if (r === null) return <p className="empty">Aftercare record not found. <Link to="/aftercare">Back to aftercare</Link></p>;

  const staff = ['director', 'surgeon', 'nurse'].includes(role);
  const lead = ['director', 'surgeon'].includes(role);
  const active = r.status === 'In recovery';
  const waiting = unreviewed(r);
  const blockers = getDischargeBlockers(r);

  return (
    <>
      <Link to="/aftercare" className="back"><ArrowLeft size={16} aria-hidden /> Recovery & aftercare</Link>
      <div className="profile-head">
        <div>
          <h1>{r.procedure}: <Link className="plink h1link" to={`/patients/${r.patientId}`}>{r.patient}</Link></h1>
          <p className="muted">Day {daysBetween(r.surgeryDate, todayISO())} after surgery on {r.surgeryDate} · {clinicianName(r.surgeonId)} · {r.id}</p>
        </div>
        <div className="spacer" /><StatusBadge value={r.status} />
      </div>
      {profile && <AllergyBanner allergies={profile.allergies} recorded={profile.allergiesRecorded} />}
      {waiting.length > 0 && (
        <div className="allergy severe" role="alert">
          <div><b>{waiting.length === 1 ? 'A flagged reading needs' : `${waiting.length} flagged readings need`} clinician review.</b>
            <ul className="blockers dark">{[...new Set(waiting.flatMap((o) => o.flags))].map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
      )}

      <div className="grid two">
        <section className="card">
          <div className="section-head">
            <h2>Observations</h2>
            {staff && <button className="btn primary small" onClick={() => setAdding(true)}><Plus size={14} aria-hidden /> Record observation</button>}
          </div>
          <ObservationLog observations={r.observations} canReview={lead} onReview={async (obsId, text) => setR(await api.reviewObservation(r.id, obsId, text, by))} />
        </section>

        <aside className="grid ctx">
          <FollowUpSchedule followUps={r.followUps} surgeonId={r.surgeonId} canBook={staff} onBook={async (key, a) => setR(await api.bookFollowUp(r.id, key, a))} />
          <section className="card">
            <h2>Recovery monitoring</h2>
            {active ? (
              <>
                {blockers.length > 0
                  ? <><p className="muted" style={{ margin: 0 }}>Before discharge from monitoring:</p><ul className="blockers">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></>
                  : <p className="ok-text" style={{ marginTop: 0 }}>Ready to move to routine follow-up.</p>}
                {lead
                  ? <div className="actions"><button className="btn primary" disabled={blockers.length > 0} onClick={() => { setNote(''); setDischarging(true); }}>Discharge to routine follow-up</button></div>
                  : <p className="muted small-text">Only a surgeon or the Medical Director can discharge.</p>}
              </>
            ) : (
              <dl className="facts">
                <dt>Discharged</dt><dd>{fmtDateTime(r.dischargedAt)} by {r.dischargedBy}</dd>
                <dt>Note</dt><dd>{r.dischargeNote}</dd>
              </dl>
            )}
          </section>
          <section className="card">
            <h2>Surgery</h2>
            <dl className="facts">
              <dt>Case</dt><dd><Link className="plink" to={`/surgery/${r.surgeryId}`}>{r.surgeryId}</Link></dd>
              <dt>Handed over</dt><dd>{fmtDateTime(r.handedOverAt)}</dd>
            </dl>
          </section>
        </aside>
      </div>

      {adding && <ObservationForm onSave={async (o) => setR(await api.addObservation(r.id, o, by))} onClose={() => setAdding(false)} />}
      {discharging && (
        <FormModal title="Discharge to routine follow-up" submitLabel="Discharge" canSubmit={note.trim().length > 0}
          onSubmit={async () => setR(await api.dischargeAftercare(r.id, note, by))} onClose={() => setDischarging(false)}>
          <p style={{ marginTop: 0 }} className="muted">Active recovery monitoring stops. Remaining follow-up appointments stay on the schedule.</p>
          <div className="field"><label htmlFor="dc-n">Discharge note</label>
            <textarea id="dc-n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus placeholder="Condition at discharge and any instructions given" /></div>
        </FormModal>
      )}
    </>
  );
}
