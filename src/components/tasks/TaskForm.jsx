import { useEffect, useMemo, useState } from 'react';
import FormModal from '../common/FormModal';
import { DEPARTMENTS } from '../../utils/departments';
import { linkedDepartments } from '../../utils/interactions';
import { MAX_DETAILS, MAX_TITLE, PRIORITIES, validateTask } from '../../utils/tasks';
import { todayISO } from '../../utils/dates';
import { api } from '../../services/api';

// mode "assign": a department head gives work to someone in their own department.
// mode "head": the Medical Director gives work to the head of a department (the head then gives it to someone on their team).
// mode "request": anyone asks a department they work with. It goes to that department's queue.
export default function TaskForm({ mode, user, people, canAttachPatient, onSave, onClose }) {
  const [f, setF] = useState({ title: '', details: '', priority: 'Normal', dueDate: '', patientId: '', toDept: mode === 'assign' ? user.department : '', assigneeId: '' });
  const heads = people.filter((p) => p.isHead && p.department);
  const [patients, setPatients] = useState([]);
  useEffect(() => { if (canAttachPatient) api.getPatients().then(setPatients).catch(() => {}); }, [canAttachPatient]);

  const team = useMemo(() => people.filter((p) => p.department === user.department && p.id !== user.staffId), [people, user]);
  const depts = DEPARTMENTS.filter((d) => (user.role === 'director' ? true : linkedDepartments(user.department).includes(d.key)));
  const problem = validateTask({ ...f, mode });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <FormModal wide title={mode === 'head' ? 'Assign a task to a department head' : mode === 'assign' ? 'Assign a task to your team' : 'Ask another department'} submitLabel={mode === 'request' ? 'Send request' : 'Assign task'}
      canSubmit={!problem} onClose={onClose} onSubmit={() => onSave({ ...f, patientId: f.patientId || null })}>
      {mode === 'head' ? (
        <div className="field"><label htmlFor="tk-h">Which department head?</label>
          <select id="tk-h" value={f.assigneeId} onChange={(e) => { const h = heads.find((x) => x.id === e.target.value); setF({ ...f, assigneeId: e.target.value, toDept: h?.department || '' }); }} autoFocus>
            <option value="">Choose a head…</option>
            {heads.map((p) => <option key={p.id} value={p.id}>{p.name}, head of {DEPARTMENTS.find((d) => d.key === p.department)?.label}</option>)}</select>
          <small className="muted">The head gives the work to a person on their team. You can’t assign to people inside a department.</small></div>
      ) : mode === 'assign' ? (
        <div className="field"><label htmlFor="tk-a">Who is it for?</label>
          <select id="tk-a" value={f.assigneeId} onChange={set('assigneeId')} autoFocus>
            <option value="">Choose someone in your department…</option>
            {team.map((p) => <option key={p.id} value={p.id}>{p.name}{p.title ? `, ${p.title}` : ''}</option>)}</select>
          {team.length === 0 && <small className="muted">There is nobody else in your department yet. The Staff Administrator adds people.</small>}</div>
      ) : (
        <div className="field"><label htmlFor="tk-d">Which department?</label>
          <select id="tk-d" value={f.toDept} onChange={set('toDept')} autoFocus>
            <option value="">Choose a department…</option>
            {depts.map((d) => <option key={d.key} value={d.key}>{d.label}: {d.blurb}</option>)}</select>
          <small className="muted">{user.role === 'director' ? 'Any department. The request goes to its queue, and its head or a team member takes it.' : 'Only departments you work with are listed. Everyone in that department can see it, and one of them will take it.'}</small></div>
      )}
      <div className="field"><label htmlFor="tk-t">Title</label>
        <input id="tk-t" value={f.title} maxLength={MAX_TITLE} onChange={set('title')} placeholder={mode !== 'request' ? 'What needs doing?' : 'What do you need from them?'} /></div>
      <div className="field"><label htmlFor="tk-x">Details (optional)</label>
        <textarea id="tk-x" rows={3} maxLength={MAX_DETAILS} value={f.details} onChange={set('details')} /></div>
      <div className="row3">
        <div className="field"><label htmlFor="tk-p">Priority</label>
          <select id="tk-p" value={f.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
        <div className="field"><label htmlFor="tk-w">Due date (optional)</label>
          <input id="tk-w" type="date" min={todayISO()} value={f.dueDate} onChange={set('dueDate')} /></div>
        {canAttachPatient && (
          <div className="field"><label htmlFor="tk-pt">Patient (optional)</label>
            <select id="tk-pt" value={f.patientId} onChange={set('patientId')}><option value="">None</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>)}
      </div>
      {problem && f.title && <p className="muted small-text">{problem}</p>}
    </FormModal>
  );
}
