import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import PasswordFields from '../../components/auth/PasswordFields';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function Account() {
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [round, setRound] = useState(0);   // remounts the password boxes after a successful change

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg({ ok: false, text: '' });
    try { await api.changePassword({ current, next }); setMsg({ ok: true, text: 'Password changed.' }); setCurrent(''); setRound((r) => r + 1); }
    catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Your account" subtitle="Your details and password." action={<button className="btn" onClick={() => logout()}>Sign out</button>} />
      <div className="grid two">
        <section className="card"><h2>Details</h2>
          <dl className="facts"><dt>Name</dt><dd>{user.name}</dd><dt>Job title</dt><dd>{user.title || '—'}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Access role</dt><dd>{ROLES[user.role]}</dd></dl>
          <p className="muted small-text">To change your name, email or role, ask the Staff Administrator.</p>
          <h3 className="sub" style={{ marginTop: 14 }}>Two-step verification</h3>
          <p className="muted small-text" style={{ margin: 0 }}>On for everyone. If you lose your phone, use a backup code to sign in, then ask the Staff Administrator to reset it.</p></section>
        <section className="card"><h2>Change password</h2>
          <form onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="cp-c">Current password</label><input id="cp-c" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
            <PasswordFields key={round} onChange={setNext} idPrefix="cp" />
            {msg.text && <p className={msg.ok ? 'ok-text' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
            <button className="btn primary" disabled={!current || !next || busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </form></section>
      </div>
    </>
  );
}
