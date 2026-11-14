import { useState } from 'react';
import FormModal from '../common/FormModal';
import { ROLES } from '../../routes/modules';
import { DEPARTMENTS } from '../../utils/departments';
import { PROTECTED_ROLES } from '../../utils/permissions';
import { validateStaff } from '../../utils/staff';

const blank = { name: '', title: '', role: 'nurse', department: '', isHead: false, phone: '', email: '', joined: '', status: 'Active', portalId: '' };

export default function StaffForm({ item, all, onSave, onClose }) {
  const [f, setF] = useState(item ? { ...item } : blank);
  const [invite, setInvite] = useState(true);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const protectedPerson = !!item && PROTECTED_ROLES.includes(item.role);
  const roles = Object.entries(ROLES).filter(([k]) => (protectedPerson ? k === item.role : !PROTECTED_ROLES.includes(k)));
  const hasDept = !PROTECTED_ROLES.includes(f.role);
  const errors = validateStaff(f, all);

  return (
    <FormModal wide title={item ? 'Edit staff member' : 'Add staff member'} submitLabel={item ? 'Save changes' : 'Add staff member'} canSubmit={errors.length === 0} onSubmit={() => onSave(f, canInvite && invite)} onClose={onClose}>
      <div className="row2">
        <div className="field"><label htmlFor="st-n">Full name</label><input id="st-n" value={f.name} onChange={set('name')} autoFocus /></div>
        <div className="field"><label htmlFor="st-t">Job title</label><input id="st-t" value={f.title} onChange={set('title')} placeholder="Theatre nurse" /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="st-e">Email</label><input id="st-e" type="email" value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="st-p">Phone</label><input id="st-p" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label htmlFor="st-r">Access role</label>
          <select id="st-r" value={f.role} onChange={(e) => setF((p) => ({ ...p, role: e.target.value, ...(PROTECTED_ROLES.includes(e.target.value) ? { department: '', isHead: false } : {}) }))} disabled={protectedPerson}>{roles.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <small className="muted">{protectedPerson ? 'This role can only be changed by the system administrator.' : 'Decides which pages this person can open. Medical Director and Staff Administrator accounts are not created here.'}</small></div>
        {hasDept && <div className="field"><label htmlFor="st-d">Department</label>
          <select id="st-d" value={f.department} onChange={set('department')}><option value="">Choose…</option>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select>
          <label className="check" style={{ marginTop: 6 }}><input type="checkbox" checked={f.isHead} onChange={(e) => setF((p) => ({ ...p, isHead: e.target.checked }))} /> Head of this department (writes its monthly report)</label></div>}
      </div>
      {item && !protectedPerson && (
        <div className="field"><label htmlFor="st-s">Status</label>
          <select id="st-s" value={f.status} onChange={set('status')}><option>Active</option><option>Inactive</option></select>
          {f.status === 'Inactive' && <small className="muted">Inactive staff keep their history. Their sign-in is turned off straight away.</small>}</div>)}
      {!item && <label className="check"><input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)} /> Send a sign-in invitation now</label>}
      {errors.length > 0 && (f.name || f.email) && <p className="form-error" role="alert">{errors[0]}</p>}
    </FormModal>
  );
}
