import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function RevenueChart({ data }) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#e3e4ea" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} unit="M" />
          <Tooltip formatter={(v) => `₦${v}M`} />
          <Area dataKey="revenue" name="Revenue" stroke="#3a2252" fill="#ece6f3" strokeWidth={2} />
          <Line dataKey="target" name="Target" stroke="#b48a3c" strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
