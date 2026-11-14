import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { passwordRules, strength } from '../../utils/password';

// One box with a show button, so there is no need to type it twice. Reports the password to the parent only when it passes.
export default function PasswordFields({ onChange, label = 'New password', idPrefix = 'np' }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const rules = passwordRules(pw);
  const valid = pw.length > 0 && rules.every((r) => r.ok);
  useEffect(() => { onChange(valid ? pw : ''); }, [valid, pw]); // eslint-disable-line
  const s = strength(pw);

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-1`}>{label}</label>
        <div className="pw-wrap">
          <input id={`${idPrefix}-1`} type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div>
        {pw && <div className={`strength ${s.toLowerCase()}`} aria-label={`Password strength: ${s}`}><i /><span>{s}</span></div>}
      </div>
      <ul className="rules" aria-live="polite">{rules.map((r) => (
        <li key={r.key} className={pw ? (r.ok ? 'ok' : 'bad') : ''}>{pw ? (r.ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />) : <span className="dot" />} {r.label}</li>))}</ul>
      <p className="muted small-text" style={{ marginTop: -4 }}>A few random words make a strong password that’s easy to remember.</p>
    </>
  );
}
