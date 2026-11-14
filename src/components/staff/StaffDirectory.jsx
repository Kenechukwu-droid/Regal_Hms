import { useState } from 'react';
import { DownloadCloud, UserPlus } from 'lucide-react';
import StaffForm from './StaffForm';
import PortalImport from './PortalImport';
import { ROLES } from '../../routes/modules';
import { deptLabel } from '../../utils/departments';

const ACCOUNT_TONE = { Active: 'ok', Invited: 'warn', Locked: 'bad', Disabled: '' };
const when = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// `manage` is true only for the Staff Administrator. Everyone else who can open this sees a plain list.
export default function StaffDirectory({ staff, accounts = [], manage, onSave, onInvite, onReset, onResetTwoStep, onUnlock, onImported, error }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [show, setShow] = useState('Active');
  const [form, setForm] = useState(null);   // {} = add, {item} = edit
  const [importing, setImporting] = useState(false);
  const acc = new Map(accounts.map((a) => [a.staffId, a]));
  const rows = staff.filter((s) => (role === 'All' || s.role === role) && (show === 'All' || s.status === show) && `${s.name} ${s.title} ${s.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="toolbar">
        <input className="search" placeholder="Search name, title or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search staff" />
        <select className="role-filter" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role"><option value="All">All roles</option>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="role-filter" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Filter by status"><option>Active</option><option>Inactive</option><option>All</option></select>
        <span className="grow" />
        {manage && <button className="btn" onClick={() => setImporting(true)}><DownloadCloud size={16} aria-hidden /> Import from staff portal</button>}
        {manage && <button className="btn primary" onClick={() => setForm({})}><UserPlus size={16} aria-hidden /> Add staff member</button>}
      </div>
      {!manage && <p className="muted small-text">You can look at the staff list. Adding people and managing sign-in is done by the Staff Administrator.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="card table-wrap">
        {rows.length === 0 ? <p className="empty">No staff match. Clear the search or change the filters.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Department</th>{manage && <th>Sign-in account</th>}{manage && <th />}</tr></thead>
            <tbody>{rows.map((s) => {
              const a = acc.get(s.id); const st = a?.status;
              return (
                <tr key={s.id}>
                  <td><b>{s.name}</b>{s.status === 'Inactive' && <span className="badge" style={{ marginLeft: 6 }}>Inactive</span>}<div className="muted">{s.title}</div>{manage && <div className="muted small-text">{s.email}</div>}</td>
                  <td><span className="badge">{ROLES[s.role]}</span></td>
                  <td>{deptLabel(s.department) || <span className="muted">—</span>}{s.isHead && <span className="badge ok" style={{ marginLeft: 6 }}>Head</span>}</td>
                  {manage && <td>{st ? <span className={`badge ${ACCOUNT_TONE[st]}`}>{st}</span> : <span className="muted">No account</span>}
                    <div className="muted small-text">{st === 'Invited' && a.inviteExpiresAt ? `Invite expires ${when(a.inviteExpiresAt)}` : a?.lastLoginAt ? `Last sign-in ${when(a.lastLoginAt)}` : ''}{a && a.status === 'Active' && !a.twoStep ? ' · two-step to be set up' : ''}</div></td>}
                  {manage && <td><div className="actions" style={{ margin: 0 }}>
                    <button className="btn small" onClick={() => setForm({ item: s })}>Edit</button>
                    {s.status === 'Active' && (!st || ['Invited', 'Disabled'].includes(st)) && <button className="btn small" onClick={() => onInvite(s.id)}>{st === 'Invited' ? 'Resend invite' : 'Send invite'}</button>}
                    {s.status === 'Active' && ['Active', 'Locked'].includes(st) && <button className="btn small" onClick={() => onReset(s.id)}>Reset password</button>}
                    {s.status === 'Active' && st === 'Active' && a.twoStep && <button className="btn small" onClick={() => onResetTwoStep(s.id)}>Reset two-step</button>}
                    {st === 'Locked' && <button className="btn small" onClick={() => onUnlock(s.id)}>Unlock</button>}
                  </div></td>}
                </tr>);
            })}</tbody>
          </table>)}
      </div>
      {form && <StaffForm key={form.item?.id ?? 'new'} item={form.item} all={staff} onSave={onSave} onClose={() => setForm(null)} />}
      {importing && <PortalImport staff={staff} onClose={() => setImporting(false)} onImported={onImported} />}
    </>
  );
}
