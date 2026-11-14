import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FigureGrid from '../../components/reports/FigureGrid';
import NoAccess from '../../components/common/NoAccess';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { DEPARTMENTS, deptLabel, monthLabel, shiftMonth } from '../../utils/departments';
import { todayISO } from '../../utils/dates';
import { api } from '../../services/api';

const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function DepartmentReport() {
  const { dept, month } = useParams();
  const { user } = useAuth();
  const [r, setR] = useState(undefined);            // undefined = loading, null = not allowed
  const [text, setText] = useState({ highlights: '', issues: '', requests: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [modal, setModal] = useState(null);         // 'submit' | 'acknowledge' | 'return'
  const [note, setNote] = useState('');
  const thisMonth = todayISO().slice(0, 7);

  const apply = (x) => { setR(x); setText({ highlights: x.highlights || '', issues: x.issues || '', requests: x.requests || '' }); };
  useEffect(() => { setR(undefined); setMsg({ ok: false, text: '' }); api.getDepartmentReport(dept, month).then(apply).catch(() => setR(null)); }, [dept, month]);

  if (!DEPARTMENTS.some((d) => d.key === dept) || !/^\d{4}-\d{2}$/.test(month)) return <Navigate to="/staff" replace />;
  if (r === undefined) return <p className="empty">Loading report…</p>;
  if (r === null) return <NoAccess moduleName="this report" roleName={ROLES[user.role]} />;

  const isHead = user.isHead && user.department === dept;
  const isDirector = user.role === 'director';
  const editable = isHead && ['Not started', 'Draft'].includes(r.status);
  const submitted = ['Submitted', 'Acknowledged'].includes(r.status);
  const dirty = text.highlights !== (r.highlights || '') || text.issues !== (r.issues || '') || text.requests !== (r.requests || '');
  const set = (k) => (e) => { setText((p) => ({ ...p, [k]: e.target.value })); setMsg({ ok: false, text: '' }); };

  const saveDraft = async () => {
    setBusy(true); setMsg({ ok: false, text: '' });
    try { apply(await api.saveDepartmentDraft(dept, month, text)); setMsg({ ok: true, text: 'Draft saved.' }); } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  const submit = async () => apply(await api.submitDepartmentReport(dept, month, text));
  const review = (action) => async () => apply(await api.reviewDepartmentReport(dept, month, { action, note }));

  return (
    <>
      <Link to="/staff" className="back"><ArrowLeft size={16} aria-hidden /> Staff & reports</Link>
      <div className="profile-head">
        <div><h1>{deptLabel(dept)} report</h1><p className="muted">{monthLabel(month)}{r.head && ` · Head: ${r.head.name}`}</p></div>
        <div className="spacer" />
        <Link className="btn small" to={`/staff/reports/${dept}/${shiftMonth(month, -1)}`} aria-label="Previous month"><ChevronLeft size={14} /></Link>
        <Link className={`btn small ${month >= thisMonth ? 'disabled' : ''}`} to={`/staff/reports/${dept}/${shiftMonth(month, 1)}`} aria-label="Next month" aria-disabled={month >= thisMonth}><ChevronRight size={14} /></Link>
        <StatusBadge value={r.status} />
      </div>

      {r.returnNote && editable && <p className="locked-note"><b>Sent back by the Medical Director:</b> {r.returnNote}</p>}
      {isDirector && !submitted && <p className="locked-note">{r.head?.name || 'The department head'} hasn’t submitted this report yet.</p>}

      {(submitted || isHead) && r.figures && (
        <section style={{ marginBottom: 8 }}>
          <h2 className="section-title">The figures</h2>
          <p className="muted small-text" style={{ marginTop: -6 }}>{submitted ? `Worked out by the system and frozen when the report was submitted (${when(r.submittedAt)}).` : 'Worked out by the system. They update until you submit, then they are frozen.'}</p>
          <FigureGrid figures={r.figures} />
        </section>)}

      {(editable || submitted) && (
        <section className="card" style={{ maxWidth: 860 }}>
          <h2>In the head’s words</h2>
          <fieldset className="plain" disabled={!editable}>
            <div className="field"><label htmlFor="d-h">What went well</label><textarea id="d-h" rows={3} value={text.highlights} onChange={set('highlights')} /></div>
            <div className="field"><label htmlFor="d-i">Problems and risks</label><textarea id="d-i" rows={3} value={text.issues} onChange={set('issues')} placeholder="Write “none” if there were none" /></div>
            <div className="field"><label htmlFor="d-r">What the department needs (optional)</label><textarea id="d-r" rows={3} value={text.requests} onChange={set('requests')} /></div>
          </fieldset>
          {r.status === 'Acknowledged' && <p className="locked-note ok" style={{ marginBottom: 0 }}><b>Acknowledged</b> by {r.ackBy}, {when(r.ackAt)}.{r.ackNote && ` ${r.ackNote}`}</p>}
          {msg.text && <p className={msg.ok ? 'ok-text' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
          <div className="actions">
            {editable && <><button className="btn" onClick={saveDraft} disabled={!dirty || busy}>Save draft</button>
              <button className="btn primary" onClick={() => setModal('submit')} disabled={busy}>Submit to the Medical Director</button></>}
            {isDirector && r.status === 'Submitted' && <><button className="btn primary" onClick={() => { setNote(''); setModal('acknowledge'); }}>Acknowledge</button>
              <button className="btn" onClick={() => { setNote(''); setModal('return'); }}>Send back for changes</button></>}
          </div>
        </section>)}

      {modal === 'submit' && (
        <FormModal title="Submit this report?" submitLabel="Submit" onSubmit={async () => { if (dirty) await api.saveDepartmentDraft(dept, month, text); await submit(); }} onClose={() => setModal(null)}>
          <p>The Medical Director will see it, and the figures are frozen as they are now. You can’t edit it after this unless it’s sent back to you.</p>
        </FormModal>)}
      {modal && modal !== 'submit' && (
        <FormModal title={modal === 'acknowledge' ? 'Acknowledge this report' : 'Send back for changes'} submitLabel={modal === 'acknowledge' ? 'Acknowledge' : 'Send back'}
          canSubmit={modal === 'acknowledge' || note.trim().length > 0} onSubmit={review(modal)} onClose={() => setModal(null)}>
          <div className="field"><label htmlFor="rv-n">{modal === 'acknowledge' ? 'Reply (optional)' : 'What needs changing (required)'}</label>
            <textarea id="rv-n" rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></div>
        </FormModal>)}
    </>
  );
}
