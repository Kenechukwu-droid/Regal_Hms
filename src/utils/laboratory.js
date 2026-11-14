// Reference ranges below are general adult placeholders. Replace them with the laboratory's own ranges.
export const STATUSES = ['Requested', 'Collected', 'Resulted', 'Reviewed', 'Cancelled'];
export const OPEN_STATUSES = ['Requested', 'Collected', 'Resulted'];

const num = (key, label, unit, low, high, extra = {}) => ({ key, label, type: 'number', unit, low, high, ...extra });
const sel = (key, label, options, abnormal = []) => ({ key, label, type: 'select', options, abnormal });
const txt = (key, label) => ({ key, label, type: 'text' });
const reading = (stem) => ({ sample: 'None (recording or imaging)', fields: [sel('interp', 'Interpretation', ['Normal', 'Abnormal'], ['Abnormal']), txt('findings', `${stem} findings`)] });

export const TESTS = {
  'Full blood count': { sample: 'Blood (EDTA)', fields: [
    num('hb', 'Haemoglobin', 'g/dL', 12, 17.5, { bySex: { Female: [12, 15.5], Male: [13.5, 17.5] } }),
    num('wbc', 'White cell count', '×10⁹/L', 4, 11), num('plt', 'Platelets', '×10⁹/L', 150, 400)] },
  'Electrolytes, urea and creatinine': { sample: 'Blood (serum)', fields: [
    num('na', 'Sodium', 'mmol/L', 135, 145), num('k', 'Potassium', 'mmol/L', 3.5, 5.1),
    num('urea', 'Urea', 'mmol/L', 2.5, 7.8), num('creat', 'Creatinine', 'µmol/L', 45, 110)] },
  'Blood group and genotype': { sample: 'Blood (EDTA)', fields: [
    sel('group', 'Blood group', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']), sel('genotype', 'Genotype', ['AA', 'AS', 'AC', 'SS', 'SC'], ['SS', 'SC'])] },
  'Fasting blood glucose': { sample: 'Blood (fluoride)', fields: [num('glu', 'Fasting glucose', 'mmol/L', 3.9, 5.5)] },
  'Pregnancy test': { sample: 'Urine', fields: [sel('result', 'Result', ['Negative', 'Positive'], ['Positive'])] },
  ECG: reading('ECG'),
  'Chest X-ray': reading('X-ray'),
  Echocardiogram: reading('Echo'),
};
export const TEST_NAMES = Object.keys(TESTS);
export const isProcedure = (test) => TESTS[test].sample.startsWith('None');

export const rangeOf = (f, sex) => f.bySex?.[sex] ?? [f.low, f.high];
export const refText = (f, sex) => { if (f.type !== 'number') return ''; const [lo, hi] = rangeOf(f, sex); return `${lo} to ${hi} ${f.unit}`; };

export function fieldFlag(f, value, sex) {
  if (value === '' || value == null) return '';
  if (f.type === 'number') { const v = Number(value); if (!Number.isFinite(v)) return ''; const [lo, hi] = rangeOf(f, sex); return v < lo ? 'Low' : v > hi ? 'High' : 'Normal'; }
  if (f.type === 'select') return f.abnormal.includes(value) ? 'Abnormal' : 'Normal';
  return '';
}
export const flaggedResults = (r) => TESTS[r.test].fields
  .map((f) => ({ label: f.label, value: r.results[f.key], flag: fieldFlag(f, r.results[f.key], r.sex), unit: f.unit || '' }))
  .filter((x) => x.flag && x.flag !== 'Normal');
export const missingFields = (r) => TESTS[r.test].fields.filter((f) => f.type !== 'text' && String(r.results[f.key] ?? '').trim() === '').map((f) => f.label);
export const validateResults = (r) => TESTS[r.test].fields.filter((f) => f.type === 'number' && r.results[f.key] !== '' && r.results[f.key] != null)
  .filter((f) => !Number.isFinite(Number(r.results[f.key])) || Number(r.results[f.key]) < 0).map((f) => `${f.label} must be a number, 0 or more.`);

// ---- who does what in the laboratory ----
// The laboratory is a department of its own, like Theatre or Aftercare, with its own staff (nurses or surgeons whose department is Laboratory).
// Other departments work with it: the clinic, theatre and aftercare (DEPARTMENT_PAIRS) send it requests and receive the results.
// Requests wait in the laboratory's queue. A member of the laboratory takes one and does the lab work (sample or procedure, then results).
// Only the person who took it can do those steps. The result is signed off by a surgeon or the Medical Director, never by the person who entered it.
// The Medical Director requests tests, signs off and cancels, but does not do the lab work.
// The backend must enforce every rule below. The screens only use them to decide which buttons to show.
export const LAB_DEPT = 'laboratory';
export const LAB_WORKERS = ['nurse', 'surgeon'];      // roles a laboratory team member can have
export const LAB_REVIEWERS = ['director', 'surgeon'];
const uid = (u) => u.staffId ?? u.id;
export const isLabStaff = (u) => !!u && u.department === LAB_DEPT && LAB_WORKERS.includes(u.role);
// Who may ask the laboratory for a test: the Medical Director, the laboratory itself, and the departments that work with it.
export const canRequestLab = (u, linked) => !!u && (u.role === 'director' || u.department === LAB_DEPT || (linked || []).includes(u.department));
export const isLabOpen = (r) => ['Requested', 'Collected'].includes(r.status);   // still needs lab work
export const inLabQueue = (r) => isLabOpen(r) && !r.takenById;

export function labActions(r, u) {
  const me = uid(u); const open = isLabOpen(r); const mine = !!r.takenById && r.takenById === me;
  const worker = isLabStaff(u);
  return {
    take: open && !r.takenById && worker,
    release: open && !!r.takenById && (mine || (!!u.isHead && u.department === LAB_DEPT)),
    work: open && mine && worker,
    review: r.status === 'Resulted' && LAB_REVIEWERS.includes(u.role) && r.resultedById !== me,
    ownWork: r.status === 'Resulted' && !!r.resultedById && r.resultedById === me,
    cancel: !['Reviewed', 'Cancelled'].includes(r.status) && LAB_REVIEWERS.includes(u.role),
  };
}
