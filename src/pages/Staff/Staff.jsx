import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import DepartmentOverview from '../../components/reports/DepartmentOverview';
import StaffDirectory from '../../components/staff/StaffDirectory';
import PermissionsMatrix from '../../components/staff/PermissionsMatrix';
import LinkModal from '../../components/staff/LinkModal';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';
import { api } from '../../services/api';

// Three different people use this page:
//  - the Medical Director reads the department reports and can look at the staff list;
//  - the Staff Administrator adds people and looks after sign-in;
//  - a department head is taken straight to their own report.
export default function Staff() {
  const { user } = useAuth();
  const role = user.role;
  const manage = can(role, 'manageStaff');
  const tabs = role === 'director' ? ['Department reports', 'Staff directory', 'Roles and permissions'] : manage ? ['Staff directory', 'Roles and permissions'] : [];
  const [tab, setTab] = useState(tabs[0]);
  const [staff, setStaff] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [linkResult, setLinkResult] = useState(null);   // { title, ...result }
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStaff(await api.getStaff());
    if (manage) setAccounts(await api.getAccounts());
  }, [manage]);
  useEffect(() => { if (tabs.length) load().catch(() => setError('Couldn’t load staff.')); }, [load]); // eslint-disable-line

  if (tabs.length === 0 && user.isHead) return <Navigate to={`/staff/reports/${user.department}/${new Date().toISOString().slice(0, 7)}`} replace />;

  const run = (fn) => async (...args) => { setError(''); try { await fn(...args); await load(); } catch (e) { setError(e.message); } };
  const save = async (x, invite) => {
    const saved = await api.saveStaff(x);
    if (invite) setLinkResult({ title: `Invitation for ${saved.name}`, ...(await api.sendInvite(saved.id)) });
    await load();
  };
  const invite = run(async (id) => setLinkResult({ title: 'Sign-in invitation', ...(await api.sendInvite(id)) }));
  const reset = run(async (id) => setLinkResult({ title: 'Password reset link', ...(await api.sendReset(id)) }));
  const resetTwoStep = run((id) => api.resetTwoStep(id));
  const unlock = run((id) => api.unlockAccount(id));

  return (
    <>
      <PageHeader title="Staff & reports" subtitle={manage ? 'Who works here and who can sign in.' : 'What each department reports, and who works here.'} />
      <div className="tabs" role="tablist">{tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Department reports' && <DepartmentOverview />}
      {tab === 'Staff directory' && (staff ? <StaffDirectory staff={staff} accounts={accounts} manage={manage} onSave={save} onInvite={invite} onReset={reset} onResetTwoStep={resetTwoStep} onUnlock={unlock} onImported={load} error={error} /> : <p className="empty">Loading staff…</p>)}
      {tab === 'Roles and permissions' && <PermissionsMatrix />}
      {linkResult && <LinkModal title={linkResult.title} result={linkResult} onClose={() => setLinkResult(null)} />}
    </>
  );
}
