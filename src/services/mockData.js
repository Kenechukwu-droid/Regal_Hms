import { addDays, isSunday, startOfWeek, todayISO } from '../utils/dates';
import { buildChecklist, buildClearances, buildConsents } from '../utils/planning';
import { buildFollowUps } from '../utils/aftercare';
import { defaultValidUntil, invoiceTotal, newLines } from '../utils/billing';
import { INVOICE_DUE_DAYS } from '../components/billing/constants';
// Demonstration data only. Not real patients.
export const patients = [
  { id: 'RPS-1042', name: 'Adaeze Okafor', age: 34, procedure: 'Rhinoplasty', surgeon: 'Dr. Bello', stage: 'Pre-op', phone: '0803 555 0142' },
  { id: 'RPS-1041', name: 'Ngozi Eze', age: 41, procedure: 'Abdominoplasty', surgeon: 'Dr. Bello', stage: 'Surgery', phone: '0805 555 0178' },
  { id: 'RPS-1039', name: 'Tamuno Briggs', age: 29, procedure: 'Blepharoplasty', surgeon: 'Dr. Amadi', stage: 'Recovery', phone: '0809 555 0113' },
  { id: 'RPS-1036', name: 'Chiamaka Obi', age: 38, procedure: 'Breast augmentation', surgeon: 'Dr. Amadi', stage: 'Consultation', phone: '0802 555 0190' },
  { id: 'RPS-1033', name: 'Ibinabo Harry', age: 46, procedure: 'Facelift', surgeon: 'Dr. Bello', stage: 'Follow-up', phone: '0807 555 0156' },
  { id: 'RPS-1030', name: 'Ifeoma Nwosu', age: 31, procedure: 'Liposuction', surgeon: 'Dr. Amadi', stage: 'Registered', phone: '0812 555 0121' },
];
export const stages = ['Registered', 'Consultation', 'Pre-op', 'Surgery', 'Recovery', 'Follow-up'];

export const kpis = [
  { id: 'surgeries', label: 'Surgeries today', value: '4', note: '1 in progress' },
  { id: 'consults', label: 'Consultations today', value: '9', note: '3 remaining' },
  { id: 'recovery', label: 'Patients in recovery', value: '17', note: '2 need review' },
  { id: 'revenue', label: 'Revenue this month', value: '₦48.2M', note: '+12% on last month' },
];
export const revenue = [
  { month: 'May', revenue: 31.4, target: 35 }, { month: 'Jun', revenue: 36.8, target: 35 },
  { month: 'Jul', revenue: 33.1, target: 38 }, { month: 'Aug', revenue: 40.5, target: 38 },
  { month: 'Sep', revenue: 42.9, target: 40 }, { month: 'Oct', revenue: 43.0, target: 42 },
  { month: 'Nov', revenue: 48.2, target: 45 },
];
export const alerts = [
  { id: 1, level: 'high', roles: ['director', 'surgeon', 'nurse'], text: 'Consent form missing for Adaeze Okafor (surgery 10:30)' },
  { id: 2, level: 'medium', text: 'Anaesthetic stock below reorder level' },
  { id: 3, level: 'medium', text: '2 recovery patients overdue for review' },
];
export const activity = [
  { id: 1, time: '09:12', text: 'Dr. Bello started surgery for Ngozi Eze' },
  { id: 2, time: '08:40', text: 'Pre-op clearance approved for Adaeze Okafor' },
  { id: 3, time: '08:05', text: 'New patient registered: Ifeoma Nwosu' },
  { id: 4, time: '07:50', text: 'Invoice INV-2291 paid in full', roles: ['director', 'frontdesk', 'finance'] },
];

// Detailed profiles keyed by patient ID. Demo data only.
export const profiles = {
  'RPS-1042': {
    dob: '1992-03-14', sex: 'Female', bloodGroup: 'O+', heightCm: 165, weightKg: 62,
    email: 'adaeze.okafor@example.com', address: 'Old GRA, Port Harcourt',
    emergency: { name: 'Chidi Okafor', relation: 'Husband', phone: '0803 555 0199' },
    allergies: [
      { id: 1, substance: 'Penicillin', reaction: 'Rash, facial swelling', severity: 'severe' },
      { id: 2, substance: 'Latex', reaction: 'Skin irritation', severity: 'moderate' },
    ],
    conditions: [
      { id: 1, name: 'Mild asthma', since: '2008', status: 'Controlled' },
      { id: 2, name: 'Seasonal rhinitis', since: '2015', status: 'Active' },
    ],
    medications: [
      { id: 1, name: 'Salbutamol inhaler', dose: 'As needed' },
      { id: 2, name: 'Cetirizine 10mg', dose: 'Once daily' },
    ],
    pastSurgeries: [{ id: 1, name: 'Appendectomy', year: '2011', note: 'No complications' }],
    familyHistory: 'Mother: hypertension. Father: type 2 diabetes.',
    lifestyle: { smoking: 'Never', alcohol: 'Occasional' },
    timeline: [
      { id: 1, date: '2026-10-02', type: 'Registered', title: 'Registered at the centre', by: 'Front desk' },
      { id: 2, date: '2026-10-05', type: 'Consultation', title: 'Initial rhinoplasty consultation', by: 'Dr. Amadi', note: 'Dorsal hump and tip ptosis. Candidate for primary rhinoplasty.' },
      { id: 3, date: '2026-10-19', type: 'Planning', title: 'Pre-op assessment started', by: 'Nurse Joy', note: 'Bloods and ECG requested.' },
      { id: 4, date: '2026-11-08', type: 'Planning', title: 'Medical clearance approved', by: 'Dr. Bello' },
      { id: 5, date: '2026-11-11', type: 'Surgery', title: 'Rhinoplasty scheduled, Theatre 2, 10:30', by: 'Theatre coordinator', upcoming: true },
    ],
  },
};
// Fallback so every patient in the list opens a profile
export const emptyProfile = {
  dob: '—', sex: '—', bloodGroup: '—', heightCm: null, weightKg: null, email: '—', address: '—',
  emergency: null, allergies: [], conditions: [], medications: [], pastSurgeries: [], familyHistory: '—',
  lifestyle: { smoking: '—', alcohol: '—' }, timeline: [],
  allergiesRecorded: false,
};

