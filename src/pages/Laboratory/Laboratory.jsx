import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import LabRequestForm from '../../components/laboratory/LabRequestForm';
import { fmtDateTime } from '../../components/aftercare/constants';
import { useAuth } from '../../context/AuthContext';
import { OPEN_STATUSES, flaggedResults, inLabQueue, isLabStaff, labActions } from '../../utils/laboratory';
import { api } from '../../services/api';

const STAGES = [['Requested', 'To collect'], ['Collected', 'Awaiting results'], ['Resulted', 'To review'], ['Reviewed', 'Reviewed']];

export default function Laboratory() {
  const { user } = useAuth();
  const me = user.staffId;
  const worker = isLabStaff(user);   // a member of the Laboratory department
  const [params, setParams] = useSearchParams();
  const patientFilter = params.get('patient');
  const [rows, setRows] = useState(null);
  const [patients, setPatients] = useState([]);
  const [view, setView] = useState(worker ? 'Lab queue' : 'All requests');
  const [stage, setStage] = useState('Open');   // 'Open' = everything still in progress
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => { api.getLabRequests({ patientId: patientFilter }).then(setRows); }, [patientFilter]);
  useEffect(load, [load]);
  useEffect(() => { api.getPatients().then(setPatients); }, []);

  const views = useMemo(() => {
    const all = [['All requests', () => true]];
    return worker ? [['Lab queue', inLabQueue], ['My work', (r) => r.takenById === me && ['Requested', 'Collected', 'Resulted'].includes(r.status)], ...all]
      : [['My requests', (r) => r.requestedById === me], ...all];
  }, [worker, me]);
  const counts = useMemo(() => Object.fromEntries(STAGES.map(([s]) => [s, (rows || []).filter((r) => r.status === s).length])), [rows]);
  if (rows === null) return <p className="empty">Loading laboratory…</p>;

  const inView = (views.find(([n]) => n === view) ?? views[views.length - 1])[1];
  const shown = rows.filter((r) => inView(r) && (stage === 'Open' ? OPEN_STATUSES.includes(r.status) : stage === 'All' ? true : r.status === stage)
    && `${r.patient} ${r.test}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.priority === 'Urgent' ? 0 : 1) - (b.priority === 'Urgent' ? 0 : 1) || a.requestedAt.localeCompare(b.requestedAt));
  const create = async (body) => { await api.createLabRequests(body); load(); };
  const take = async (id) => { setBusyId(id); setError(''); try { await api.takeLabRequest(id); load(); } catch (e) { setError(e.message); } setBusyId(''); };

  return (
    <>
      <PageHeader title="Laboratory" subtitle={worker ? 'The laboratory’s queue. Take a request to do the lab work, from sample to result. A different surgeon signs the result off.' : 'Ask the laboratory for tests and follow them from sample to signed-off result. Tests ticked in a consultation are requested automatically.'}
        action={<button className="btn primary" onClick={() => setForm({})}><FlaskConical size={16} aria-hidden /> New request</button>} />
      {patientFilter && <p className="filter-chip">Showing one patient only. <button className="linklike" onClick={() => setParams({})}>Show everyone</button></p>}
      <div className="tabs" role="tablist">{views.map(([n, fn]) => (
        <button key={n} role="tab" aria-selected={view === n} className={view === n ? 'on' : ''} onClick={() => setView(n)}>
          {n}{n !== 'All requests' ? ` (${rows.filter((r) => fn(r) && OPEN_STATUSES.includes(r.status)).length})` : ''}</button>))}</div>
      <div className="journey">
        {STAGES.map(([s, label]) => (
          <button key={s} className={stage === s ? 'on' : ''} onClick={() => setStage(stage === s ? 'Open' : s)}><b>{counts[s]}</b>{label}</button>))}
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search patient or test" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search lab requests" />
        <select className="role-filter" value={['Open', 'All', 'Cancelled'].includes(stage) ? stage : 'Open'} onChange={(e) => setStage(e.target.value)} aria-label="Show">
          <option value="Open">In progress</option><option value="All">Everything</option><option value="Cancelled">Cancelled</option></select>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="card table-wrap">
        {shown.length === 0 ? <p className="empty">{view === 'Lab queue' && rows.length > 0 ? 'Nothing is waiting in the laboratory queue.' : rows.length === 0 ? 'No lab requests yet.' : 'No requests match. Clear the search or change the filter.'}</p> : (
          <table>
            <thead><tr><th>Test</th><th>Patient</th><th>Requested</th><th>By</th><th>Lab work</th><th>Status</th><th /></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id}>
                <td><Link className="plink" to={`/laboratory/${r.id}`}>{r.test}</Link>{r.priority === 'Urgent' && <span className="badge bad" style={{ marginLeft: 8 }}>Urgent</span>}</td>
                <td>{r.patient}</td><td>{fmtDateTime(r.requestedAt)}</td><td>{r.requestedBy}</td>
                <td>{r.takenById ? (r.takenById === me ? 'You' : r.takenByName) : ['Requested', 'Collected'].includes(r.status) ? <span className="muted">In queue</span> : <span className="muted">{r.resultedBy || '—'}</span>}</td>
                <td><StatusBadge value={r.status} /></td>
                <td>{labActions(r, user).take && <button className="btn small primary" disabled={busyId === r.id} onClick={() => take(r.id)}>Take request</button>}
                  {r.status === 'Resulted' && flaggedResults(r).length > 0 && <span className="badge bad">Abnormal</span>}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
      {form && <LabRequestForm patients={patients} initialPatientId={patientFilter || ''} requestedBy={user.name} onSave={create} onClose={() => setForm(null)} />}
    </>
  );
}
