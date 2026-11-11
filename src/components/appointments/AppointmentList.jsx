import StatusBadge from '../common/StatusBadge';

export default function AppointmentList({ items }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>With</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}><td>{a.time}</td><td>{a.patient}</td><td>{a.type}</td><td>{a.with}</td><td><StatusBadge value={a.status} /></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