// Demo appointments, generated relative to the current week so the calendar is never empty.
const monday = startOfWeek(todayISO());
let apptId = 1;
const mk = (day, start, patientId, type, clinicianId, status = 'Confirmed', duration) => {
  const date = addDays(monday, day);
  const p = patients.find((x) => x.id === patientId);
  const lengths = { Consultation: 45, 'Pre-op assessment': 45, 'Post-op review': 30, 'Follow-up': 30, 'Wound review': 15 };
  return { id: apptId++, patientId, patient: p.name, type, clinicianId, date, start, duration: duration ?? lengths[type],
    status: date < todayISO() ? 'Completed' : status, notes: '' };
};
export const appointments = [
  mk(0, '09:00', 'RPS-1033', 'Follow-up', 'bello'),
  mk(0, '11:00', 'RPS-1036', 'Consultation', 'amadi'),
  mk(1, '10:00', 'RPS-1030', 'Consultation', 'bello'),
  mk(1, '14:00', 'RPS-1039', 'Wound review', 'joy'),
  mk(2, '08:30', 'RPS-1042', 'Pre-op assessment', 'joy', 'Completed'),
  mk(2, '09:00', 'RPS-1036', 'Consultation', 'amadi', 'Checked in'),
  mk(2, '11:00', 'RPS-1030', 'Consultation', 'bello'),
  mk(2, '13:30', 'RPS-1033', 'Follow-up', 'bello'),
  mk(2, '14:15', 'RPS-1039', 'Wound review', 'joy', 'Pending'),
  mk(3, '10:00', 'RPS-1041', 'Post-op review', 'bello'),
  mk(3, '15:00', 'RPS-1030', 'Pre-op assessment', 'joy'),
  mk(4, '09:00', 'RPS-1036', 'Pre-op assessment', 'amadi'),
  mk(4, '11:30', 'RPS-1039', 'Follow-up', 'amadi', 'Pending'),
  mk(5, '10:00', 'RPS-1033', 'Follow-up', 'bello'),
];

// ---- Consultations ----
let consultSeq = 1001;
export const blankConsultation = (appt) => {
  const prof = profiles[appt.patientId];
  return {
    id: `C-${consultSeq++}`, appointmentId: appt.id, patientId: appt.patientId, patient: appt.patient,
    clinicianId: appt.clinicianId, type: appt.type, date: appt.date, status: 'Draft',
    vitals: { bp: '', pulse: '', temp: '', weight: prof?.weightKg ?? '', height: prof?.heightCm ?? '' },
    chiefComplaint: '', history: '', examination: '', diagnosis: '', procedure: '', candidacy: '',
    investigations: [], nextStep: '', counselling: '', surgeonNotes: '', addenda: [], completedAt: null, completedBy: null,
  };
};
export const consultations = [];
{
  const [, a2, a3, , , a6] = appointments;
  if (a2 && a2.date < todayISO()) consultations.push({
    ...blankConsultation(a2), status: 'Completed',
    vitals: { bp: '118/76', pulse: '72', temp: '36.7', weight: '68', height: '166' },
    chiefComplaint: 'Wants a fuller, more proportionate bust.',
    history: 'Gradual dissatisfaction over several years. No pregnancy planned in the next 12 months.',
    examination: 'Mild breast volume asymmetry, good skin quality. No palpable masses.',
    diagnosis: 'Mild breast hypoplasia', procedure: 'Breast augmentation', candidacy: 'Suitable with conditions',
    investigations: ['Full blood count', 'ECG'], nextStep: 'Await investigation results',
    counselling: 'Discussed implant options, scarring, capsular contracture risk and recovery time. Patient understands.',
    surgeonNotes: 'Needs updated imaging before planning.', completedAt: `${a2.date}T12:05:00`, completedBy: 'Dr. Amadi',
  });
  if (a3 && a3.date < todayISO()) consultations.push({
    ...blankConsultation(a3), status: 'Completed',
    vitals: { bp: '124/80', pulse: '78', temp: '36.6', weight: '74', height: '170' },
    chiefComplaint: 'Stubborn fat on the flanks and thighs despite exercise.',
    history: 'Stable weight for 2 years. No previous surgery.',
    examination: 'Localised fat deposits, good skin elasticity.',
    diagnosis: 'Localised lipodystrophy', procedure: 'Liposuction', candidacy: 'Suitable',
    investigations: ['Full blood count', 'Blood group and genotype'], nextStep: 'Proceed to surgical planning',
    counselling: 'Realistic outcomes, swelling timeline and compression garment use explained.',
    surgeonNotes: '', completedAt: `${a3.date}T10:50:00`, completedBy: 'Dr. Bello',
  });
  if (a6) consultations.push({
    ...blankConsultation(a6),
    vitals: { bp: '120/78', pulse: '70', temp: '36.8', weight: '68', height: '166' },
    chiefComplaint: 'Review of investigation results before planning.',
  });
}

