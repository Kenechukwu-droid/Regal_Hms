import { useState } from 'react';
import { Upload } from 'lucide-react';
import { ROLES } from '../../routes/modules';
import { DEPARTMENTS } from '../../utils/departments';
import { PROTECTED_ROLES } from '../../utils/permissions';
import { parseCsv, suggestDepartment, suggestRole } from '../../utils/portal';
import { api } from '../../services/api';

const ROLE_OPTIONS = Object.entries(ROLES).filter(([k]) => !PROTECTED_ROLES.includes(k));

// Pulls names, job titles and contacts from the centre's staff portal (or a CSV exported from it) so nobody retypes them.
// The Staff Administrator confirms each person's role and department before anything is added.
export default function PortalImport({ staff, onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  const known = (r) => staff.some((s) => (r.portalId && s.portalId === r.portalId) || s.email.toLowerCase() === (r.email || '').toLowerCase());
  const toRows = (list) => list.map((p, i) => {
    const role = p.suggestedRole ?? suggestRole(p.title); const dept = p.suggestedDepartment ?? suggestDepartment(p.department);
    const inHms = p.inHms ?? known(p);
    return { key: i, ...p, inHms, role, deptKey: dept, selected: !inHms && !!role && !!dept };
  });

  const fetchPortal = async () => { setBusy(true); setErr(''); try { setRows(toRows(await api.getPortalStaff())); } catch (e) { setErr(e.message || 'Couldn’t reach the staff portal.'); } setBusy(false); };
  const readFile = async (file) => {
    if (!file) return; setErr('');
    const parsed = parseCsv(await file.text());
    if (parsed === null) setErr('I couldn’t find “Name” and “Email” columns in that file. Check the first row.');
    else if (parsed.length === 0) setErr('That file has no staff rows.');
    else setRows(toRows(parsed));
  };
  const edit = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const chosen = (rows || []).filter((r) => r.selected && !r.inHms);
  const incomplete = chosen.filter((r) => !r.role || !r.deptKey);

  const run = async () => {
    setBusy(true); setErr('');
    try { setResult(await api.importStaff({ rows: chosen.map((r) => ({ portalId: r.portalId, name: r.name, title: r.title, email: r.email, phone: r.phone, role: r.role, department: r.deptKey })) })); onImported(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal xwide" role="dialog" aria-modal="true" aria-label="Import staff" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Import staff from the portal</h2>
        {result ? (
          <>
            <p><b>{result.added.length}</b> added{result.skipped.length > 0 && <>, <b>{result.skipped.length}</b> skipped</>}.</p>
            {result.skipped.length > 0 && <ul className="plainlist">{result.skipped.map((s, i) => <li key={i}>{s.name}: {s.reason}</li>)}</ul>}
            <p className="muted small-text">Next: send invitations from the directory. Nobody can sign in until they’re invited.</p>
            <div className="modal-actions"><button className="btn primary" onClick={onClose}>Done</button></div>
          </>
        ) : !rows ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>Names, job titles and contact details come from the portal. Passwords never do. You’ll check each person’s role before anything is added.</p>
            <div className="actions" style={{ marginTop: 0 }}>
              <button className="btn primary" onClick={fetchPortal} disabled={busy}>{busy ? 'Contacting the portal…' : 'Fetch from the staff portal'}</button>
              <label className="btn"><Upload size={14} aria-hidden /> Or upload a CSV file<input type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files[0])} /></label>
            </div>
            <p className="muted small-text">A CSV needs a first row with at least Name and Email. Title, Phone, Department and ID are used if present.</p>
            {err && <p className="form-error" role="alert">{err}</p>}
            <div className="modal-actions"><button className="btn" onClick={onClose}>Cancel</button></div>
          </>
        ) : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th /><th>Person</th><th>Access role</th><th>Department</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.key} className={r.inHms ? 'dim' : ''}>
                  <td><input type="checkbox" aria-label={`Add ${r.name}`} checked={r.selected && !r.inHms} disabled={r.inHms} onChange={(e) => edit(r.key, { selected: e.target.checked })} /></td>
                  <td><b>{r.name}</b>{r.inHms && <span className="badge" style={{ marginLeft: 6 }}>Already in the HMS</span>}<div className="muted small-text">{r.title} · {r.email}</div></td>
                  <td><select aria-label={`Role for ${r.name}`} value={r.role} disabled={r.inHms} onChange={(e) => edit(r.key, { role: e.target.value })}><option value="">Choose…</option>{ROLE_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                  <td><select aria-label={`Department for ${r.name}`} value={r.deptKey} disabled={r.inHms} onChange={(e) => edit(r.key, { deptKey: e.target.value })}><option value="">Choose…</option>{DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select>
                    {r.department && !r.deptKey && !r.inHms && <div className="muted small-text">Portal says “{r.department}”</div>}</td>
                </tr>))}</tbody>
            </table></div>
            <p className="muted small-text">Roles are suggested from job titles. Check them: the role decides what a person can open. Anyone you leave unticked stays out.</p>
            {err && <p className="form-error" role="alert">{err}</p>}
            {incomplete.length > 0 && <p className="form-error">Choose a role and department for every ticked person ({incomplete.length} missing).</p>}
            <div className="modal-actions"><button className="btn" onClick={() => setRows(null)}>Back</button><button className="btn primary" onClick={run} disabled={busy || chosen.length === 0 || incomplete.length > 0}>{busy ? 'Adding…' : `Add ${chosen.length} staff`}</button></div>
          </>)}
      </div>
    </div>
  );
}
