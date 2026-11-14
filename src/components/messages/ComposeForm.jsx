import { useEffect, useState } from 'react';
import FormModal from '../common/FormModal';
import { api } from '../../services/api';
import { deptLabel } from '../../utils/departments';
import { MAX_BODY, MAX_SUBJECT, messageProblem } from '../../utils/messaging';
import { ROLES } from '../../routes/modules';

export default function ComposeForm({ onSend, onClose }) {
  const [dir, setDir] = useState(null);
  const [people, setPeople] = useState([]);
  const [depts, setDepts] = useState([]);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  useEffect(() => { api.getMessageDirectory().then(setDir).catch(() => setDir({ people: [], departments: [] })); }, []);

  const toggle = (list, set) => (id) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const togglePerson = toggle(people, setPeople), toggleDept = toggle(depts, setDepts);
  const shown = (dir?.people || []).filter((p) => `${p.name} ${p.title}`.toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(shown.map((p) => p.department || ''))];
  const problem = messageProblem({ subject, body });
  const ready = (people.length > 0 || depts.length > 0) && !problem;

  return (
    <FormModal wide title="New message" submitLabel="Send" canSubmit={ready} onSubmit={() => onSend({ toStaff: people, toDepartments: depts, subject, body })} onClose={onClose}>
      {!dir ? <p className="muted">Loading who you can message…</p> : (
        <>
          <div className="field"><label>To</label>
            {dir.departments.length > 0 && <div className="pick-row">{dir.departments.map((d) => (
              <label key={d.key} className={`pick ${depts.includes(d.key) ? 'on' : ''}`}><input type="checkbox" checked={depts.includes(d.key)} onChange={() => toggleDept(d.key)} /> {d.label} department <span className="muted">({d.memberCount})</span></label>))}</div>}
            <input className="search" style={{ width: '100%' }} placeholder="Find a person" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a person" />
            <div className="people-box">
              {shown.length === 0 && <p className="muted small-text" style={{ padding: 8 }}>No one matches.</p>}
              {groups.map((g) => (
                <div key={g || 'mgmt'}><div className="people-group">{deptLabel(g) || 'Management'}</div>
                  {shown.filter((p) => (p.department || '') === g).map((p) => (
                    <label key={p.id} className="person"><input type="checkbox" checked={people.includes(p.id)} onChange={() => togglePerson(p.id)} /> <span><b>{p.name}</b> <span className="muted">{p.title || ROLES[p.role]}</span></span></label>))}
                </div>))}
            </div>
            {(people.length > 0 || depts.length > 0) && <p className="small-text muted" style={{ margin: '6px 0 0' }}>Sending to {[...depts.map((d) => `${deptLabel(d)} department`), ...people.map((id) => dir.people.find((p) => p.id === id).name)].join(', ')}</p>}
          </div>
          <div className="field"><label htmlFor="mg-s">Subject</label><input id="mg-s" maxLength={MAX_SUBJECT} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          <div className="field"><label htmlFor="mg-b">Message</label><textarea id="mg-b" rows={5} maxLength={MAX_BODY} value={body} onChange={(e) => setBody(e.target.value)} />
            <small className="muted">{body.length} / {MAX_BODY}. Keep full patient details in the patient record, not in messages.</small></div>
        </>)}
    </FormModal>
  );
}