// ---- Surgical plans ----
let planSeq = 2001;
export const blankPlan = ({ consultationId = null, patientId, patient, procedure = '', diagnosis = '', surgeonId, investigations = [], targetDate = '' }) => ({
  id: `P-${planSeq++}`, consultationId, patientId, patient, surgeonId, procedure, diagnosis, status: 'Planning',
  targetDate, anaesthesia: '', admission: 'Day case', durationMin: 120, equipmentNotes: '', holdReason: '',
  checklist: buildChecklist(investigations), consents: buildConsents(), clearances: buildClearances(), readyAt: null,
});
const finish = (plan, { surgicalConsent = true } = {}) => {
  const today = todayISO();
  plan.anaesthesia = 'General anaesthesia';
  plan.checklist = plan.checklist.map((i) => ({ ...i, state: i.key === 'overnight' ? 'na' : 'done', by: 'Nurse Joy', at: today }));
  plan.clearances = plan.clearances.map((c) => (c.required ? { ...c, status: 'Approved', by: 'Dr. Bello', date: today } : c));
  plan.consents = plan.consents.map((c) => (surgicalConsent || c.key !== 'surgical'
    ? { ...c, status: 'Obtained', by: 'Dr. Amadi', date: today, witness: 'Nurse Joy', filed: true } : c));
  return plan;
};
export const plans = [
  // Consent still missing: matches the dashboard alert for today's 10:30 rhinoplasty
  finish(blankPlan({ patientId: 'RPS-1042', patient: 'Adaeze Okafor', procedure: 'Rhinoplasty', diagnosis: 'Dorsal hump and tip ptosis',
    surgeonId: 'amadi', investigations: ['Full blood count', 'ECG'], targetDate: todayISO() }), { surgicalConsent: false }),
  { ...finish(blankPlan({ patientId: 'RPS-1033', patient: 'Ibinabo Harry', procedure: 'Facelift', diagnosis: 'Facial ageing, skin laxity',
    surgeonId: 'bello', investigations: ['Full blood count', 'ECG'], targetDate: todayISO() })), status: 'Ready', readyAt: new Date().toISOString() },
];

// ---- Theatre cases ----
plans.push(
  { ...finish(blankPlan({ patientId: 'RPS-1041', patient: 'Ngozi Eze', procedure: 'Abdominoplasty', diagnosis: 'Abdominal skin laxity',
    surgeonId: 'bello', investigations: ['Full blood count'], targetDate: todayISO() })), status: 'Ready', readyAt: new Date().toISOString() },
  { ...finish(blankPlan({ patientId: 'RPS-1036', patient: 'Chiamaka Obi', procedure: 'Breast augmentation', diagnosis: 'Mild breast hypoplasia',
    surgeonId: 'amadi', investigations: ['Full blood count', 'ECG'], targetDate: startOfWeek(addDays(todayISO(), 7)) })), status: 'Ready', readyAt: new Date().toISOString() },
);
let surgerySeq = 3001;
export const blankSurgery = ({ planId, patientId, patient, procedure, surgeonId, anaesthesia, theatreId, date, start, duration, anaesthetist = '', notes = '' }) => ({
  id: `S-${surgerySeq++}`, planId, patientId, patient, procedure, surgeonId, anaesthesia, anaesthetist, theatreId, date, start, duration,
  status: 'Scheduled', notes, reason: '', safety: { signIn: null, timeOut: null, signOut: null }, inTheatreAt: null, recoveryAt: null, completedAt: null,
});
const caseFor = (plan, theatreId, start, duration, extra = {}) => ({
  ...blankSurgery({ planId: plan.id, patientId: plan.patientId, patient: plan.patient, procedure: plan.procedure, surgeonId: plan.surgeonId,
    anaesthesia: plan.anaesthesia, theatreId, date: todayISO(), start, duration }), ...extra,
});
{
  const today = todayISO();
  var surgeriesSeed = [
    caseFor(plans[2], 't1', '08:00', 180, { status: 'In theatre', anaesthetist: 'Dr. Okeke', inTheatreAt: `${today}T08:05:00`,
      safety: { signIn: { by: 'Nurse Joy', at: `${today}T08:10:00` }, timeOut: { by: 'Dr. Bello', at: `${today}T08:25:00` }, signOut: null } }),
    caseFor(plans[0], 't2', '10:30', 120, { anaesthetist: 'Dr. Okeke' }),   // plan still missing surgical consent
    caseFor(plans[1], 't1', '12:45', 150),
  ];
}
export const surgeries = surgeriesSeed;

