import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import AllergyBanner from '../../components/patients/AllergyBanner';
import ProfileOverview from '../../components/patients/ProfileOverview';
import MedicalHistory from '../../components/patients/MedicalHistory';
import PatientTimeline from '../../components/patients/PatientTimeline';
import { useEffect } from 'react';
import { api } from '../../services/api';

const TABS = ['Overview', 'Medical history', 'Timeline'];

export default function PatientProfile() {
  const { id } = useParams();
  const [p, setP] = useState(undefined); // undefined = loading, null = not found
  const [tab, setTab] = useState('Overview');

  useEffect(() => { setP(undefined); api.getPatient(id).then(setP).catch(() => setP(null)); }, [id]);

  // Each handler calls the API first, then updates the screen with what the server returned.
  const upsert = (key) => (list, saved) => (list.some((x) => x.id === saved.id) ? list.map((x) => (x.id === saved.id ? saved : x)) : [...list, saved]);
  const handlers = {
    saveAllergy: async (a) => {
      const saved = await api.saveAllergy(id, a);
      setP((prev) => ({ ...prev, allergiesRecorded: true, allergies: upsert()(prev.allergies, saved) }));
    },
    deleteAllergy: async (aid) => {
      await api.deleteAllergy(id, aid);
      setP((prev) => ({ ...prev, allergies: prev.allergies.filter((x) => x.id !== aid) }));
    },
    saveCondition: async (c) => {
      const saved = await api.saveCondition(id, c);
      setP((prev) => ({ ...prev, conditions: upsert()(prev.conditions, saved) }));
    },
    deleteCondition: async (cid) => {
      await api.deleteCondition(id, cid);
      setP((prev) => ({ ...prev, conditions: prev.conditions.filter((x) => x.id !== cid) }));
    },
    confirmNoAllergies: async () => {
      await api.confirmNoKnownAllergies(id);
      setP((prev) => ({ ...prev, allergiesRecorded: true }));
    },
  };

  if (p === undefined) return <p className="empty">Loading profile…</p>;
  if (p === null) return <p className="empty">No patient with ID {id}. <Link to="/patients">Back to patients</Link></p>;

  return (
    <>
      <Link to="/patients" className="back"><ArrowLeft size={16} aria-hidden /> Patients</Link>
      <div className="profile-head">
        <div className="avatar" aria-hidden>{p.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
        <div>
          <h1>{p.name}</h1>
          <p className="muted">{p.id} · {p.age} years · {p.procedure}</p>
        </div>
        <div className="spacer" /><StatusBadge value={p.stage} />
      </div>
      <AllergyBanner allergies={p.allergies} recorded={p.allergiesRecorded} />
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Overview' && <ProfileOverview p={p} />}
      {tab === 'Medical history' && <MedicalHistory p={p} handlers={handlers} />}
      {tab === 'Timeline' && <section className="card"><PatientTimeline events={p.timeline} /></section>}
    </>
  );
}
