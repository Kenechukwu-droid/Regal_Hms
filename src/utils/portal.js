import { DEPARTMENTS } from './departments';

// Guesses an access role from a job title. The Staff Administrator always confirms it; a Medical Director is never guessed.
export function suggestRole(title = '') {
  const t = title.toLowerCase();
  if (/pharmac/.test(t)) return 'pharmacist';
  if (/surgeon|doctor|physician|consultant|anaesthet|anesthet|\bdr\b/.test(t)) return 'surgeon';
  if (/nurse|midwi/.test(t)) return 'nurse';
  if (/reception|front desk|frontdesk|secretary/.test(t)) return 'frontdesk';
  if (/account|finance|cashier|bursar/.test(t)) return 'finance';
  return '';
}
export function suggestDepartment(name = '') {
  const n = name.toLowerCase();
  return DEPARTMENTS.find((d) => d.label.toLowerCase() === n || d.key === n)?.key ?? '';
}

// Reads a CSV exported from the portal. Needs a header row; understands quoted cells.
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i += 1; row.push(cell); cell = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const ix = { name: col('name', 'full name'), email: col('email', 'email address'), title: col('title', 'job title', 'position'), phone: col('phone', 'phone number'), department: col('department', 'dept'), portalId: col('id', 'portal id', 'staff id') };
  if (ix.name < 0 || ix.email < 0) return null;   // can't tell which columns are which
  return rows.slice(1).map((r) => Object.fromEntries(Object.entries(ix).map(([k, i]) => [k, i < 0 ? '' : (r[i] ?? '').trim()])));
}