// ---- Recovery & aftercare ----
let aftercareSeq = 4001;
export const blankAftercare = (s) => ({
  id: `A-${aftercareSeq++}`, surgeryId: s.id, patientId: s.patientId, patient: s.patient, procedure: s.procedure, surgeonId: s.surgeonId,
  surgeryDate: s.date, status: 'In recovery', handedOverAt: new Date().toISOString(),
  followUps: buildFollowUps(s.date), observations: [], dischargedAt: null, dischargedBy: '', dischargeNote: '',
});
export const aftercare = [];
{
  // Tamuno Briggs: operated a few days ago, today's reading is flagged and still waiting for a clinician.
  const today = todayISO();
  let d = addDays(today, -5); if (isSunday(d)) d = addDays(d, -1);
  const plan = { ...finish(blankPlan({ patientId: 'RPS-1039', patient: 'Tamuno Briggs', procedure: 'Blepharoplasty', diagnosis: 'Dermatochalasis',
    surgeonId: 'amadi', investigations: ['Full blood count'], targetDate: d })), status: 'Ready', readyAt: `${d}T08:00:00` };
  plans.push(plan);
  const sg = { ...blankSurgery({ planId: plan.id, patientId: plan.patientId, patient: plan.patient, procedure: plan.procedure, surgeonId: 'amadi',
    anaesthesia: plan.anaesthesia, theatreId: 't1', date: d, start: '09:00', duration: 90, anaesthetist: 'Dr. Okeke' }),
    status: 'Completed', inTheatreAt: `${d}T09:05:00`, recoveryAt: `${d}T10:40:00`, completedAt: `${d}T12:10:00`,
    safety: { signIn: { by: 'Nurse Joy', at: `${d}T09:10:00` }, timeOut: { by: 'Dr. Amadi', at: `${d}T09:20:00` }, signOut: { by: 'Dr. Amadi', at: `${d}T10:35:00` } } };
  surgeriesSeed.push(sg);
  const ac = blankAftercare(sg);
  ac.handedOverAt = sg.completedAt;
  const wound = appointments.find((a) => a.patientId === 'RPS-1039' && a.type === 'Wound review' && a.date < today);
  const review = appointments.find((a) => a.patientId === 'RPS-1039' && a.type === 'Follow-up');
  ac.followUps[0].appointmentId = wound?.id ?? null;
  ac.followUps[1].appointmentId = review?.id ?? null;
  const ob = (id, date, time, by, v, flags = []) => ({ id, at: `${date}T${time}`, by, bp: '', pulse: '', temp: '', notes: '', flags, review: null, ...v });
  ac.observations = [
    ob(1, addDays(d, 1), '09:30:00', 'Nurse Joy', { bp: '118/74', pulse: '76', temp: '36.8', pain: 4, wound: 'Expected swelling or bruising', notes: 'Cold compress advised.' }),
    ob(2, addDays(today, -1), '16:00:00', 'Nurse Joy', { bp: '120/78', pulse: '80', temp: '37.2', pain: 3, wound: 'Expected swelling or bruising' }),
    ob(3, today, '08:20:00', 'Nurse Joy', { bp: '124/80', pulse: '96', temp: '38.2', pain: 5, wound: 'Discharge or oozing', notes: 'Left lid slightly more swollen than yesterday.' },
      ['Temperature 38.2°C', 'Wound: discharge or oozing']),
  ];
  aftercare.push(ac);
}

// ---- Billing ----
let quoteSeq = 5001, invoiceSeq = 2292, receiptSeq = 6001;
export const nextQuoteId = () => `Q-${quoteSeq++}`;
export const nextInvoiceId = () => `INV-${invoiceSeq++}`;
export const nextReceiptNo = () => `RCP-${receiptSeq++}`;
export const blankQuotation = ({ patientId, patient, planId = null, procedure, surgeonId = null, lines }) => ({
  id: nextQuoteId(), patientId, patient, planId, procedure, surgeonId, status: 'Draft', lines, discount: 0, validUntil: defaultValidUntil(),
  createdAt: new Date().toISOString(), sentAt: null, decidedAt: null, decidedBy: '', invoiceId: null, notes: '',
});
export const makeInvoice = (q, by) => ({
  id: nextInvoiceId(), quotationId: q.id, patientId: q.patientId, patient: q.patient, procedure: q.procedure,
  issuedAt: todayISO(), dueDate: addDays(todayISO(), INVOICE_DUE_DAYS), lines: structuredClone(q.lines), discount: q.discount,
  payments: [], voidedAt: null, voidReason: '', voidedBy: '', createdBy: by,
});
export const quotations = [];
export const invoices = [];
{
  const today = todayISO(), ago = (n) => addDays(today, -n);
  const accepted = (planId, patientId, patient, procedure, surgeonId, daysAgo, discount = 0) => {
    const q = blankQuotation({ patientId, patient, planId, procedure, surgeonId, lines: newLines(procedure) });
    Object.assign(q, { discount, status: 'Accepted', createdAt: `${ago(daysAgo + 3)}T10:00:00`, sentAt: `${ago(daysAgo + 3)}T10:30:00`,
      decidedAt: `${ago(daysAgo)}T14:00:00`, decidedBy: 'Front Desk', validUntil: addDays(ago(daysAgo + 3), 30) });
    const inv = makeInvoice(q, 'Front Desk');
    Object.assign(inv, { issuedAt: ago(daysAgo), dueDate: addDays(ago(daysAgo), INVOICE_DUE_DAYS) });
    q.invoiceId = inv.id; quotations.push(q); invoices.push(inv); return inv;
  };
  const pay = (inv, daysAgo, amount, method, reference = '', by = 'Finance') => {
    const paid = inv.payments.reduce((x, p) => x + p.amount, 0);
    inv.payments.push({ id: receiptSeq, receiptNo: nextReceiptNo(), at: `${ago(daysAgo)}T11:15:00`, amount, method, reference, by, balanceAfter: invoiceTotal(inv) - paid - amount });
  };
  const ngozi = accepted(plans[2].id, 'RPS-1041', 'Ngozi Eze', 'Abdominoplasty', 'bello', 10);
  pay(ngozi, 10, 1500000, 'Bank transfer', 'TRF-88213');
  const ibinabo = accepted(plans[1].id, 'RPS-1033', 'Ibinabo Harry', 'Facelift', 'bello', 14);
  pay(ibinabo, 14, 2000000, 'Bank transfer', 'TRF-87740'); pay(ibinabo, 3, 1920000, 'POS card', 'POS-5521', 'Front Desk');
  const tamuno = accepted(plans.find((p) => p.patientId === 'RPS-1039').id, 'RPS-1039', 'Tamuno Briggs', 'Blepharoplasty', 'amadi', 20, 80000);
  pay(tamuno, 20, 500000, 'Cash');
  // Chiamaka has been quoted and is deciding
  const sent = blankQuotation({ patientId: 'RPS-1036', patient: 'Chiamaka Obi', planId: plans[3].id, procedure: 'Breast augmentation', surgeonId: 'amadi', lines: newLines('Breast augmentation') });
  Object.assign(sent, { status: 'Sent', createdAt: `${ago(2)}T09:00:00`, sentAt: `${ago(2)}T09:20:00`, validUntil: addDays(today, 28) });
  quotations.push(sent);
}

