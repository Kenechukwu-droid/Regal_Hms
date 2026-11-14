import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { MAX_BODY, messageProblem } from '../../utils/messaging';
import { api } from '../../services/api';
import { fmtWhen } from './Messages';

export default function MessageThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState(undefined);          // undefined = loading, null = not found or not yours
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef(null);

  const load = useCallback(() => api.getThread(id).then((x) => { setT(x); if (x.unread) api.markThreadRead(id); }).catch(() => setT(null)), [id]);
  useEffect(() => { setT(undefined); load(); const timer = setInterval(load, 20000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [t?.messages.length]);

  if (t === undefined) return <p className="empty">Loading…</p>;
  if (t === null) return <p className="empty">That conversation isn’t available. <Link to="/messages">Back to messages</Link></p>;

  const send = async (e) => {
    e?.preventDefault(); if (busy || messageProblem({ subject: 'x', body: text })) return;
    setBusy(true); setErr('');
    try { setT(await api.replyToThread(id, { body: text })); setText(''); } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  return (
    <>
      <Link to="/messages" className="back"><ArrowLeft size={16} aria-hidden /> Messages</Link>
      <div className="profile-head"><div><h1>{t.subject}</h1>
        <p className="muted small-text">{t.members.map((m) => (m.id === user.staffId ? 'You' : m.name)).join(', ')}{t.departments.length > 0 && ` · includes the ${t.departments.join(', ')} department`}</p></div></div>
      <div className="convo">
        {t.messages.map((m) => {
          const mine = m.from.id === user.staffId;
          return (
            <div key={m.id} className={`msg ${mine ? 'mine' : ''}`}>
              <div className="meta"><b>{mine ? 'You' : m.from.name}</b> <span className="muted">{!mine && `${ROLES[m.from.role]} · `}{fmtWhen(m.at)}</span></div>
              <div className="body">{m.body}</div>
            </div>);
        })}
        <div ref={end} />
      </div>
      <form className="reply" onSubmit={send}>
        <label htmlFor="rp" className="sr-only">Reply</label>
        <textarea id="rp" rows={3} maxLength={MAX_BODY} placeholder="Write a reply" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(e); }} />
        {err && <p className="form-error" role="alert">{err}</p>}
        <div className="actions" style={{ marginTop: 8 }}><button className="btn primary" disabled={!text.trim() || busy}><Send size={14} aria-hidden /> {busy ? 'Sending…' : 'Send'}</button><span className="muted small-text">Ctrl+Enter also sends. Everyone in the conversation sees your reply.</span></div>
      </form>
    </>
  );
}
