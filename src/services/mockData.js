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
  { id: 1, level: 'high', text: 'Consent form missing for Adaeze Okafor (surgery 10:30)' },
  { id: 2, level: 'medium', text: 'Anaesthetic stock below reorder level' },
  { id: 3, level: 'medium', text: '2 recovery patients overdue for review' },
];
export const activity = [
  { id: 1, time: '09:12', text: 'Dr. Bello started surgery for Ngozi Eze' },
  { id: 2, time: '08:40', text: 'Pre-op clearance approved for Adaeze Okafor' },
  { id: 3, time: '08:05', text: 'New patient registered: Ifeoma Nwosu' },
  { id: 4, time: '07:50', text: 'Invoice INV-2291 paid in full' },
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