// ---- Laboratory ----
let labSeq = 7001;
export const blankLab = ({ patientId, patient, test, priority = 'Routine', requestedBy, consultationId = null, source = 'Manual', clinicalNote = '', requestedAt = new Date().toISOString() }) => {
  const sex = profiles[patientId]?.sex;
  return {
    id: `L-${labSeq++}`, patientId, patient, sex: ['Female', 'Male'].includes(sex) ? sex : '', test, priority, requestedBy, consultationId, source, clinicalNote, requestedAt,
    status: 'Requested', requestedById: '', requestedByDept: '', takenById: '', takenByName: '', takenAt: null,   // takenById is empty while the request waits in the laboratory queue
    collectedAt: null, collectedBy: '', sampleNote: '', results: {}, resultedAt: null, resultedById: '', resultedBy: '',
    reviewedAt: null, reviewedBy: '', reviewNote: '', cancelReason: '',
  };
};
export const labRequests = [];
{
  const at = (daysAgo, t) => `${addDays(todayISO(), -daysAgo)}T${t}`;
  const mkLab = (patientId, test, daysAgo, state, results = {}, extra = {}) => {
    const pt = patients.find((x) => x.id === patientId);
    const l = blankLab({ patientId, patient: pt.name, test, requestedBy: pt.surgeon, requestedAt: at(daysAgo, '09:00:00'), ...extra });
    const i = ['Requested', 'Collected', 'Resulted', 'Reviewed'].indexOf(state);
    if (i >= 1) Object.assign(l, { status: 'Collected', collectedAt: at(daysAgo, '09:40:00'), collectedBy: 'Nurse Joy' });
    if (i >= 2) Object.assign(l, { status: 'Resulted', results, resultedAt: at(daysAgo, '14:00:00'), resultedBy: 'Nurse Joy' });
    if (i >= 3) Object.assign(l, { status: 'Reviewed', reviewedAt: at(daysAgo, '16:30:00'), reviewedBy: pt.surgeon });
    labRequests.push(l); return l;
  };
  const fbc = (hb) => ({ hb, wbc: '6.4', plt: '270' });
  const ecgOk = { interp: 'Normal', findings: 'Sinus rhythm, normal rate.' };
  mkLab('RPS-1042', 'Full blood count', 6, 'Reviewed', fbc('13.1'));
  mkLab('RPS-1042', 'ECG', 6, 'Reviewed', ecgOk);
  mkLab('RPS-1033', 'Full blood count', 8, 'Reviewed', fbc('14.2'));
  mkLab('RPS-1033', 'ECG', 8, 'Reviewed', ecgOk);
  mkLab('RPS-1041', 'Full blood count', 7, 'Reviewed', fbc('12.8'));
  mkLab('RPS-1039', 'Full blood count', 12, 'Reviewed', fbc('12.4'));
  mkLab('RPS-1030', 'Full blood count', 3, 'Reviewed', fbc('13.0'));
  mkLab('RPS-1030', 'Blood group and genotype', 3, 'Reviewed', { group: 'O+', genotype: 'AA' });
  // Chiamaka Obi: a low haemoglobin is waiting for the surgeon, and an urgent ECG still has no recording
  const cons = consultations.find((c) => c.patientId === 'RPS-1036' && c.status === 'Completed');
  const link = cons ? { consultationId: cons.id, source: `Consultation ${cons.id}`, clinicalNote: 'Before breast augmentation planning.' } : { clinicalNote: 'Before breast augmentation planning.' };
  mkLab('RPS-1036', 'Full blood count', 1, 'Resulted', fbc('11.2'), link);
  mkLab('RPS-1036', 'ECG', 1, 'Requested', {}, { ...link, priority: 'Urgent' });
  // More for the queue and for someone's own work, so the laboratory tab has something to take
  mkLab('RPS-1042', 'Electrolytes, urea and creatinine', 0, 'Requested', {}, { clinicalNote: 'Before theatre.' });
  const taken = mkLab('RPS-1030', 'Fasting blood glucose', 0, 'Collected');
  Object.assign(taken, { takenById: 'ST-16', takenByName: 'Nurse Ada', takenAt: at(0, '09:10:00'), collectedBy: 'Nurse Ada' });
}

