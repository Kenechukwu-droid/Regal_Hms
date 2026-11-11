// Single place where the frontend talks to the Python backend.
// While USE_MOCK is true, functions return demo data so UI work isn't blocked.
import * as mock from './mockData';
import { getBlockers } from '../utils/planning';
import { findSurgeryConflicts, isActive } from '../utils/theatre';
import { theatreName } from '../components/surgery/constants';
import { clinicianName, DAY_END, DAY_START } from '../components/appointments/constants';
import { isSunday, timeToMin, todayISO } from '../utils/dates';
import { invoiceBalance, invoiceStatus, invoiceTotal, newLines, quoteStatus, validatePayment, validateQuote } from '../utils/billing';
import { getDischargeBlockers, getFlags, overdueFollowUps, unreviewed, validateObservation } from '../utils/aftercare';
import { findConflict } from '../utils/scheduling';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE = import.meta.env.VITE_API_URL || '/api';
const delay = (data, ms = 250) => new Promise((r) => setTimeout(() => r(data), ms));

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// ---- patient history edits (allergies, conditions) ----
// Mock mode persists edits in memory so they survive navigating between pages.
const ensureProfile = (id) => (mock.profiles[id] ??= structuredClone(mock.emptyProfile));
const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

const historyApi = (key, path) => ({
  save: (patientId, item) => {
    if (!USE_MOCK) {
      return item.id
        ? request(`/patients/${patientId}/${path}/${item.id}`, { method: 'PUT', body: item })
        : request(`/patients/${patientId}/${path}`, { method: 'POST', body: item });
    }
    const list = ensureProfile(patientId)[key];
    if (item.id) { const i = list.findIndex((x) => x.id === item.id); list[i] = { ...item }; return delay({ ...item }, 200); }
    const created = { ...item, id: nextId() };
    list.push(created);
    return delay({ ...created }, 200);
  },
  remove: (patientId, itemId) => {
    if (!USE_MOCK) return request(`/patients/${patientId}/${path}/${itemId}`, { method: 'DELETE' });
    const prof = ensureProfile(patientId);
    prof[key] = prof[key].filter((x) => x.id !== itemId);
    return delay({ ok: true }, 200);
  },
});
const allergies = historyApi('allergies', 'allergies');
const conditions = historyApi('conditions', 'conditions');

// Follow-ups carry the booked appointment's details, so the screen can show Done / Booked / Overdue. The backend should join these.
const hydrate = (r) => {
  const c = structuredClone(r);
  c.followUps = c.followUps.map((f) => {
    const a = mock.appointments.find((x) => x.id === f.appointmentId);
    return { ...f, appointment: a ? { id: a.id, date: a.date, start: a.start, clinicianId: a.clinicianId, status: a.status } : null };
  });
  return c;
};
const acFind = (id) => {
  const rec = mock.aftercare.find((a) => a.id === id);
  if (!rec) throw new Error('Aftercare record not found.');
  return rec;
};

const quoteFind = (id) => { const q = mock.quotations.find((x) => x.id === id); if (!q) throw new Error('Quotation not found.'); return q; };
const invFind = (id) => { const i = mock.invoices.find((x) => x.id === id); if (!i) throw new Error('Invoice not found.'); return i; };
const liveQuote = (q) => ['Draft', 'Accepted'].includes(q.status) || (q.status === 'Sent' && quoteStatus(q) === 'Sent');

const todaysTheatreList = () => mock.surgeries
  .filter((s) => s.date === todayISO() && isActive(s)).sort((a, b) => a.start.localeCompare(b.start))
  .map((s) => ({ id: s.id, time: s.start, patient: s.patient, procedure: s.procedure, theatre: theatreName(s.theatreId),
    surgeon: clinicianName(s.surgeonId), status: s.status === 'In theatre' ? 'In progress' : s.status }));

