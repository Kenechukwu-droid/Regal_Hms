import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import PasswordFields from '../../components/auth/PasswordFields';
import MfaEnrol from '../../components/auth/MfaEnrol';
import BackupCodes from '../../components/auth/BackupCodes';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

// Registration is by invitation only: the Staff Administrator adds you, then you finish here in three steps.
export default function Activate() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { adopt } = useAuth();
  const nav = useNavigate();
  const [info, setInfo] = useState(undefined);
  const [linkErr, setLinkErr] = useState('');
  const [step, setStep] = useState('password');   // password | enrol | backup
  const [pw, setPw] = useState('');
  const [ack, setAck] = useState(false);
  const [enrol, setEnrol] = useState(null);
  const [signedIn, setSignedIn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.checkToken('invite', token).then(setInfo).catch((e) => { setLinkErr(e.message); setInfo(null); }); }, [token]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { setEnrol(await api.activate({ token, password: pw, acknowledged: ack })); setStep('enrol'); } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  if (info === undefined) return <p className="empty">Checking your invitation…</p>;
  if (step === 'backup') return <AuthShell title="Save your backup codes"><BackupCodes codes={signedIn.backupCodes} onContinue={() => { adopt(signedIn.user); nav('/', { replace: true }); }} /></AuthShell>;
  if (step === 'enrol') return (
    <AuthShell title="Step 2 of 2: two-step verification" subtitle="Your password is saved. Link your phone once so only you can sign in."><MfaEnrol enrol={enrol} email={info.email} onDone={(r) => { setSignedIn(r); setStep('backup'); }} /></AuthShell>);

  return (
    <AuthShell title="Welcome to Regal" subtitle="Step 1 of 2: choose your password." footer={<Link to="/login">Already set up? Sign in</Link>}>
      {info === null ? <><p className="form-error" role="alert">{linkErr || 'This invitation isn’t valid.'}</p>
        {import.meta.env.VITE_USE_MOCK !== 'false' && <p className="muted small-text">Prototype: invitations are stored in the browser where the Staff Administrator created them. Open the link in that same browser, or ask for a fresh one.</p>}</> : (
        <form onSubmit={submit} noValidate>
          <dl className="facts invite-facts"><dt>Name</dt><dd>{info.name}</dd><dt>Role</dt><dd>{ROLES[info.role]}{info.title && `, ${info.title}`}</dd><dt>Email</dt><dd>{info.email}</dd></dl>
          <p className="muted small-text">Something wrong here? Don’t continue. Ask the Staff Administrator to correct it.</p>
          <PasswordFields onChange={setPw} label="Choose a password" idPrefix="ac" />
          <label className="check ack"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I will keep patient information confidential and won’t share my password with anyone.</label>
          {err && <p className="form-error" role="alert">{err}</p>}
          <button className="btn primary wide-btn" disabled={!pw || !ack || busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </form>)}
    </AuthShell>
  );
}
