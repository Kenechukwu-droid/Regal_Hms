import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell';
import MfaEnrol from '../../components/auth/MfaEnrol';
import BackupCodes from '../../components/auth/BackupCodes';
import { useAuth } from '../../context/AuthContext';
import { DEMO_PASSWORD } from '../../services/mockData';
import { resetDemo } from '../../services/persist';
import { api } from '../../services/api';
import { rememberDevice } from '../../utils/device';

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const DEMO = [['Medical Director', 'c.eze@regal.example'], ['Surgeon (head of Theatre)', 'bello@regal.example'], ['Nurse (head of Aftercare)', 'joy@regal.example'], ['Pharmacist (head of Pharmacy)', 'chioma@regal.example'],
  ['Front Desk (head)', 'amaka@regal.example'], ['Finance (head)', 'okon@regal.example'], ['Staff Administrator', 'ifeoma@regal.example'],
  ['Laboratory nurse (head of Laboratory)', 'peace@regal.example'], ['Laboratory nurse (team member)', 'ada@regal.example'],
  ['Theatre nurse (team member)', 'halima@regal.example'], ['Pharmacist (team member)', 'tola@regal.example'], ['Front desk (team member)', 'efe@regal.example']];

// Three screens in one: password, then the 6-digit code (or setting up the app), then the backup codes if it was a first setup.
export default function Login() {
  const { user, login, adopt, notice } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [step, setStep] = useState('password');   // password | mfa | enrol | backup
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [enrol, setEnrol] = useState(null);
  const [code, setCode] = useState('');
  const [signedIn, setSignedIn] = useState(null);   // { user, backupCodes }
  const [demo, setDemo] = useState('');
  const [remember, setRemember] = useState(false);
  const sent = useRef('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const goTo = loc.state?.from || '/';

  useEffect(() => {
    if (!MOCK || step !== 'mfa') return undefined;
    const tick = () => api.demoMfaCode(challenge).then(setDemo);
    tick(); const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [step, challenge]);

  if (user === undefined) return <p className="empty">Checking your session…</p>;
  if (user && step !== 'backup') return <Navigate to={goTo} replace />;

  const submitPassword = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await login(email.trim(), pw); setPw('');
      if (r.step === 'done') { nav(goTo, { replace: true }); return; }   // a trusted device: no code needed
      if (r.step === 'enrol') { setEnrol(r); setStep('enrol'); } else { setChallenge(r.challenge); setStep('mfa'); }
    } catch (x) { setErr(x.message); setPw(''); }
    setBusy(false);
  };
  // Checks as soon as the sixth digit is typed. A backup code (letters and a dash) is sent with the button instead.
  const verify = async (value) => {
    if (busy || sent.current === value) return;
    sent.current = value; setBusy(true); setErr('');
    try { const r = await api.verifyMfa({ challenge, code: value, remember }); rememberDevice(email, r.deviceToken); adopt(r.user); nav(goTo, { replace: true }); }
    catch (x) { setErr(x.message); setCode(''); sent.current = ''; setBusy(false); }
  };
  const change = (v) => { setCode(v); const d = v.replace(/\s/g, ''); if (/^\d{6}$/.test(d)) verify(d); };
  const submitCode = (e) => { e.preventDefault(); verify(code.trim()); };
  const restart = () => { setStep('password'); setCode(''); setErr(''); setChallenge(''); setEnrol(null); };

  if (step === 'backup') {
    return <AuthShell title="Save your backup codes"><BackupCodes codes={signedIn.backupCodes} onContinue={() => { adopt(signedIn.user); nav(goTo, { replace: true }); }} /></AuthShell>;
  }
  if (step === 'enrol') {
    return (
      <AuthShell title="Set up two-step verification" subtitle="One quick step to protect patient records: link your phone once, then it takes seconds."
        footer={<button className="linklike" onClick={restart}>Cancel and start again</button>}>
        <MfaEnrol enrol={enrol} email={email} onDone={(r) => { setSignedIn(r); setStep('backup'); }} />
      </AuthShell>);
  }
  if (step === 'mfa') {
    return (
      <AuthShell title="Enter your code" subtitle="Open your authenticator app and type the 6-digit code for Regal HMS." footer={<button className="linklike" onClick={restart}>Back to sign in</button>}>
        <form onSubmit={submitCode} noValidate>
          <div className="field"><label htmlFor="mf-c">6-digit code, or a backup code</label>
            <input id="mf-c" inputMode="text" autoComplete="one-time-code" maxLength={12} value={code} onChange={(e) => change(e.target.value)} disabled={busy} autoFocus /></div>
          <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Don’t ask for a code again on this device for 30 days</label>
          {MOCK && demo && <p className="demo-box small-text">Demo only: no phone needed. Today’s code is <button type="button" className="linklike" onClick={() => change(demo)}>{demo}</button> (click to use it).</p>}
          {err && <p className="form-error" role="alert">{err}</p>}
          <button className="btn primary wide-btn" disabled={code.trim().length < 6 || busy}>{busy ? 'Checking…' : 'Sign in'}</button>
        </form>
        <p className="muted small-text" style={{ marginTop: 14 }}>Lost your phone? Use one of your backup codes, or ask the Staff Administrator to reset two-step verification.</p>
      </AuthShell>);
  }

  return (
    <AuthShell title="Sign in" subtitle="Use the account the Staff Administrator set up for you." footer={<Link to="/forgot-password">Forgot your password?</Link>}>
      {notice && <p className="locked-note" role="status">{notice}</p>}
      <form onSubmit={submitPassword} noValidate>
        <div className="field"><label htmlFor="li-e">Email</label>
          <input id="li-e" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
        <div className="field"><label htmlFor="li-p">Password</label>
          <div className="pw-wrap">
            <input id="li-p" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div></div>
        {err && <p className="form-error" role="alert">{err}</p>}
        <button className="btn primary wide-btn" type="submit" disabled={!email.trim() || !pw || busy}>{busy ? 'Checking…' : 'Continue'}</button>
      </form>

      {MOCK && (
        <div className="demo-box">
          <b>Demo accounts</b>
          <p className="muted small-text">For trying the prototype only. This box disappears when the real backend is connected. Password for all: <code>{DEMO_PASSWORD}</code></p>
          <ul>{DEMO.map(([role, mail]) => (
            <li key={mail}><span>{role}</span><button type="button" className="linklike" onClick={() => { setEmail(mail); setPw(DEMO_PASSWORD); setErr(''); }}>Fill in</button></li>))}
          </ul>
          <p className="small-text">Invited, not yet signed in: <Link className="plink" to="/activate?token=demo-invite-okeke">Dr. Okeke’s activation page</Link></p>
          <p className="muted small-text">The demo remembers what you add in this browser, so invitation links work in new tabs. <button type="button" className="linklike" onClick={resetDemo}>Reset the demo data</button></p>
        </div>)}
    </AuthShell>
  );
}
