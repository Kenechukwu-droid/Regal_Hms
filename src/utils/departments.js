// Each department's head writes one report a month. The figures come from the system; the words come from the head.
export const DEPARTMENTS = [
  { key: 'frontdesk', label: 'Front desk', blurb: 'Appointments and bookings' },
  { key: 'clinic', label: 'Clinic', blurb: 'Consultations and surgical planning' },
  { key: 'theatre', label: 'Theatre', blurb: 'Surgery and the theatre list' },
  { key: 'aftercare', label: 'Aftercare', blurb: 'Recovery and follow-ups' },
  { key: 'laboratory', label: 'Laboratory', blurb: 'Tests and results' },
  { key: 'pharmacy', label: 'Pharmacy', blurb: 'Medicines and stock' },
  { key: 'finance', label: 'Finance', blurb: 'Quotations, invoices and receipts (counts only, no money)' },
];
export const deptLabel = (key) => DEPARTMENTS.find((d) => d.key === key)?.label ?? '';
export const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const monthRange = (m) => { const [y, mm] = m.split('-').map(Number); const last = new Date(y, mm, 0).getDate(); return [`${m}-01`, `${m}-${String(last).padStart(2, '0')}`]; };
export const shiftMonth = (m, n) => { const [y, mm] = m.split('-').map(Number); const d = new Date(y, mm - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
