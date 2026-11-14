import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import RevenueChart from '../../components/dashboard/RevenueChart';
import SurgeryList from '../../components/surgery/SurgeryList';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/modules';
import { can } from '../../utils/permissions';
import { api } from '../../services/api';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { user } = useAuth();
  const role = user.role;
  const { data, loading, error } = useFetch(api.getDashboard);
  if (loading) return <p className="empty">Loading dashboard…</p>;
  if (error) return <p className="empty">Couldn’t load the dashboard. Check the connection and refresh.</p>;

  const canRevenue = can(role, 'viewRevenue');   // Finance and Medical Director only
  const clinical = role !== 'finance';           // Finance doesn't need patient or theatre details
  const kpis = data.kpis.filter((k) => (k.id === 'revenue' ? canRevenue : clinical));
  const visible = (x) => (x.roles ?? ['director', 'surgeon', 'nurse', 'frontdesk']).includes(role);

  const Chart = () => <section className="card"><h2>Revenue vs target (₦ millions)</h2><RevenueChart data={data.revenue} /></section>;
  const Alerts = () => (
    <section className="card"><h2>Needs attention</h2>
      {data.alerts.filter(visible).length === 0 ? <p className="muted">Nothing needs attention.</p> : (
        <ul className="list">{data.alerts.filter(visible).map((a) => <li key={a.id} className={`alert ${a.level === 'high' ? 'high' : ''}`}>{a.text}</li>)}</ul>)}
    </section>
  );
  const Theatre = () => <section className="card"><h2>Today’s theatre list</h2><SurgeryList items={data.surgeries} /></section>;
  const Activity = () => (
    <section className="card"><h2>Recent activity</h2>
      <ul className="list">{data.activity.filter(visible).map((a) => <li key={a.id}><time>{a.time}</time>{a.text}</li>)}</ul>
    </section>
  );

  if (role === 'hr' || role === 'pharmacist') {
    return (
      <>
        <PageHeader title={`${greeting()}, ${user.name}`} subtitle={`${ROLES[role]} view`} />
        <div className="grid two"><Alerts />
          {role === 'hr'
            ? <section className="card"><h2>Staff</h2><p>Add people, import from the staff portal, and look after sign-in accounts.</p><Link className="btn primary" to="/staff">Open staff</Link></section>
            : <section className="card"><h2>Pharmacy</h2><p>Prescriptions waiting to be dispensed, and stock levels and expiry dates.</p><Link className="btn primary" to="/pharmacy">Open pharmacy</Link></section>}</div>
      </>);
  }

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name}`} subtitle={`${ROLES[role]} view · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} />
      {kpis.length > 0 && <div className="grid kpis">{kpis.map((k) => <KpiCard key={k.id} {...k} />)}</div>}
      <div className="grid two" style={{ marginBottom: 16 }}>{canRevenue ? <><Chart /><Alerts /></> : <><Alerts /><Activity /></>}</div>
      {clinical && (canRevenue ? <div className="grid two"><Theatre /><Activity /></div> : <Theatre />)}
      {!clinical && <Activity />}
    </>
  );
}