export const api = {
  saveAllergy: allergies.save, deleteAllergy: allergies.remove,
  saveCondition: conditions.save, deleteCondition: conditions.remove,
  confirmNoKnownAllergies: (patientId) => {
    if (!USE_MOCK) return request(`/patients/${patientId}/allergies/confirm-none`, { method: 'POST' });
    ensureProfile(patientId).allergiesRecorded = true;
    return delay({ ok: true }, 200);
  },
  getDashboard: () => USE_MOCK
    ? delay((() => {
        const list = todaysTheatreList();
        const live = mock.aftercare.filter((a) => a.status === 'In recovery').map(hydrate);
        const flagged = live.filter((a) => unreviewed(a).length > 0);
        const overdue = live.filter((a) => overdueFollowUps(a).length > 0);
        const review = new Set([...flagged, ...overdue].map((a) => a.id)).size;
        const kpis = mock.kpis.map((k) => {
          if (k.id === 'surgeries') return { ...k, value: String(list.length), note: `${list.filter((x) => x.status === 'In progress').length} in theatre` };
          if (k.id === 'recovery') return { ...k, value: String(live.length), note: `${review} need review` };
          return k;
        });
        const derived = [
          ...flagged.map((a) => ({ id: `fl-${a.id}`, level: 'high', text: `${a.patient}: flagged recovery reading needs clinician review (${unreviewed(a)[0].flags[0]})` })),
          ...overdue.map((a) => ({ id: `od-${a.id}`, level: 'medium', text: `${a.patient}: follow-up overdue (${overdueFollowUps(a)[0].label})` })),
        ];
        // Money alerts carry `roles` so clinical staff don't see amounts. The backend must filter them the same way.
        const money = mock.invoices.filter((i) => invoiceStatus(i) === 'Overdue').map((i) => ({ id: `inv-${i.id}`, level: 'medium', roles: ['director', 'frontdesk', 'finance'],
          text: `${i.patient}: invoice ${i.id} is overdue, ₦${invoiceBalance(i).toLocaleString('en-NG')} outstanding` }));
        return { kpis, revenue: mock.revenue, surgeries: list, alerts: [...mock.alerts.filter((x) => x.id !== 3), ...derived, ...money], activity: mock.activity };
      })())
    : request('/dashboard'),
  getPatients: () => USE_MOCK ? delay(mock.patients) : request('/patients'),
  createPatient: (p) => USE_MOCK
    ? delay({ ...p, id: `RPS-${1043 + Math.floor(Math.random() * 900)}`, stage: 'Registered' })
    : request('/patients', { method: 'POST', body: p }),
  // ---- consultations ----
  getConsultations: ({ patientId } = {}) => USE_MOCK
    ? delay(mock.consultations.filter((c) => !patientId || c.patientId === patientId).map((c) => structuredClone(c)).sort((a, b) => b.date.localeCompare(a.date)), 150)
    : request(`/consultations${patientId ? `?patientId=${patientId}` : ''}`),
  getConsultation: (id) => USE_MOCK
    ? delay(structuredClone(mock.consultations.find((c) => c.id === id) ?? null), 150)
    : request(`/consultations/${id}`),
  getConsultationByAppointment: (apptId) => USE_MOCK
    ? delay(structuredClone(mock.consultations.find((c) => c.appointmentId === apptId) ?? null), 100)
    : request(`/appointments/${apptId}/consultation`), // null when none exists yet
  startConsultation: (apptId) => {
    if (!USE_MOCK) return request(`/appointments/${apptId}/consultation`, { method: 'POST' });
    let c = mock.consultations.find((x) => x.appointmentId === apptId);
    if (!c) { c = mock.blankConsultation(mock.appointments.find((a) => a.id === apptId)); mock.consultations.push(c); }
    return delay(structuredClone(c), 200);
  },
  saveConsultation: (c) => {
    if (!USE_MOCK) return request(`/consultations/${c.id}`, { method: 'PUT', body: c });
    const i = mock.consultations.findIndex((x) => x.id === c.id);
    if (mock.consultations[i].status === 'Completed') return Promise.reject(new Error('Consultation is locked'));
    mock.consultations[i] = { ...c };
    return delay(structuredClone(c), 200);
  },
  // Completing locks the record, marks the appointment completed and adds a timeline event.
  completeConsultation: (c, by) => {
    if (!USE_MOCK) return request(`/consultations/${c.id}/complete`, { method: 'POST', body: c });
    const i = mock.consultations.findIndex((x) => x.id === c.id);
    const done = { ...c, status: 'Completed', completedAt: new Date().toISOString(), completedBy: by };
    mock.consultations[i] = done;
    const appt = mock.appointments.find((a) => a.id === done.appointmentId);
    if (appt) appt.status = 'Completed';
    ensureProfile(done.patientId).timeline.push({ id: nextId(), date: done.date, type: 'Consultation', title: `Consultation: ${done.diagnosis}`, by, note: `Next step: ${done.nextStep}.` });
    return delay(structuredClone(done), 250);
  },
  // Completed consultations are never edited; corrections are added as dated addenda.
  addAddendum: (id, text, by) => {
    if (!USE_MOCK) return request(`/consultations/${id}/addenda`, { method: 'POST', body: { text } });
    const c = mock.consultations.find((x) => x.id === id);
    c.addenda.push({ id: nextId(), at: new Date().toISOString(), by, text });
    return delay(structuredClone(c), 200);
  },
  // ---- surgical plans ----
  getPlans: ({ patientId } = {}) => USE_MOCK
    ? delay(mock.plans.filter((p) => !patientId || p.patientId === patientId).map((p) => structuredClone(p)), 150)
    : request(`/surgical-plans${patientId ? `?patientId=${patientId}` : ''}`),
  getPlan: (id) => USE_MOCK ? delay(structuredClone(mock.plans.find((p) => p.id === id) ?? null), 150) : request(`/surgical-plans/${id}`),
  getPlanByConsultation: (cid) => USE_MOCK
    ? delay(structuredClone(mock.plans.find((p) => p.consultationId === cid) ?? null), 100)
    : request(`/consultations/${cid}/surgical-plan`),
  startPlan: (cid) => {
    if (!USE_MOCK) return request(`/consultations/${cid}/surgical-plan`, { method: 'POST' });
    let plan = mock.plans.find((p) => p.consultationId === cid);
    if (!plan) {
      const c = mock.consultations.find((x) => x.id === cid);
      plan = mock.blankPlan({ consultationId: cid, patientId: c.patientId, patient: c.patient, procedure: c.procedure, diagnosis: c.diagnosis, surgeonId: c.clinicianId, investigations: c.investigations });
      mock.plans.push(plan);
    }
    return delay(structuredClone(plan), 200);
  },
  // The server must refuse "Ready" while blockers remain, and refuse edits to cancelled plans.
  savePlan: (p) => {
    if (!USE_MOCK) return request(`/surgical-plans/${p.id}`, { method: 'PUT', body: p });
    const i = mock.plans.findIndex((x) => x.id === p.id);
    const before = mock.plans[i];
    if (before.status === 'Cancelled') return Promise.reject(new Error('Plan is cancelled'));
    if (p.status === 'Ready' && getBlockers(p).length) return Promise.reject(new Error('Plan is not ready'));
    mock.plans[i] = { ...p };
    if (before.status !== 'Ready' && p.status === 'Ready') {
      ensureProfile(p.patientId).timeline.push({ id: nextId(), date: todayISO(), type: 'Planning', title: `Cleared for surgery: ${p.procedure}`, by: 'Surgical team' });
    }
    return delay(structuredClone(p), 200);
  },
  getPatient: (id) => USE_MOCK
    ? delay((() => {
        const base = mock.patients.find((p) => p.id === id);
        if (!base) return null;
        return { ...base, ...(mock.profiles[id] || mock.emptyProfile) };
      })())
    : request(`/patients/${id}`),
  // from/to are ISO dates (inclusive). The backend should also enforce the no-double-booking rule.
  getAppointments: ({ from, to } = {}) => USE_MOCK
    ? delay(mock.appointments.filter((a) => (!from || a.date >= from) && (!to || a.date <= to)).map((a) => ({ ...a })), 150)
    : request(`/appointments?from=${from}&to=${to}`),
  saveAppointment: (a) => {
    if (!USE_MOCK) {
      return a.id ? request(`/appointments/${a.id}`, { method: 'PUT', body: a }) : request('/appointments', { method: 'POST', body: a });
    }
    if (a.id) { const i = mock.appointments.findIndex((x) => x.id === a.id); mock.appointments[i] = { ...a }; return delay({ ...a }, 200); }
    const created = { ...a, id: nextId() };
    mock.appointments.push(created);
    return delay({ ...created }, 200);
  },
  // ---- surgery & theatre ----
  getSurgeries: ({ from, to, patientId } = {}) => USE_MOCK
    ? delay(mock.surgeries.filter((s) => (!from || s.date >= from) && (!to || s.date <= to) && (!patientId || s.patientId === patientId)).map((s) => structuredClone(s)), 150)
    : request(`/surgeries?from=${from ?? ''}&to=${to ?? ''}${patientId ? `&patientId=${patientId}` : ''}`),
  getSurgery: (id) => USE_MOCK ? delay(structuredClone(mock.surgeries.find((s) => s.id === id) ?? null), 150) : request(`/surgeries/${id}`),
  // Ready plans that have no live theatre booking yet
  getAwaitingScheduling: () => USE_MOCK
    ? delay(mock.plans.filter((p) => p.status === 'Ready' && getBlockers(p).length === 0
        && !mock.surgeries.some((s) => s.planId === p.id && s.status !== 'Cancelled')).map((p) => structuredClone(p)), 150)
    : request('/surgical-plans?status=Ready&unscheduled=true'),
  // The server must refuse: plans that aren't Ready, theatre or surgeon clashes, and unsafe status changes.
  createSurgery: (s) => {
    if (!USE_MOCK) return request('/surgeries', { method: 'POST', body: s });
    const plan = mock.plans.find((p) => p.id === s.planId);
    if (!plan || plan.status !== 'Ready' || getBlockers(plan).length) return Promise.reject(new Error('Only a plan marked Ready can be scheduled.'));
    const c = findSurgeryConflicts(mock.surgeries, s);
    if (c.theatre || c.surgeon) return Promise.reject(new Error('That slot clashes with another case.'));
    const created = mock.blankSurgery(s);
    mock.surgeries.push(created);
    ensureProfile(s.patientId).timeline.push({ id: nextId(), date: s.date, type: 'Surgery', title: `${s.procedure} scheduled, ${theatreName(s.theatreId)}, ${s.start}`, by: 'Theatre coordinator', upcoming: true });
    return delay(structuredClone(created), 200);
  },
  saveSurgery: (s) => {
    if (!USE_MOCK) return request(`/surgeries/${s.id}`, { method: 'PUT', body: s });
    const i = mock.surgeries.findIndex((x) => x.id === s.id);
    const before = mock.surgeries[i];
    if (['Completed', 'Cancelled'].includes(before.status)) return Promise.reject(new Error('This case is closed.'));
    if (isActive(s)) {
      const c = findSurgeryConflicts(mock.surgeries, s);
      if (c.theatre || c.surgeon) return Promise.reject(new Error('That slot clashes with another case.'));
    }
    const plan = mock.plans.find((p) => p.id === s.planId);
    const moved = (to) => s.status === to && before.status !== to;
    if (moved('In theatre') && plan && getBlockers(plan).length) return Promise.reject(new Error('The surgical plan is incomplete. Resolve it before the patient goes into theatre.'));
    if (moved('Recovering') && !(s.safety.signIn && s.safety.timeOut && s.safety.signOut)) return Promise.reject(new Error('Complete sign in, time out and sign out first.'));
    const now = new Date().toISOString();
    const next = { ...s };
    if (moved('In theatre')) next.inTheatreAt = now;
    if (moved('Recovering')) next.recoveryAt = now;
    if (moved('Completed')) next.completedAt = now;
    mock.surgeries[i] = next;
    const pat = mock.patients.find((p) => p.id === s.patientId);
    if (moved('In theatre') && pat) pat.stage = 'Surgery';
    // Handing over creates the aftercare record. The backend should do this in the same transaction.
    if (moved('Completed') && !mock.aftercare.some((a) => a.surgeryId === s.id)) {
      mock.aftercare.push(mock.blankAftercare(next));
      if (pat) pat.stage = 'Recovery';
      ensureProfile(s.patientId).timeline.push({ id: nextId(), date: todayISO(), type: 'Aftercare', title: `Handed over to aftercare after ${s.procedure}`, by: clinicianName(s.surgeonId) });
    }
    if (moved('Recovering')) {
      if (pat) pat.stage = 'Recovery';
      ensureProfile(s.patientId).timeline.push({ id: nextId(), date: s.date, type: 'Surgery', title: `${s.procedure} performed, moved to recovery`, by: clinicianName(s.surgeonId) });
    }
    return delay(structuredClone(next), 200);
  },
  // ---- recovery & aftercare ----
  getAftercareCases: ({ status, patientId } = {}) => USE_MOCK
    ? delay(mock.aftercare.filter((a) => (!status || a.status === status) && (!patientId || a.patientId === patientId)).map(hydrate), 150)
    : request(`/aftercare?${new URLSearchParams({ ...(status && { status }), ...(patientId && { patientId }) })}`),
  getAftercare: (id) => USE_MOCK ? delay((() => { const r = mock.aftercare.find((a) => a.id === id); return r ? hydrate(r) : null; })(), 150) : request(`/aftercare/${id}`),
  getAftercareBySurgery: (surgeryId) => USE_MOCK
    ? delay((() => { const r = mock.aftercare.find((a) => a.surgeryId === surgeryId); return r ? hydrate(r) : null; })(), 100)
    : request(`/surgeries/${surgeryId}/aftercare`), // null until the case is handed over
  // The server decides the flags from the readings; the client only previews them.
  addObservation: (id, o, by) => {
    if (!USE_MOCK) return request(`/aftercare/${id}/observations`, { method: 'POST', body: o });
    const rec = acFind(id);
    const errs = validateObservation(o);
    if (errs.length) return Promise.reject(new Error(errs[0]));
    rec.observations.push({ ...o, pain: Number(o.pain), id: nextId(), at: new Date().toISOString(), by, flags: getFlags(o), review: null });
    return delay(hydrate(rec), 200);
  },
  // Only a clinician can clear a flagged reading, and must say what they decided.
  reviewObservation: (id, obsId, note, by) => {
    if (!USE_MOCK) return request(`/aftercare/${id}/observations/${obsId}/review`, { method: 'POST', body: { note } });
    const o = acFind(id).observations.find((x) => x.id === obsId);
    if (!o || o.flags.length === 0) return Promise.reject(new Error('Nothing to review.'));
    if (!note.trim()) return Promise.reject(new Error('Write what was decided.'));
    o.review = { by, at: new Date().toISOString(), note: note.trim() };
    return delay(hydrate(acFind(id)), 200);
  },
  // Books a real appointment and links it to the follow-up. Same no-double-booking and opening-hours rules as the calendar.
  bookFollowUp: (id, key, a) => {
    if (!USE_MOCK) return request(`/aftercare/${id}/follow-ups/${key}/book`, { method: 'POST', body: a });
    const rec = acFind(id);
    const fu = rec.followUps.find((f) => f.key === key);
    if (!fu) return Promise.reject(new Error('Unknown follow-up.'));
    const st = timeToMin(a.start);
    if (isSunday(a.date) || st < DAY_START || st + Number(a.duration) > DAY_END) return Promise.reject(new Error('Outside opening hours.'));
    if (findConflict(mock.appointments, a)) return Promise.reject(new Error('That slot clashes with another appointment.'));
    const created = { ...a, id: nextId(), patientId: rec.patientId, patient: rec.patient, type: fu.type, status: 'Confirmed', notes: `Aftercare: ${fu.label}` };
    mock.appointments.push(created);
    fu.appointmentId = created.id;
    return delay(hydrate(rec), 200);
  },
  // Moves the patient from active recovery monitoring to routine follow-up appointments.
  dischargeAftercare: (id, note, by) => {
    if (!USE_MOCK) return request(`/aftercare/${id}/discharge`, { method: 'POST', body: { note } });
    const rec = acFind(id);
    if (rec.status !== 'In recovery') return Promise.reject(new Error('Already discharged from recovery monitoring.'));
    if (getDischargeBlockers(rec).length) return Promise.reject(new Error('Resolve the outstanding items first.'));
    if (!note.trim()) return Promise.reject(new Error('Add a discharge note.'));
    Object.assign(rec, { status: 'Routine follow-up', dischargedAt: new Date().toISOString(), dischargedBy: by, dischargeNote: note.trim() });
    const pat = mock.patients.find((p) => p.id === rec.patientId);
    if (pat) pat.stage = 'Follow-up';
    ensureProfile(rec.patientId).timeline.push({ id: nextId(), date: todayISO(), type: 'Aftercare', title: `Discharged from recovery monitoring after ${rec.procedure}`, by, note: note.trim() });
    return delay(hydrate(rec), 200);
  },
  // ---- billing ----
  getQuotations: ({ patientId } = {}) => USE_MOCK
    ? delay(mock.quotations.filter((q) => !patientId || q.patientId === patientId).map((q) => structuredClone(q)), 150)
    : request(`/quotations${patientId ? `?patientId=${patientId}` : ''}`),
  getQuotation: (id) => USE_MOCK ? delay(structuredClone(mock.quotations.find((q) => q.id === id) ?? null), 150) : request(`/quotations/${id}`),
  // Plans (not cancelled) that have no live quotation yet
  getPlansWithoutQuotation: () => USE_MOCK
    ? delay(mock.plans.filter((p) => p.status !== 'Cancelled' && !mock.quotations.some((q) => q.planId === p.id && liveQuote(q))).map((p) => structuredClone(p)), 150)
    : request('/surgical-plans?quoted=false'),
  createQuotation: ({ planId, patientId, title }) => {
    if (!USE_MOCK) return request('/quotations', { method: 'POST', body: { planId, patientId, title } });
    if (planId) {
      const p = mock.plans.find((x) => x.id === planId);
      if (!p || p.status === 'Cancelled') return Promise.reject(new Error('That plan can’t be quoted.'));
      if (mock.quotations.some((q) => q.planId === planId && liveQuote(q))) return Promise.reject(new Error('That plan already has a quotation.'));
      const q = mock.blankQuotation({ patientId: p.patientId, patient: p.patient, planId, procedure: p.procedure, surgeonId: p.surgeonId, lines: newLines(p.procedure) });
      mock.quotations.push(q); return delay(structuredClone(q), 200);
    }
    const pat = mock.patients.find((x) => x.id === patientId);
    if (!pat) return Promise.reject(new Error('Choose a patient.'));
    const q = mock.blankQuotation({ patientId, patient: pat.name, procedure: title || 'Consultation', lines: [{ id: 1, category: 'Consultation', description: '', qty: 1, unitPrice: 0 }] });
    mock.quotations.push(q); return delay(structuredClone(q), 200);
  },
  // Only drafts can be edited. Once sent, a quotation is a promise to the patient.
  saveQuotation: (q, opts = {}) => {
    if (!USE_MOCK) return request(`/quotations/${q.id}`, { method: 'PUT', body: q });
    const cur = quoteFind(q.id);
    if (cur.status !== 'Draft') return Promise.reject(new Error('Only a draft can be edited.'));
    const errs = validateQuote(q, opts);
    if (errs.length) return Promise.reject(new Error(errs[0]));
    Object.assign(cur, { lines: q.lines.map((l) => ({ ...l, qty: Number(l.qty), unitPrice: Number(l.unitPrice) })), discount: Number(q.discount) || 0, validUntil: q.validUntil, notes: q.notes });
    return delay(structuredClone(cur), 200);
  },
  sendQuotation: (id, opts = {}) => {
    if (!USE_MOCK) return request(`/quotations/${id}/send`, { method: 'POST' });
    const q = quoteFind(id);
    if (q.status !== 'Draft') return Promise.reject(new Error('Only a draft can be sent.'));
    const errs = validateQuote(q, opts);
    if (errs.length) return Promise.reject(new Error(errs[0]));
    if (q.validUntil < todayISO()) return Promise.reject(new Error('The validity date has passed.'));
    Object.assign(q, { status: 'Sent', sentAt: new Date().toISOString() });
    return delay(structuredClone(q), 200);
  },
  returnQuotationToDraft: (id) => {
    if (!USE_MOCK) return request(`/quotations/${id}/withdraw`, { method: 'POST' });
    const q = quoteFind(id);
    if (q.status !== 'Sent') return Promise.reject(new Error('Only a sent quotation can be taken back.'));
    Object.assign(q, { status: 'Draft', sentAt: null });
    return delay(structuredClone(q), 200);
  },
  decideQuotation: (id, decision, by) => {
    if (!USE_MOCK) return request(`/quotations/${id}/decision`, { method: 'POST', body: { decision } });
    const q = quoteFind(id);
    if (q.status !== 'Sent') return Promise.reject(new Error('Only a sent quotation can be accepted or declined.'));
    if (quoteStatus(q) === 'Expired') return Promise.reject(new Error('This quotation has expired. Take it back to draft and extend the date.'));
    Object.assign(q, { status: decision, decidedAt: new Date().toISOString(), decidedBy: by });
    return delay(structuredClone(q), 200);
  },
  // One live invoice per accepted quotation; the lines are copied so later price changes never alter it.
  createInvoice: (quotationId, by) => {
    if (!USE_MOCK) return request(`/quotations/${quotationId}/invoice`, { method: 'POST' });
    const q = quoteFind(quotationId);
    if (q.status !== 'Accepted') return Promise.reject(new Error('Only an accepted quotation can be invoiced.'));
    if (q.invoiceId) return Promise.reject(new Error('This quotation already has an invoice.'));
    const inv = mock.makeInvoice(q, by);
    q.invoiceId = inv.id; mock.invoices.push(inv);
    return delay(structuredClone(inv), 200);
  },
  getInvoices: ({ patientId } = {}) => USE_MOCK
    ? delay(mock.invoices.filter((i) => !patientId || i.patientId === patientId).map((i) => structuredClone(i)), 150)
    : request(`/invoices${patientId ? `?patientId=${patientId}` : ''}`),
  getInvoice: (id) => USE_MOCK ? delay(structuredClone(mock.invoices.find((i) => i.id === id) ?? null), 150) : request(`/invoices/${id}`),
  // Each payment gets a receipt number and the balance after it. Payments are never edited or deleted.
  recordPayment: (id, p, by) => {
    if (!USE_MOCK) return request(`/invoices/${id}/payments`, { method: 'POST', body: p });
    const inv = invFind(id);
    const errs = validatePayment(inv, p);
    if (errs.length) return Promise.reject(new Error(errs[0]));
    const amount = Number(p.amount);
    inv.payments.push({ id: nextId(), receiptNo: mock.nextReceiptNo(), at: new Date().toISOString(), amount, method: p.method, reference: (p.reference || '').trim(), by, balanceAfter: invoiceBalance(inv) - amount });
    ensureProfile(inv.patientId).timeline.push({ id: nextId(), date: todayISO(), type: 'Billing', title: `Payment received (receipt ${inv.payments.at(-1).receiptNo})`, by });
    return delay(structuredClone(inv), 200);
  },
  voidInvoice: (id, reason, by) => {
    if (!USE_MOCK) return request(`/invoices/${id}/void`, { method: 'POST', body: { reason } });
    const inv = invFind(id);
    if (inv.voidedAt) return Promise.reject(new Error('Already void.'));
    if (inv.payments.length) return Promise.reject(new Error('An invoice with payments can’t be voided. Refunds aren’t supported yet.'));
    if (!reason.trim()) return Promise.reject(new Error('Give a reason.'));
    Object.assign(inv, { voidedAt: new Date().toISOString(), voidReason: reason.trim(), voidedBy: by });
    const q = mock.quotations.find((x) => x.id === inv.quotationId); if (q) q.invoiceId = null;
    return delay(structuredClone(inv), 200);
  },
  getReceipts: () => USE_MOCK
    ? delay(mock.invoices.flatMap((i) => i.payments.map((p) => ({ ...p, invoiceId: i.id, patientId: i.patientId, patient: i.patient, procedure: i.procedure }))).sort((a, b) => b.at.localeCompare(a.at)), 150)
    : request('/receipts'),
  getReceipt: (receiptNo) => USE_MOCK
    ? delay((() => {
        const inv = mock.invoices.find((i) => i.payments.some((p) => p.receiptNo === receiptNo));
        if (!inv) return null;
        return structuredClone({ ...inv.payments.find((p) => p.receiptNo === receiptNo), invoiceId: inv.id, patientId: inv.patientId, patient: inv.patient, procedure: inv.procedure, invoiceTotal: invoiceTotal(inv) });
      })(), 150)
    : request(`/receipts/${receiptNo}`),
};
