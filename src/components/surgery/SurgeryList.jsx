import StatusBadge from '../common/StatusBadge';

export default function SurgeryList({ items }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Patient</th><th>Procedure</th><th>Theatre</th><th>Surgeon</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.id}>
              <td>{s.time}</td><td>{s.patient}</td><td>{s.procedure}</td><td>{s.theatre}</td><td>{s.surgeon}</td>
              <td><StatusBadge value={s.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
