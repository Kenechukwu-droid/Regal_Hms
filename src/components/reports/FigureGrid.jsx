// The numbers the system worked out for a department. The head can't edit them.
export default function FigureGrid({ figures }) {
  return (
    <div className="grid kpis">{figures.map((f) => (
      <div className="card kpi" key={f.label}><div className="l">{f.label}</div><div className="v">{f.value}</div>{f.note && <div className="n">{f.note}</div>}</div>))}</div>
  );
}
