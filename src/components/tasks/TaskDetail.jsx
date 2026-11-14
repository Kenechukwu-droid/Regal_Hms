import { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { fmtDateTime } from '../aftercare/constants';
import { isOverdue, taskActions } from '../../utils/tasks';
import { api } from '../../services/api';

const LABEL = { start: 'Start work', done: 'Mark done', claim: 'Take this request', assign: 'Assign to someone', cancel: 'Cancel or decline', reopen: 'Reopen' };
const NOTE_PROMPT = { done: 'Add a note for them (optional)', cancel: 'Why? (required)', reopen: 'What still needs doing? (required)' };

// Shows one task with the history, and only the buttons this person may use.
export default function TaskDetail({ task, user, people, onChanged, onClose }) {
  const [t, setT] = useState(task);
  const [panel, setPanel] = useState(null);        // the action that needs a note or a person
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const actions = taskActions(t, user);
  const members = people.filter((p) => p.department === t.toDept);

  const run = async (action, extra = {}) => {
    setBusy(true); setErr('');
    try { const next = await api.updateTask(t.id, { action, ...extra }); setT(next); setPanel(null); setNote(''); setAssignee(''); onChanged(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const click = (a) => (['start', 'claim'].includes(a) ? run(a) : (setPanel(a), setErr('')));
  const needsNote = ['cancel', 'reopen'].includes(panel);
  const ready = panel === 'assign' ? !!assignee : needsNote ? !!note.trim() : true;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label={t.title} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{t.title}</h2>
        <p className="muted">
          <StatusBadge value={t.status} /> {t.priority === 'Urgent' && <span className="badge bad">Urgent</span>} {isOverdue(t) && <span className="badge bad">Overdue</span>}
        </p>
        <dl className="facts">
          <dt>From</dt><dd>{t.fromName}{t.fromDeptLabel && ` (${t.fromDeptLabel})`}</dd>
          <dt>For</dt><dd>{t.assigneeName ? `${t.assigneeName} (${t.toDeptLabel})` : `${t.toDeptLabel} department, waiting for someone to take it`}</dd>
          {t.dueDate && <><dt>Due</dt><dd>{t.dueDate}</dd></>}
          {t.patient && <><dt>Patient</dt><dd>{t.patient}</dd></>}
        </dl>
        {t.details && <p style={{ whiteSpace: 'pre-wrap' }}>{t.details}</p>}

        <h3 style={{ marginTop: 16 }}>History</h3>
        <ul className="list">{t.history.map((h, i) => <li key={i}><div><div className="muted small-text">{fmtDateTime(h.at)} · {h.by}</div><div>{h.text}</div></div></li>)}</ul>

        {panel === 'assign' && (
          <div className="field"><label htmlFor="td-a">Who in {t.toDeptLabel}?</label>
            <select id="td-a" value={assignee} onChange={(e) => setAssignee(e.target.value)} autoFocus>
              <option value="">Choose…</option>{members.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}
        {(panel === 'done' || needsNote) && (
          <div className="field"><label htmlFor="td-n">{NOTE_PROMPT[panel]}</label>
            <textarea id="td-n" rows={2} value={note} onChange={(e) => setNote(e.target.value)} autoFocus /></div>)}
        {err && <p className="form-error" role="alert">{err}</p>}

        <div className="modal-actions">
          {!panel && actions.map((a) => <button key={a} type="button" className={a === 'cancel' ? 'btn danger-text' : a === 'assign' ? 'btn' : 'btn primary'} disabled={busy} onClick={() => click(a)}>{LABEL[a]}</button>)}
          {panel && <button type="button" className="btn" onClick={() => { setPanel(null); setErr(''); }}>Back</button>}
          {panel && <button type="button" className="btn primary" disabled={!ready || busy}
            onClick={() => run(panel, panel === 'assign' ? { assigneeId: assignee } : { note })}>{busy ? 'Saving…' : LABEL[panel]}</button>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