// ---- Pharmacy ----
let moveSeq = 1, rxSeq = 8001;
const exp = (days) => addDays(todayISO(), days);
const med = (id, name, cls, unit, reorderLevel, batches, extra = {}) => ({ id, name, class: cls, unit, reorderLevel, controlled: false, batches, ...extra });
export const medications = [
  med('M-01', 'Paracetamol 500 mg tablets', 'Analgesic', 'tablet', 200, [{ batchNo: 'PC2406', expiry: exp(400), qty: 600 }]),
  med('M-02', 'Ibuprofen 400 mg tablets', 'NSAID analgesic', 'tablet', 150, [{ batchNo: 'IB2311', expiry: exp(60), qty: 90 }, { batchNo: 'IB2407', expiry: exp(500), qty: 300 }]),
  med('M-03', 'Tramadol 50 mg capsules', 'Opioid analgesic', 'capsule', 60, [{ batchNo: 'TR2402', expiry: exp(300), qty: 120 }], { controlled: true }),
  med('M-04', 'Amoxicillin-clavulanate 625 mg tablets', 'Penicillin antibiotic', 'tablet', 100, [{ batchNo: 'AC2404', expiry: exp(250), qty: 240 }]),
  med('M-05', 'Ciprofloxacin 500 mg tablets', 'Quinolone antibiotic', 'tablet', 60, [{ batchNo: 'CF2310', expiry: exp(-20), qty: 40 }, { batchNo: 'CF2405', expiry: exp(420), qty: 100 }]),
  med('M-06', 'Metronidazole 400 mg tablets', 'Nitroimidazole antibiotic', 'tablet', 80, [{ batchNo: 'MT2403', expiry: exp(380), qty: 200 }]),
  med('M-07', 'Ondansetron 4 mg tablets', 'Anti-emetic', 'tablet', 40, [{ batchNo: 'ON2401', expiry: exp(200), qty: 80 }]),
  med('M-08', 'Omeprazole 20 mg capsules', 'Proton pump inhibitor', 'capsule', 60, [{ batchNo: 'OM2408', expiry: exp(450), qty: 150 }]),
  med('M-09', 'Propofol 200 mg/20 mL injection', 'Anaesthetic', 'vial', 10, [{ batchNo: 'PF2402', expiry: exp(150), qty: 6 }]),
  med('M-10', 'Lidocaine 1% with adrenaline injection', 'Local anaesthetic', 'vial', 20, [{ batchNo: 'LD2406', expiry: exp(320), qty: 45 }]),
  med('M-11', 'Non-adherent dressing 10 x 10 cm', 'Dressing', 'piece', 100, [{ batchNo: 'DR2409', expiry: exp(700), qty: 260 }]),
];
export const stockMovements = [];
export const addMovement = (itemId, type, qty, batchNo, by, note = '', ref = '') =>
  stockMovements.push({ id: moveSeq++, itemId, at: new Date().toISOString(), type, qty, batchNo, by, note, ref });
medications.forEach((m) => m.batches.forEach((b) => addMovement(m.id, 'Received', b.qty, b.batchNo, 'Stock take', 'Opening balance')));

// A pharmacist's prescription has no prescriberId: prescriberName is the pharmacist, and sentToId is the surgeon or nurse it was sent to.
// receipt is null until that person replies: { state: 'Approved' | 'Action taken' | 'Returned' | 'Declined', at, byId, note } (see RX_REPLIES in utils/pharmacy.js).
export const blankRx = ({ patientId, patient, prescriberId = null, prescriberName = '', createdById = null, sentToId = null, lines, notes = '', allergyOverride = null, source = 'Manual' }) => ({
  id: `RX-${rxSeq++}`, patientId, patient, prescriberId, prescriberName, createdById, sentToId, sentAt: sentToId ? new Date().toISOString() : null, receipt: null,
  source, createdAt: new Date().toISOString(), notes, allergyOverride,
  lines: lines.map((l) => ({ ...l, dispensedQty: 0 })), dispensings: [], cancelledAt: null, cancelReason: '',
});
export const prescriptions = [
  blankRx({ patientId: 'RPS-1039', patient: 'Tamuno Briggs', prescriberId: 'amadi', source: 'Aftercare', notes: 'Wound review: possible early infection.',
    lines: [{ itemId: 'M-04', name: 'Amoxicillin-clavulanate 625 mg tablets', dose: '1 tablet', frequency: 'Three times daily', days: 7, qty: 21, controlled: false },
            { itemId: 'M-01', name: 'Paracetamol 500 mg tablets', dose: '2 tablets', frequency: 'When needed', days: 5, qty: 20, controlled: false }] }),
  // Written by the pharmacy and sent to a nurse and a surgeon, who have not received them yet
  blankRx({ patientId: 'RPS-1039', patient: 'Tamuno Briggs', prescriberName: 'Pharm. Chioma Okoye', createdById: 'ST-11', sentToId: 'ST-05', source: 'Pharmacy',
    notes: 'Dressing and pain relief for the wound care visit.',
    lines: [{ itemId: 'M-11', name: 'Non-adherent dressing 10 x 10 cm', dose: '1 piece', frequency: 'Once daily', days: 5, qty: 5, controlled: false }] }),
  blankRx({ patientId: 'RPS-1042', patient: 'Adaeze Okafor', prescriberName: 'Pharm. Chioma Okoye', createdById: 'ST-11', sentToId: 'ST-02', source: 'Pharmacy',
    notes: 'Stomach protection before theatre. Please confirm it suits the plan.',
    lines: [{ itemId: 'M-08', name: 'Omeprazole 20 mg capsules', dose: '1 capsule', frequency: 'At night', days: 3, qty: 3, controlled: false }] }),
  blankRx({ patientId: 'RPS-1033', patient: 'Ibinabo Harry', prescriberId: 'bello',
    lines: [{ itemId: 'M-03', name: 'Tramadol 50 mg capsules', dose: '1 capsule', frequency: 'Twice daily', days: 3, qty: 6, controlled: true }] }),
];

