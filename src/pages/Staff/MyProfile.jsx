import { useEffect, useState } from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { deptLabel } from '../../utils/departments';
import { api } from '../../services/api';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);
  const [error, setError] = useState('');
  useEffect(() => { api.getMyProfile().then(setProfile).catch(e => setError(e.message)); }, []);
  return <>
    <PageHeader title="My staff profile" subtitle="Your registered staff details and HMS account information." />
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="card profile-card">
      <div className="profile-hero"><div className="profile-avatar">{initials(profile?.name) || <UserRound />}</div><div><h2>{profile?.name}</h2><p>{profile?.title || ROLES[profile?.role]}</p><span className="badge ok"><ShieldCheck size={13} /> Active HMS profile</span></div></div>
      <div className="profile-details">
        <div><span>Staff ID</span><b>{profile?.staffId || '—'}</b></div>
        <div><span>Full name</span><b>{profile?.name || '—'}</b></div>
        <div><span>Job title</span><b>{profile?.title || '—'}</b></div>
        <div><span>Access role</span><b>{ROLES[profile?.role] || '—'}</b></div>
        <div><span>Department</span><b>{deptLabel(profile?.department) || 'Management'}</b></div>
        <div><span>Department head</span><b>{profile?.isHead ? 'Yes' : 'No'}</b></div>
        <div><span>Email</span><b>{profile?.email || '—'}</b></div>
        <div><span>Phone</span><b>{profile?.phone || '—'}</b></div>
        <div><span>Employment start</span><b>{profile?.joined || '—'}</b></div>
        {profile?.licenceNo && <div><span>Professional licence</span><b>{profile.licenceNo}</b></div>}
      </div>
      <p className="muted small-text profile-note">For changes to your name, role, department, contact details or professional licence, contact the Staff Administrator. Your profile is linked to your personal HMS sign-in account.</p>
    </section>
  </>;
}
