import { useEffect, useRef, useState } from 'react';

import { api } from '../../services/api';
import { rememberDevice } from '../../utils/device';

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// Sets up the authenticator app: scan the QR code (or type the key), then type the 6-digit code. It checks itself on the sixth digit.
export default function MfaEnrol({ enrol, email, onDone }) {
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [demo, setDemo] = useState('');
  const sent = useRef('');

  useEffect(() => { QRCode.toDataURL(enrol.uri, { margin: 1, width: 188 }).then(setQr).catch(() => setQr('')); }, [enrol.uri]);
  useEffect(() => {
    if (!MOCK) return undefined;
    const tick = () => api.demoMfaCode(enrol.challenge).then(setDemo);
    tick(); const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [enrol.challenge]);

  const submit = async (value) => {
    if (busy || sent.current === value) return;
    sent.current = value; setBusy(true); setErr('');
    try { const r = await api.confirmEnrolment({ challenge: enrol.challenge, code: value, remember }); rememberDevice(email, r.deviceToken); onDone(r); }
    catch (x) { setErr(x.message); setCode(''); sent.current = ''; setBusy(false); }
  };
  const change = (v) => { setCode(v); const d = v.replace(/\s/g, ''); if (/^\d{6}$/.test(d)) submit(d); };

  return (
    <div>
      <ol className="steps-list">
        <li>Install an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.</li>
        <li>Scan this code with the app, or type the key in by hand.
          <div className="qr-row">
            {qr ? <img src={qr} width="188" height="188" alt="QR code for your authenticator app" /> : <div className="qr-empty">QR code not available</div>}
            <div><span className="muted small-text">Key</span><code className="key">{enrol.secret.match(/.{1,4}/g).join(' ')}</code></div>
          </div></li>
        <li>Type the 6-digit code the app shows. It checks as soon as you finish.</li>
      </ol>
      <div className="field"><label htmlFor="en-c">6-digit code</label>
        <input id="en-c" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => change(e.target.value)} disabled={busy} autoFocus /></div>
      <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Don’t ask for a code again on this device for 30 days</label>
      {MOCK && demo && <p className="demo-box small-text">Demo only: no phone needed. Today’s code is <button type="button" className="linklike" onClick={() => change(demo)}>{demo}</button> (click to use it).</p>}
      {err && <p className="form-error" role="alert">{err}</p>}
      {busy && <p className="muted small-text">Checking…</p>}
    </div>
  );
}
