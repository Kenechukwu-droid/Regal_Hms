import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import PatientForm from '../../components/patients/PatientForm';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../services/api';
import { stages } from '../../services/mockData';

export default function Patients() {
  const { data, setData, loading } = useFetch(api.getPatients);
  const [stage, setStage] = useState('All');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => Object.fromEntries(stages.map((s) => [s, (data || []).filter((p) => p.stage === s).length])), [data]);
  const rows = useMemo(() => (data || []).filter((p) =>
    (stage === 'All' || p.stage === stage) && `${p.name} ${p.id} ${p.procedure}`.toLowerCase().includes(q.toLowerCase())), [data, stage, q]);

  const save = async (form) => {
    const created = await api.createPatient(form);
    setData([created, ...data]);
    setOpen(false);
  };

  if (loading) return <p className="empty">Loading patients…</p>;
  return (
    <>
      <PageHeader title="Patients" subtitle="Everyone in the centre, by where they are in their journey."
        action={<button className="btn primary" onClick={() => setOpen(true)}><UserPlus size={16} /> Register patient</button>} />
      <div className="journey">
        {stages.map((s) => (
          <button key={s} className={stage === s ? 'on' : ''} onClick={() => setStage(stage === s ? 'All' : s)}>
            <b>{counts[s]}</b>{s}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search name, ID or procedure" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patients" />
      </div>
      <div className="card table-wrap">
        {rows.length === 0 ? <p className="empty">No patients match. Clear the search or stage filter.</p> : (
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Procedure</th><th>Surgeon</th><th>Stage</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}><td>{p.id}</td><td><Link className="plink" to={`/patients/${p.id}`}>{p.name}</Link></td><td>{p.age}</td><td>{p.procedure}</td><td>{p.surgeon}</td><td><StatusBadge value={p.stage} /></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {open && <PatientForm onSave={save} onClose={() => setOpen(false)} />}
    </>
  );
}
