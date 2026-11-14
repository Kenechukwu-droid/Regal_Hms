import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Send } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import TaskForm from '../../components/tasks/TaskForm';
import TaskDetail from '../../components/tasks/TaskDetail';
import { useAuth } from '../../context/AuthContext';
import { MODULES, canOpen } from '../../routes/modules';
import { isOpen, isOverdue } from '../../utils/tasks';
import { deptLabel } from '../../utils/departments';
import { api } from '../../services/api';

// Work for the people in a department (given by their head) and requests between departments.
export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState('');
  const [show, setShow] = useState('Open');
  const [form, setForm] = useState(null);          // 'assign' | 'request'
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');
  const canAttachPatient = canOpen(MODULES.find((m) => m.id === 'patients'), user);

  const load = useCallback(() => { api.getTasks().then(setTasks).catch(() => setError('Couldn’t load tasks.')); }, []);
  useEffect(() => { load(); api.getColleagues().then(setPeople).catch(() => {}); }, [load]);

  const me = user.staffId; const dept = user.department;
  const tabs = useMemo(() => {
    const mine = (t) => t.assigneeId === me;
    const list = [['Assigned to me', mine]];
    if (user.role === 'director') list.push(['All tasks', () => true]);
    else if (dept && user.isHead) list.push([`${deptLabel(dept)} team`, (t) => t.toDept === dept]);
    else if (dept) list.push(['Department queue', (t) => t.toDept === dept && !t.assigneeId]);
    list.push(['Sent by me', (t) => t.fromId === me || (user.isHead && t.fromDept === dept)]);
    return list;
  }, [me, dept, user.isHead, user.role]);
  const current = tabs.find(([n]) => n === tab) ?? tabs[0];

  if (tasks === null) return <p className="empty">{error || 'Loading tasks…'}</p>;
  const rows = tasks.filter(current[1]).filter((t) => (show === 'All' ? true : show === 'Open' ? isOpen(t) : !isOpen(t)))
    .sort((a, b) => (isOpen(b) - isOpen(a)) || (b.priority === 'Urgent') - (a.priority === 'Urgent') || (a.dueDate || '9').localeCompare(b.dueDate || '9'));
  const count = (fn) => tasks.filter((t) => isOpen(t) && fn(t)).length;
  const openTask = tasks.find((t) => t.id === openId);

  return (
    <>
      <PageHeader title="Tasks" subtitle={user.role === 'director' ? 'See all work across the centre, give a task to a department head, or send a request to any department. Heads give the work to their own team.' : user.isHead ? 'Give work to your team, and ask the departments you work with.' : 'Your work, and requests between departments.'}
        action={<div className="actions" style={{ margin: 0 }}>
          {user.role === 'director' && <button className="btn primary" onClick={() => setForm('head')}><ClipboardList size={16} aria-hidden /> Assign to a department head</button>}
          {user.isHead && <button className="btn primary" onClick={() => setForm('assign')}><ClipboardList size={16} aria-hidden /> Assign a task</button>}
          {(dept || user.role === 'director') && <button className={`btn ${user.isHead || user.role === 'director' ? '' : 'primary'}`} onClick={() => setForm('request')}><Send size={16} aria-hidden /> Ask another department</button>}
        </div>} />

      <div className="tabs" role="tablist">{tabs.map(([name, fn]) => (
        <button key={name} role="tab" aria-selected={current[0] === name} className={current[0] === name ? 'on' : ''} onClick={() => setTab(name)}>{name} ({count(fn)})</button>))}</div>
      <div className="toolbar">
        <select className="role-filter" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Show"><option>Open</option><option>Finished</option><option>All</option></select>
      </div>

      <div className="card table-wrap">
        {rows.length === 0 ? <p className="empty">{current[0] === 'Department queue' ? 'Nothing is waiting for your department.' : 'No tasks here.'}</p> : (
          <table>
            <thead><tr><th>Task</th><th>From</th><th>For</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id}>
                <td><button className="linklike" onClick={() => setOpenId(t.id)}>{t.title}</button>
                  {t.priority === 'Urgent' && <span className="badge bad" style={{ marginLeft: 6 }}>Urgent</span>}
                  {t.patient && <div className="muted small-text">{t.patient}</div>}</td>
                <td>{t.fromName}<div className="muted small-text">{t.kind === 'request' ? `Request from ${t.fromDeptLabel || 'Medical Director'}` : t.fromDept ? 'Assigned' : 'Assigned by the Medical Director'}</div></td>
                <td>{t.assigneeName || <span className="muted">In queue</span>}<div className="muted small-text">{t.toDeptLabel}</div></td>
                <td>{t.dueDate || '—'}{isOverdue(t) && <span className="badge bad" style={{ marginLeft: 6 }}>Overdue</span>}</td>
                <td><StatusBadge value={t.status} /></td>
              </tr>))}
            </tbody>
          </table>)}
      </div>

      {form && <TaskForm mode={form} user={user} people={people} canAttachPatient={canAttachPatient} onClose={() => setForm(null)}
        onSave={async (b) => { await api.createTask(b); load(); }} />}
      {openTask && <TaskDetail key={openTask.id} task={openTask} user={user} people={people} onChanged={load} onClose={() => setOpenId(null)} />}
    </>
  );
}
