import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { deviceToken } from '../utils/device';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_MINUTES) || 30;   // placeholder: replace with the centre's own policy
const IDLE_MS = IDLE_MINUTES * 60000;
const WARN_MS = Math.min(2 * 60000, IDLE_MS / 2);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);   // undefined = still checking the session, null = signed out
  const [notice, setNotice] = useState('');
  const [warn, setWarn] = useState(false);
  const last = useRef(Date.now());
  const warnRef = useRef(false);
  const userRef = useRef(undefined);
  userRef.current = user;

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)); }, []);

  const logout = useCallback(async (reason = '') => {
    try { await api.logout(); } catch { /* signing out locally either way */ }
    warnRef.current = false; setWarn(false); setUser(null);
    setNotice(reason === 'idle' ? `You were signed out because you were inactive for ${IDLE_MINUTES} minutes.` : reason === 'expired' ? 'Your session ended. Please sign in again.' : '');
  }, []);
  const adopt = useCallback((u) => { last.current = Date.now(); setNotice(''); setUser(u); }, []);
  // Step 1 only. It returns what the person must do next (enter a code, or set up the app); signing in completes in adopt().
  const login = useCallback(async (email, password) => {
    const r = await api.login({ email, password, deviceToken: deviceToken(email) });
    if (r.step === 'done') adopt(r.user);   // a trusted device: signed in without a code
    return r;
  }, [adopt]);

  // The server says the session is gone (401). Only matters if someone was signed in.
  useEffect(() => {
    const h = () => { if (userRef.current) logout('expired'); };
    window.addEventListener('auth:unauthorized', h);
    return () => window.removeEventListener('auth:unauthorized', h);
  }, [logout]);

  // Sign out after a period without activity, with a warning first
  useEffect(() => {
    if (!user) return undefined;
    last.current = Date.now();
    const bump = () => { if (!warnRef.current) last.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) logout('idle');
      else if (idle >= IDLE_MS - WARN_MS && !warnRef.current) { warnRef.current = true; setWarn(true); }
    }, 5000);
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); clearInterval(timer); };
  }, [user, logout]);

  const stay = async () => { try { await api.me(); warnRef.current = false; last.current = Date.now(); setWarn(false); } catch { logout('expired'); } };

  return (
    <AuthContext.Provider value={{ user, login, logout, adopt, notice, clearNotice: () => setNotice('') }}>
      {children}
      {warn && user && (
        <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Signing out soon">
          <div className="modal">
            <h2>Still there?</h2>
            <p>For patient privacy you’ll be signed out in about {Math.round(WARN_MS / 60000)} minute{WARN_MS > 60000 ? 's' : ''} because there’s been no activity.</p>
            <div className="modal-actions"><button className="btn" onClick={() => logout()}>Sign out now</button><button className="btn primary" onClick={stay} autoFocus>Stay signed in</button></div>
          </div>
        </div>)}
    </AuthContext.Provider>
  );
}
