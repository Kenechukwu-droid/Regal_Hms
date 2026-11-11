export default function KpiCard({ label, value, note }) {
  return (
    <div className="card kpi">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="n">{note}</div>
    </div>
  );
}
