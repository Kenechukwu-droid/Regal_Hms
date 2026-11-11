// All dates are ISO strings (YYYY-MM-DD) in local time; times are "HH:MM".
export const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (iso, n) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
export const startOfWeek = (iso) => { const d = fromISO(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toISO(d); };
export const todayISO = () => toISO(new Date());
export const isSunday = (iso) => fromISO(iso).getDay() === 0;
export const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const fmtDay = (iso, opts) => fromISO(iso).toLocaleDateString('en-GB', opts);
