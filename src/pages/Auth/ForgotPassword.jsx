import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import { api } from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { setDone(await api.forgotPassword({ email: email.trim() })); } catch { setErr('Couldn’t send that. Check the connection and try again.'); }
    setBusy(false);
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your work email and we’ll send you a link." footer={<Link to="/login">Back to sign in</Link>}>
      {done ? (
        <>
          <p className="locked-note ok" role="status">If that email belongs to an account, a reset link is on its way. It works for 30 minutes and only once.</p>
          {done.demoLink && <div className="demo-box"><b>Demo inbox</b><p className="muted small-text">The real system emails this link. It is shown here only in the prototype.</p><Link className="plink" to={done.demoLink.replace(window.location.origin, '')}>Open the reset link</Link></div>}
          <p className="muted small-text">Nothing arrived? Ask the Medical Director to send you a new link.</p>
        </>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="fp-e">Email</label><input id="fp-e" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
          {err && <p className="form-error" role="alert">{err}</p>}
          <button className="btn primary wide-btn" disabled={!/^\S+@\S+\.\S+$/.test(email.trim()) || busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>)}
    </AuthShell>
  );
}
