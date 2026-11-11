import PageHeader from '../../components/common/PageHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import RevenueChart from '../../components/dashboard/RevenueChart';
import SurgeryList from '../../components/surgery/SurgeryList';
import { useFetch } from '../../hooks/useFetch';
import { useRole } from '../../context/RoleContext';
import { ROLES } from '../../routes/modules';
import { api } from '../../services/api';

export default function Dashboard() {
  const { role } = useRole();
  const { data, loading, error } = useFetch(api.getDashboard);
  if (loading) return <p className="empty">Loading dashboard…</p>;
  if (error) return <p className="empty">Couldn’t load the dashboard. Check the connection and refresh.</p>;

  // Finance doesn't need clinical KPIs; show revenue only
  const kpis = role === 'finance' ? data.kpis.filter((k) => k.id === 'revenue') : data.kpis;

  return (
    <>
      <PageHeader title="Good morning" subtitle={`${ROLES[role]} view · Wednesday, 11 November 2026`} />
      <div className="grid kpis">{kpis.map((k) => <KpiCard key={k.id} {...k} />)}</div>
      <div className="grid two" style={{ marginBottom: 16 }}>
        <section className="card"><h2>Revenue vs target (₦ millions)</h2><RevenueChart data={data.revenue} /></section>
        <section className="card"><h2>Needs attention</h2>
          <ul className="list">
            {data.alerts.filter((a) => !a.roles || a.roles.includes(role)).map((a) => <li key={a.id} className={`alert ${a.level === 'high' ? 'high' : ''}`}>{a.text}</li>)}
          </ul>
        </section>
      </div>
      <div className="grid two">
        <section className="card"><h2>Today’s theatre list</h2><SurgeryList items={data.surgeries} /></section>
        <section className="card"><h2>Recent activity</h2>
          <ul className="list">{data.activity.map((a) => <li key={a.id}><time>{a.time}</time>{a.text}</li>)}</ul>
        </section>
      </div>
    </>
  );
}
