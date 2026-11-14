import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import PasswordFields from '../../components/auth/PasswordFields';
import { api } from '../../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [info, setInfo] = useState(undefined);   // undefined = checking, null = bad link
  const [linkErr, setLinkErr] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => { api.checkToken('reset', token).then(setInfo).catch((e) => { setLinkErr(e.message); setInfo(null); }); }, [token]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.resetPassword({ token, password: pw }); setDone(true); } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  if (info === undefined) return <p className="empty">Checking your link…</p>;
  return (
    <AuthShell title={done ? 'Password changed' : 'Choose a new password'} footer={<Link to="/login">Back to sign in</Link>}>
      {done ? <p className="locked-note ok" role="status">Your password has been changed. Sign in with the new one.</p>
        : info === null ? <p className="form-error" role="alert">{linkErr || 'This link isn’t valid.'} <Link className="plink" to="/forgot-password">Ask for a new link</Link></p>
        : (
          <form onSubmit={submit} noValidate>
            <p className="muted" style={{ marginTop: 6 }}>For <b>{info.email}</b></p>
            <PasswordFields onChange={setPw} idPrefix="rp" />
            {err && <p className="form-error" role="alert">{err}</p>}
            <button className="btn primary wide-btn" disabled={!pw || busy}>{busy ? 'Saving…' : 'Change password'}</button>
          </form>)}
    </AuthShell>
  );
}
