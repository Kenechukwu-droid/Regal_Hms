import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PenSquare } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import ComposeForm from '../../components/messages/ComposeForm';
import { api } from '../../services/api';

export const fmtWhen = (iso) => {
  const d = new Date(iso); const today = new Date();
  return d.toDateString() === today.toDateString() ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function Messages() {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [composing, setComposing] = useState(false);
  const load = useCallback(() => api.getThreads().then(setRows).catch(() => setRows([])), []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const send = async (payload) => { const t = await api.sendMessage(payload); nav(`/messages/${t.id}`); };

  return (
    <>
      <PageHeader title="Messages" subtitle="Talk to colleagues and departments without leaving the HMS."
        action={<button className="btn primary" onClick={() => setComposing(true)}><PenSquare size={16} aria-hidden /> New message</button>} />
      {rows === null ? <p className="empty">Loading messages…</p> : rows.length === 0 ? (
        <div className="card empty">No messages yet. Start one with the button above.</div>
      ) : (
        <div className="card threads">{rows.map((t) => (
          <Link key={t.id} to={`/messages/${t.id}`} className={`thread-row ${t.unread ? 'unread' : ''}`}>
            <div className="top"><b>{t.subject}</b><span className="when">{fmtWhen(t.lastAt)}</span></div>
            <div className="who muted small-text">With {[...t.with.slice(0, 3), ...(t.with.length > 3 ? [`${t.with.length - 3} more`] : [])].join(', ')}{t.departments.length > 0 && ` · ${t.departments.join(', ')} department`}</div>
            <div className="prev">{t.lastFromMe ? 'You: ' : `${t.lastFrom}: `}{t.preview}</div>
            {t.unread && <span className="dot-new" aria-label="Unread" />}
          </Link>))}
        </div>)}
      {composing && <ComposeForm onSend={send} onClose={() => setComposing(false)} />}
    </>
  );
}