// ---- Staff ----
const mkStaff = (id, name, title, role, department, isHead, email, phone, joined, status = 'Active') => ({
  id, name, title, role, department, isHead, phone, email,
  joined, status, portalId: `P-${1000 + Number(id.slice(3))}`,
});
export const staff = [
  mkStaff('ST-01', 'Dr. Chidi Eze', 'Medical Director', 'director', '', false, 'c.eze@regal.example', '0803 555 0100', '2018-02-01'),
  mkStaff('ST-02', 'Dr. Bello', 'Consultant plastic surgeon', 'surgeon', 'theatre', true, 'bello@regal.example', '0803 555 0111', '2019-06-10'),
  mkStaff('ST-03', 'Dr. Amadi', 'Consultant plastic surgeon', 'surgeon', 'clinic', true, 'amadi@regal.example', '0803 555 0112', '2020-09-14'),
  mkStaff('ST-04', 'Dr. Okeke', 'Consultant anaesthetist', 'surgeon', 'theatre', false, 'okeke@regal.example', '0803 555 0113', '2021-03-01'),
  mkStaff('ST-05', 'Nurse Joy', 'Theatre and recovery nurse', 'nurse', 'aftercare', true, 'joy@regal.example', '0805 555 0120', '2021-08-23'),
  mkStaff('ST-06', 'Nurse Peace', 'Laboratory nurse', 'nurse', 'laboratory', true, 'peace@regal.example', '0805 555 0121', '2022-01-17'),
  mkStaff('ST-07', 'Amaka Nwosu', 'Front desk officer', 'frontdesk', 'frontdesk', true, 'amaka@regal.example', '0809 555 0130', '2022-05-02'),
  mkStaff('ST-08', 'Mr. Okon', 'Finance manager', 'finance', 'finance', true, 'okon@regal.example', '0809 555 0140', '2019-11-04'),
  mkStaff('ST-09', 'Nurse Grace', 'Ward nurse', 'nurse', 'pharmacy', false, 'grace@regal.example', '0805 555 0122', '2018-10-08', 'Inactive'),
  mkStaff('ST-10', 'Ms. Ifeoma Eze', 'Staff administrator', 'hr', '', false, 'ifeoma@regal.example', '0809 555 0150', '2019-02-11'),
  mkStaff('ST-11', 'Pharm. Chioma Okoye', 'Head pharmacist', 'pharmacist', 'pharmacy', true, 'chioma@regal.example', '0805 555 0123', '2022-09-05'),
  // Team members, so every department head has someone to give work to
  mkStaff('ST-12', 'Nurse Halima', 'Theatre nurse', 'nurse', 'theatre', false, 'halima@regal.example', '0805 555 0124', '2023-02-13'),
  mkStaff('ST-13', 'Pharm. Tola Bankole', 'Pharmacist', 'pharmacist', 'pharmacy', false, 'tola@regal.example', '0805 555 0125', '2023-04-03'),
  mkStaff('ST-14', 'Efe Oghene', 'Front desk officer', 'frontdesk', 'frontdesk', false, 'efe@regal.example', '0809 555 0131', '2023-06-19'),
  mkStaff('ST-15', 'Ms. Bola Adamu', 'Accounts officer', 'finance', 'finance', false, 'bola@regal.example', '0809 555 0141', '2023-07-24'),
  mkStaff('ST-16', 'Nurse Ada', 'Laboratory nurse', 'nurse', 'laboratory', false, 'ada@regal.example', '0805 555 0126', '2023-09-11'),
  mkStaff('ST-17', 'Nurse Funmi', 'Recovery nurse', 'nurse', 'aftercare', false, 'funmi@regal.example', '0805 555 0127', '2023-10-02'),
  mkStaff('ST-18', 'Dr. Yusuf Danjuma', 'Resident surgeon', 'surgeon', 'clinic', false, 'yusuf@regal.example', '0803 555 0114', '2024-01-15'),
];

// ---- Staff portal (the centre's existing staff database, read-only) ----
export const portalStaff = [
  { portalId: 'P-1002', name: 'Dr. Bello', title: 'Consultant plastic surgeon', department: 'Theatre', email: 'bello@regal.example', phone: '0803 555 0111' },
  { portalId: 'P-1005', name: 'Nurse Joy', title: 'Theatre and recovery nurse', department: 'Aftercare', email: 'joy@regal.example', phone: '0805 555 0120' },
  { portalId: 'P-2101', name: 'Dr. Funke Adebayo', title: 'Consultant plastic surgeon', department: 'Clinic', email: 'funke.adebayo@regal.example', phone: '0803 555 0201' },
  { portalId: 'P-2102', name: 'Blessing Okafor', title: 'Staff nurse', department: 'Theatre', email: 'blessing.okafor@regal.example', phone: '0805 555 0202' },
  { portalId: 'P-2103', name: 'Tunde Bakare', title: 'Accountant', department: 'Finance', email: 'tunde.bakare@regal.example', phone: '0809 555 0203' },
  { portalId: 'P-2104', name: 'Kemi Salako', title: 'Receptionist', department: 'Front desk', email: 'kemi.salako@regal.example', phone: '0809 555 0204' },
  { portalId: 'P-2105', name: 'Samuel Ibe', title: 'Porter', department: 'Facilities', email: 'samuel.ibe@regal.example', phone: '0809 555 0205' },
  { portalId: 'P-2106', name: 'Dr. Lade Coker', title: 'Pharmacist', department: 'Pharmacy', email: 'lade.coker@regal.example', phone: '0805 555 0206' },
];

// ---- Sign-in accounts (demo only) ----
// The real backend stores a salted hash (argon2 or bcrypt) and never sends it, or the two-step secret, to the browser.
export const DEMO_PASSWORD = 'Regal-Demo-2026!';
const SECRETS = ['JBSWY3DPEHPK3PXP', 'KRSXG5CTMVRXEZLU', 'MFRGGZDFMZTWQ2LK', 'NBSWY3DPFQQHO33S', 'ONSWG4TFOQYTEMZU', 'PFXXK4TDMVZXI3TP', 'GEZDGNBVGY3TQOJQ', 'IFBEGRCFIZDUQSKK', 'JRXXEZLNEBUXA43V', 'LBSWY3DPEB3W64TM'];
let secretIx = 0;
const acct = (staffId, status = 'Active', extra = {}) => ({
  staffId, status, password: status === 'Active' ? DEMO_PASSWORD : null, failedAttempts: 0, lockedUntil: null,
  lastLoginAt: status === 'Active' ? new Date(Date.now() - 20 * 36e5).toISOString() : null, invite: null, reset: null,
  mfa: status === 'Active' ? { secret: SECRETS[secretIx++ % SECRETS.length], enrolledAt: new Date(Date.now() - 30 * 864e5).toISOString() } : null,
  backupCodes: [], ...extra,
});
export const accounts = [
  acct('ST-01'), acct('ST-02'), acct('ST-03'), acct('ST-05'), acct('ST-06'), acct('ST-07'), acct('ST-08'), acct('ST-10'), acct('ST-11'),
  acct('ST-12'), acct('ST-13'), acct('ST-14'), acct('ST-15'), acct('ST-16'), acct('ST-17'), acct('ST-18'),
  acct('ST-04', 'Invited', { invite: { token: 'demo-invite-okeke', expiresAt: new Date(Date.now() + 72 * 36e5).toISOString() } }),
  acct('ST-09', 'Disabled'),
];

