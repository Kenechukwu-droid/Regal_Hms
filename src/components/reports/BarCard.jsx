import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function BarCard({ title, data, x = 'name', y = 'count', format = (v) => v, horizontal = false, empty = 'Nothing to show for this period.' }) {
  return (
    <section className="card"><h2>{title}</h2>
      {data.length === 0 || data.every((d) => !d[y]) ? <p className="muted">{empty}</p> : (
        <div style={{ height: Math.max(220, horizontal ? data.length * 38 + 40 : 220) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: horizontal ? 24 : -8, bottom: 0 }}>
              <CartesianGrid stroke="#dde6e0" horizontal={!horizontal} vertical={horizontal} />
              {horizontal ? <><XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} /><YAxis type="category" dataKey={x} width={130} tickLine={false} axisLine={false} /></>
                : <><XAxis dataKey={x} tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={format} /></>}
              <Tooltip formatter={(v) => format(v)} cursor={{ fill: '#e6f4ec' }} />
              <Bar dataKey={y} fill="#1f7a4d" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>)}
    </section>
  );
}
