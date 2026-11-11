import { todayISO } from './dates';

export const ANAESTHESIA = ['General anaesthesia', 'Local with sedation', 'Local anaesthesia'];
export const ADMISSIONS = ['Day case', 'Overnight stay', 'Two or more nights'];
export const CONSENT_STATUSES = ['Not obtained', 'Obtained', 'Withdrawn'];
export const CLEARANCE_STATUSES = ['Pending', 'Approved', 'Approved with conditions', 'Declined'];

const GENERIC_ITEMS = [
  { key: 'medication', label: 'Medication reviewed: blood thinners and supplements stopped as advised', required: true },
  { key: 'smoking', label: 'Smoking and alcohol advice given', required: true },
  { key: 'pregnancy', label: 'Pregnancy test negative', required: true, allowNA: true },
  { key: 'fasting', label: 'Fasting instructions given', required: true },
  { key: 'escort', label: 'Escort and transport home arranged', required: true },
  { key: 'aftercare', label: 'Post-op care and compression garments explained', required: true },
  { key: 'photos', label: 'Pre-op photographs taken', required: false },
  { key: 'overnight', label: 'Overnight stay arranged', required: false, allowNA: true },
];

// One "result reviewed" item is added for every investigation requested in the consultation.
export const buildChecklist = (investigations = []) => [
  ...investigations.map((n, i) => ({ key: `inv-${i}`, label: `Result reviewed: ${n}`, required: true })),
  ...GENERIC_ITEMS,
].map((i) => ({ allowNA: false, state: 'pending', by: '', at: '', ...i }));

export const buildConsents = () => [{ key: 'surgical', label: 'Surgical consent' }, { key: 'anaesthesia', label: 'Anaesthesia consent' }]
  .map((c) => ({ ...c, status: 'Not obtained', by: '', date: '', witness: '', filed: false, note: '' }));

export const buildClearances = () => [
  { key: 'surgeon', label: 'Surgeon clearance', required: true },
  { key: 'anaesthetic', label: 'Anaesthetic clearance', required: true },
  { key: 'medical', label: 'Physician clearance (if medical conditions)', required: false },
].map((c) => ({ ...c, status: 'Pending', by: '', date: '', note: '' }));

const consentIssue = (c) => {
  if (c.status === 'Withdrawn') return 'was withdrawn';
  if (c.status !== 'Obtained') return 'not yet obtained';
  if (!c.by || !c.date || !c.witness) return 'needs who obtained it, the date and a witness';
  if (c.date > todayISO()) return 'has a date in the future';
  if (!c.filed) return 'signed form not yet filed';
  return '';
};
const clearanceIssue = (c) => {
  if (c.status === 'Declined') return 'declined';
  if (c.status === 'Approved with conditions' && !c.note.trim()) return 'approved with conditions, but the conditions aren’t written';
  if (c.required && c.status === 'Pending') return 'pending';
  return '';
};

// What stops a plan being marked "Ready". The backend must enforce the same rules.
export function getBlockers(p) {
  const out = [];
  if (!p.targetDate) out.push('Set a target date');
  else if (p.targetDate < todayISO()) out.push('Target date has passed');
  if (!p.anaesthesia) out.push('Choose the anaesthesia type');
  const open = p.checklist.filter((i) => i.required && i.state === 'pending').length;
  if (open) out.push(`${open} required checklist item${open > 1 ? 's' : ''} not done`);
  p.consents.forEach((c) => { const m = consentIssue(c); if (m) out.push(`${c.label} ${m}`); });
  p.clearances.forEach((c) => { const m = clearanceIssue(c); if (m) out.push(`${c.label} ${m}`); });
  return out;
}

export function getProgress(p) {
  const req = p.checklist.filter((i) => i.required);
  const clr = p.clearances.filter((c) => c.required || c.status !== 'Pending');
  const done = req.filter((i) => i.state !== 'pending').length
    + p.consents.filter((c) => !consentIssue(c)).length
    + clr.filter((c) => !clearanceIssue(c) && c.status !== 'Pending').length;
  const total = req.length + p.consents.length + clr.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