// ---- Department reports ----
export const departmentReports = [];

// ---- Messages between staff ----
const ago = (h) => new Date(Date.now() - h * 36e5).toISOString();
export const threads = [
  { id: 'T-1', subject: 'Recovery chairs in Theatre 2', members: ['ST-05', 'ST-02'], departments: [], readUpTo: { 'ST-05': 2, 'ST-02': 2 }, messages: [
    { id: 1, fromId: 'ST-05', at: ago(26), body: 'Two of the recovery chairs in Theatre 2 are worn and one won’t recline. Can we ask for replacements?' },
    { id: 2, fromId: 'ST-02', at: ago(24), body: 'Yes, I’ll raise it in my monthly report. Please take photos so we can show the supplier.' } ] },
  { id: 'T-2', subject: 'Invoice question: INV-2291', members: ['ST-07', 'ST-08'], departments: ['finance'], readUpTo: { 'ST-07': 1, 'ST-08': 0 }, messages: [
    { id: 1, fromId: 'ST-07', at: ago(3), body: 'The patient says the discount wasn’t shown on this invoice. Could you check it and let me know what to tell them?' } ] },
  { id: 'T-3', subject: 'Bloods before tomorrow’s list', members: ['ST-02', 'ST-05'], departments: [], readUpTo: { 'ST-02': 1, 'ST-05': 0 }, messages: [
    { id: 1, fromId: 'ST-02', at: ago(1), body: 'Please make sure the pre-op bloods are in the system by 4pm so I can sign them off.' } ] },
];

// ---- Tasks (assigned inside a department, or requested from another department) ----
let taskSeq = 1;
export const blankTask = ({ title, details = '', priority = 'Normal', dueDate = '', patientId = null, patient = '', kind, fromId, fromDept = '', toDept, assigneeId = null, byName }) => {
  const now = new Date().toISOString();
  return { id: `TK-${taskSeq++}`, title, details, priority, dueDate, patientId, patient, kind, fromId, fromDept, toDept, assigneeId,
    status: 'To do', createdAt: now, updatedAt: now, doneNote: '',
    history: [{ at: now, by: byName, text: kind === 'assigned' ? 'Assigned the task' : 'Sent the request' }] };
};
export const tasks = [];
{
  const today = todayISO();
  const add = (t, extra = {}) => { const k = blankTask(t); Object.assign(k, extra); tasks.push(k); return k; };
  add({ title: 'Prepare Theatre 1 for the 12:45 facelift', details: 'Instruments, positioning pads and the warming blanket.', priority: 'Urgent', dueDate: today, kind: 'assigned', fromId: 'ST-02', fromDept: 'theatre', toDept: 'theatre', assigneeId: 'ST-12', byName: 'Dr. Bello' });
  add({ title: 'Count propofol and reorder if below level', details: 'Stock is under the reorder level. Check batches and expiry dates.', dueDate: addDays(today, 2), kind: 'assigned', fromId: 'ST-11', fromDept: 'pharmacy', toDept: 'pharmacy', assigneeId: 'ST-13', byName: 'Pharm. Chioma Okoye' },
    { status: 'In progress' });
  add({ title: 'Is the antibiotic for Tamuno Briggs ready?', details: 'Wound review today: possible early infection. Please prepare amoxicillin-clavulanate.', priority: 'Urgent', patientId: 'RPS-1039', patient: 'Tamuno Briggs',
    kind: 'request', fromId: 'ST-05', fromDept: 'aftercare', toDept: 'pharmacy', byName: 'Nurse Joy' });
  add({ title: 'Send me the laboratory’s reagent stock count and what needs reordering', details: 'Needed before the end of the week.', dueDate: addDays(today, 3), kind: 'assigned', fromId: 'ST-01', fromDept: '', toDept: 'laboratory', assigneeId: 'ST-06', byName: 'Dr. Chidi Eze' });
  add({ title: 'Record the urgent ECG for Chiamaka Obi', details: 'Needed before her breast augmentation can be marked ready.', priority: 'Urgent', patientId: 'RPS-1036', patient: 'Chiamaka Obi',
    kind: 'request', fromId: 'ST-03', fromDept: 'clinic', toDept: 'laboratory', byName: 'Dr. Amadi' });
}

// The id counters have to be saved with the data, or a reload would hand out numbers that already exist.
export const getCounters = () => ({ apptId, consultSeq, planSeq, surgerySeq, aftercareSeq, quoteSeq, invoiceSeq, receiptSeq, labSeq, moveSeq, rxSeq, taskSeq });
export const setCounters = (c = {}) => {
  ({ apptId = apptId, consultSeq = consultSeq, planSeq = planSeq, surgerySeq = surgerySeq, aftercareSeq = aftercareSeq, quoteSeq = quoteSeq,
    invoiceSeq = invoiceSeq, receiptSeq = receiptSeq, labSeq = labSeq, moveSeq = moveSeq, rxSeq = rxSeq, taskSeq = taskSeq } = c);
};
