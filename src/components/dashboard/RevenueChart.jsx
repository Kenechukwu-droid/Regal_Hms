import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function RevenueChart({ data }) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#dde6e0" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} unit="M" />
          <Tooltip formatter={(v) => `₦${v}M`} />
          <Area dataKey="revenue" name="Revenue" stroke="#1f7a4d" fill="#d6eee1" strokeWidth={2} />
          <Line dataKey="target" name="Target" stroke="#5d6b63" strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
