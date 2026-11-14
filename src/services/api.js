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
import { OPEN_STATUSES, canRequestLab, flaggedResults, inLabQueue, isLabOpen, isLabStaff, labActions, missingFields, validateResults } from '../utils/laboratory';
import { buildMoneyReport, departmentFigures, seedDepartmentReports } from './reports';
import { can } from '../utils/permissions';
import { makeBackupCodes, makeSecret, otpauthUri, totpAt, verifyTotp } from '../utils/totp';
import { DEPARTMENTS } from '../utils/departments';
import { canMessage, messageProblem } from '../utils/messaging';
import { suggestDepartment, suggestRole } from '../utils/portal';
import { passwordProblems } from '../utils/password';
import { protectedRoleProblem, validateStaff } from '../utils/staff';
import { startDemo, syncDemo, saveDemo } from './persist';
import { canSeeTask, taskActions, validateTask, isOpen } from '../utils/tasks';
import { canRequestDepartment, linkedDepartments } from '../utils/interactions';
import { RX_REPLIES, allergyConflict, batchState, expiredStock, fefoPlan, remaining, rxBlocked, stockState, usableStock, validatePrescription } from '../utils/pharmacy';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const BASE = import.meta.env.VITE_API_URL || '/api';
const delay = (data, ms = 250) => new Promise((r) => setTimeout(() => r(data), ms));

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',   // the session lives in an httpOnly cookie set by the backend
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) { window.dispatchEvent(new Event('auth:unauthorized')); throw new Error('Please sign in again.'); }
  // The backend explains a refusal in { "message": "..." } (see docs/BACKEND.md). Show that text when there is one.
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.message || `Request failed (${res.status})`); }
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

// Completing a consultation asks the lab for every investigation the surgeon ticked (simulated server-side behaviour).
const autoRequestLabs = (c) => (c.investigations || []).forEach((test) => {
  if (mock.labRequests.some((l) => l.patientId === c.patientId && l.test === test && OPEN_STATUSES.includes(l.status))) return;
  mock.labRequests.push(mock.blankLab({ patientId: c.patientId, patient: c.patient, test, requestedBy: clinicianName(c.clinicianId),
    consultationId: c.id, source: `Consultation ${c.id}`, clinicalNote: `For ${c.procedure || c.diagnosis}.` }));
});


const rxView = (rx) => ({ ...structuredClone(rx), sentToName: rx.sentToId ? mock.staff.find((x) => x.id === rx.sentToId)?.name ?? '' : '',
  sentToRole: rx.sentToId ? mock.staff.find((x) => x.id === rx.sentToId)?.role ?? '' : '', receiptByName: rx.receipt ? mock.staff.find((x) => x.id === rx.receipt.byId)?.name ?? '' : '' });
const allergiesOf = (patientId) => mock.profiles[patientId]?.allergies ?? [];
const medById = (id) => { const m = mock.medications.find((x) => x.id === id); if (!m) throw new Error('Medicine not found.'); return m; };

// ---- authentication (mock) ----
// Real backend: httpOnly session cookie, hashed passwords, rate limiting per IP and per account, and an audit log.
const LOCK_AFTER = 5, LOCK_MINUTES = 5, TRUST_DAYS = 30, INVITE_HOURS = 72, RESET_MINUTES = 30, CHALLENGE_MINUTES = 5;
const memory = {};
const store = typeof sessionStorage !== 'undefined' ? sessionStorage : { getItem: (k) => memory[k] ?? null, setItem: (k, v) => { memory[k] = v; }, removeItem: (k) => { delete memory[k]; } };
const session = { get: () => { try { return JSON.parse(store.getItem('regal.session')); } catch { return null; } }, set: (v) => store.setItem('regal.session', JSON.stringify(v)), clear: () => store.removeItem('regal.session') };
const newToken = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, '');
const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');
const later = (fn, ms = 350) => new Promise((res, rej) => setTimeout(() => { Promise.resolve().then(fn).then(res, rej); }, ms));
const publicUser = (st) => ({ staffId: st.id, name: st.name, title: st.title, email: st.email, role: st.role, department: st.department, isHead: !!st.isHead && st.status === 'Active' });
const findByEmail = (email) => mock.staff.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
const accountOf = (staffId) => mock.accounts.find((a) => a.staffId === staffId);
const isLocked = (a) => a.lockedUntil && new Date(a.lockedUntil) > new Date();
const effectiveStatus = (a, st) => (st?.status === 'Inactive' ? 'Disabled' : isLocked(a) ? 'Locked' : a.status);
const sessionUser = () => {
  const sess = session.get(); const st = sess && mock.staff.find((x) => x.id === sess.staffId); const a = st && accountOf(st.id);
  return !st || st.status === 'Inactive' || !a || a.status !== 'Active' ? null : st;
};
const requireRole = (role) => { const u = sessionUser(); if (u?.role !== role) throw new Error(role === 'hr' ? 'Only the Staff Administrator can do that.' : 'Only the Medical Director can do that.'); return u; };
const byToken = (kind, tk) => {
  for (const a of mock.accounts) { const t = a[kind]; if (t && t.token === tk && new Date(t.expiresAt) > new Date()) return { a, st: mock.staff.find((x) => x.id === a.staffId) }; }
  return null;
};
const BAD_LINK = 'This link has expired or has already been used. Ask the Staff Administrator for a new one.';
const lockedMessage = (a) => { const m = Math.ceil((new Date(a.lockedUntil) - Date.now()) / 60000); return `Too many failed attempts. Try again in ${m} minute${m > 1 ? 's' : ''}, or ask the Staff Administrator to unlock the account.`; };
// Wrong passwords and wrong codes share one counter, so guessing the code after learning the password is limited too.
const recordFailure = (a) => {
  a.failedAttempts = (a.failedAttempts || 0) + 1;
  if (a.failedAttempts < LOCK_AFTER) return false;
  a.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString(); a.failedAttempts = 0; return true;
};
// Between the password and the code, the browser holds only a short-lived challenge, never a session.
const challenges = new Map();
const newChallenge = (staffId, kind, extra = {}) => { const id = newToken(); challenges.set(id, { staffId, kind, expiresAt: Date.now() + CHALLENGE_MINUTES * 60000, ...extra }); return id; };
const getChallenge = (id, kind) => {
  const c = challenges.get(id);
  if (!c || c.expiresAt < Date.now() || c.kind !== kind) { challenges.delete(id); throw new Error('That sign-in step timed out. Please start again.'); }
  return c;
};
// A trusted device skips the code for 30 days. Changing the password or resetting two-step forgets every trusted device.
const trustDevice = (a) => {
  const t = { token: newToken(), expiresAt: new Date(Date.now() + TRUST_DAYS * 864e5).toISOString() };
  a.trusted = [...(a.trusted || []), t].slice(-5);
  return t.token;
};
const isTrusted = (a, tk) => !!tk && (a.trusted || []).some((t) => t.token === tk && new Date(t.expiresAt) > new Date());
const startEnrol = (st, extra = {}) => { const secret = makeSecret(); return { step: 'enrol', challenge: newChallenge(st.id, 'enrol', { secret, ...extra }), secret, uri: otpauthUri({ secret, email: st.email }) }; };

// ---- department reports (mock) ----
const headOnly = (dept) => { const u = sessionUser(); if (!u || !u.isHead || u.department !== dept) throw new Error('Only the head of that department can do that.'); return u; };
const reportRecord = (dept, month, u) => {
  if (!/^\d{4}-\d{2}$/.test(month) || month > todayISO().slice(0, 7)) throw new Error('Choose this month or an earlier one.');
  let r = mock.departmentReports.find((x) => x.department === dept && x.month === month);
  if (!r) { r = { department: dept, month, status: 'Draft', highlights: '', issues: '', requests: '', figures: null, authorId: u.id, authorName: u.name, submittedAt: null, ackBy: '', ackAt: null, ackNote: '', returnNote: '' }; mock.departmentReports.push(r); }
  return r;
};
// What each reader is allowed to see: the director sees only submitted reports; the head sees their own drafts.
const deptReportView = (dept, month, u) => {
  const r = mock.departmentReports.find((x) => x.department === dept && x.month === month);
  const head = mock.staff.find((s) => s.isHead && s.status === 'Active' && s.department === dept);
  const base = { department: dept, month, head: head ? { id: head.id, name: head.name } : null };
  const submitted = r && ['Submitted', 'Acknowledged'].includes(r.status);
  if (u.role === 'director') return submitted ? { ...base, ...structuredClone(r) } : { ...base, status: r?.status === 'Draft' ? 'In progress' : 'Not started' };
  return { ...base, ...(r ? structuredClone(r) : { status: 'Not started', highlights: '', issues: '', requests: '', returnNote: '' }),
    figures: submitted ? r.figures : departmentFigures(mock, dept, month) };
};

// ---- messages (mock) ----
const liveStaff = () => mock.staff.filter((x) => x.status === 'Active' && accountOf(x.id)?.status === 'Active');
const personOf = (x) => ({ id: x.id, name: x.name, title: x.title, role: x.role, department: x.department });
const staffById = (id) => mock.staff.find((x) => x.id === id);
const isUnread = (t, uid) => t.messages.slice(t.readUpTo[uid] ?? 0).some((m) => m.fromId !== uid);
const deptNames = (keys) => keys.map((k) => DEPARTMENTS.find((d) => d.key === k)?.label).filter(Boolean);
const threadView = (t, uid) => ({
  id: t.id, subject: t.subject, departments: deptNames(t.departments), unread: isUnread(t, uid),
  members: t.members.map((id) => personOf(staffById(id))),
  messages: t.messages.map((m) => ({ id: m.id, at: m.at, body: m.body, from: personOf(staffById(m.fromId)) })),
});
const myThread = (id, u) => { const t = mock.threads.find((x) => x.id === id); if (!t || !t.members.includes(u.id)) throw new Error('Not allowed.'); return t; };
const taskView = (t) => ({ ...structuredClone(t), fromName: staffById(t.fromId)?.name ?? '', assigneeName: t.assigneeId ? staffById(t.assigneeId)?.name ?? '' : '',
  fromDeptLabel: deptNames([t.fromDept])[0] ?? '', toDeptLabel: deptNames([t.toDept])[0] ?? '' });
const needUser = () => { const u = sessionUser(); if (!u) throw new Error('Please sign in again.'); return u; };

const apiBase = {
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
          ...flagged.map((a) => ({ id: `fl-${a.id}`, level: 'high', roles: ['director', 'surgeon', 'nurse'], text: `${a.patient}: flagged recovery reading needs clinician review (${unreviewed(a)[0].flags[0]})` })),
          ...overdue.map((a) => ({ id: `od-${a.id}`, level: 'medium', roles: ['director', 'surgeon', 'nurse', 'frontdesk'], text: `${a.patient}: follow-up overdue (${overdueFollowUps(a)[0].label})` })),
        ];
        // Money alerts carry `roles` so clinical staff don't see amounts. The backend must filter them the same way.
        const money = mock.invoices.filter((i) => invoiceStatus(i) === 'Overdue').map((i) => ({ id: `inv-${i.id}`, level: 'medium', roles: ['director', 'frontdesk', 'finance'],
          text: `${i.patient}: invoice ${i.id} is overdue, ₦${invoiceBalance(i).toLocaleString('en-NG')} outstanding` }));
        const stockAlerts = mock.medications.flatMap((m) => {
          const st = stockState(m); const out = [];
          if (st !== 'OK') out.push({ id: `st-${m.id}`, level: st === 'Out of stock' ? 'high' : 'medium', roles: ['director', 'surgeon', 'nurse', 'pharmacist'], text: `${m.name}: ${st === 'Out of stock' ? 'out of stock' : `low stock (${usableStock(m)} left, reorder at ${m.reorderLevel})`}` });
          if (expiredStock(m) > 0) out.push({ id: `ex-${m.id}`, level: 'medium', roles: ['director', 'nurse', 'pharmacist'], text: `${m.name}: ${expiredStock(m)} expired in stock, write off before it’s used` });
          return out;
        });
        const labAlerts = [
          ...mock.labRequests.filter((l) => l.status === 'Resulted' && flaggedResults(l).length).map((l) => ({ id: `lab-${l.id}`, level: 'high', roles: ['director', 'surgeon'],
            text: `${l.patient}: abnormal ${l.test} result waiting for review` })),
          ...mock.labRequests.filter((l) => l.priority === 'Urgent' && ['Requested', 'Collected'].includes(l.status)).map((l) => ({ id: `lu-${l.id}`, level: 'medium', roles: ['director', 'surgeon', 'nurse'],
            text: `${l.patient}: urgent ${l.test} is ${l.status === 'Requested' ? 'waiting to be collected' : 'waiting for a result'}` })),
        ];
        return { kpis, revenue: mock.revenue, surgeries: list, alerts: [...mock.alerts.filter((x) => x.id !== 3 && x.id !== 2), ...derived, ...labAlerts, ...stockAlerts, ...money], activity: mock.activity };
      })())
    : request('/dashboard'),

  // ---- laboratory ----
  getLabRequests: ({ patientId } = {}) => USE_MOCK
    ? delay(mock.labRequests.filter((l) => !patientId || l.patientId === patientId).map((l) => structuredClone(l)), 150)
    : request(`/lab-requests${patientId ? `?patientId=${patientId}` : ''}`),
  getLabRequest: (id) => USE_MOCK ? delay(structuredClone(mock.labRequests.find((l) => l.id === id) ?? null), 150) : request(`/lab-requests/${id}`),
  // One request per test. The server must refuse duplicates that are still open.
  createLabRequests: (body) => {
    if (!USE_MOCK) return request('/lab-requests', { method: 'POST', body });
    const actor = sessionUser();
    if (!actor || !canRequestLab(actor, linkedDepartments('laboratory'))) return Promise.reject(new Error('Your department doesn’t work with the laboratory. Ask the Medical Director.'));
    const p = mock.patients.find((x) => x.id === body.patientId);
    if (!p) return Promise.reject(new Error('Choose a patient.'));
    if (!body.tests.length) return Promise.reject(new Error('Choose at least one test.'));
    const dup = body.tests.find((t) => mock.labRequests.some((l) => l.patientId === p.id && l.test === t && OPEN_STATUSES.includes(l.status)));
    if (dup) return Promise.reject(new Error(`${dup} is already requested for ${p.name}.`));
    const made = body.tests.map((test) => mock.blankLab({ patientId: p.id, patient: p.name, test, priority: body.priority, requestedBy: actor.name, clinicalNote: body.clinicalNote.trim() }));
    made.forEach((l) => { l.requestedById = actor.id; l.requestedByDept = actor.department; });
    mock.labRequests.push(...made);
    return delay(structuredClone(made), 200);
  },
  // A request waits in the laboratory department's queue. A member of the laboratory takes it and does the lab work; a different surgeon (or the Medical Director) signs it off.
  // The server must check the person from the session, never from the body, and write the names itself.
  takeLabRequest: (id) => {
    if (!USE_MOCK) return request(`/lab-requests/${id}/take`, { method: 'POST' });
    const u = sessionUser(); const r = mock.labRequests.find((x) => x.id === id);
    if (!u || !r) return Promise.reject(new Error('Request not found.'));
    if (!isLabStaff(u)) return Promise.reject(new Error('Only the laboratory team can take a lab request.'));
    if (!isLabOpen(r)) return Promise.reject(new Error('This request is no longer waiting for lab work.'));
    if (r.takenById) return Promise.reject(new Error(`${r.takenByName} has already taken this request.`));
    Object.assign(r, { takenById: u.id, takenByName: u.name, takenAt: new Date().toISOString() });
    return delay(structuredClone(r), 200);
  },
  // The person who took it, or the head of the laboratory, can put it back in the queue.
  releaseLabRequest: (id) => {
    if (!USE_MOCK) return request(`/lab-requests/${id}/release`, { method: 'POST' });
    const u = sessionUser(); const r = mock.labRequests.find((x) => x.id === id);
    if (!u || !r) return Promise.reject(new Error('Request not found.'));
    if (!labActions(r, u).release) return Promise.reject(new Error('You can’t put this request back in the queue.'));
    Object.assign(r, { takenById: '', takenByName: '', takenAt: null });
    return delay(structuredClone(r), 200);
  },
  // Steps run in order: Requested, Collected, Resulted, Reviewed. A request can be cancelled until it is reviewed.
  saveLabRequest: (r) => {
    if (!USE_MOCK) return request(`/lab-requests/${r.id}`, { method: 'PUT', body: r });
    const u = sessionUser(); if (!u) return Promise.reject(new Error('Please sign in again.'));
    const i = mock.labRequests.findIndex((x) => x.id === r.id);
    const before = mock.labRequests[i];
    if (['Reviewed', 'Cancelled'].includes(before.status)) return Promise.reject(new Error('This request is closed.'));
    const rank = { Requested: 0, Collected: 1, Resulted: 2, Reviewed: 3 };
    const to = r.status; const can = labActions(before, u); const now = new Date().toISOString();
    if (to === before.status) return delay(structuredClone(before), 100);
    const next = { ...before, status: to };
    if (to === 'Cancelled') {
      if (!can.cancel) return Promise.reject(new Error('Only a surgeon or the Medical Director can cancel a lab request.'));
      if (!String(r.cancelReason || '').trim()) return Promise.reject(new Error('Say why the request is being cancelled.'));
      next.cancelReason = r.cancelReason.trim();
    } else {
      if (rank[to] !== rank[before.status] + 1) return Promise.reject(new Error('That step can’t be skipped.'));
      if (to === 'Collected' || to === 'Resulted') {
        if (!can.work) return Promise.reject(new Error(before.takenById ? `${before.takenByName} took this request, so only they can do the lab work.` : 'Take this request from the queue first.'));
      }
      if (to === 'Collected') Object.assign(next, { collectedAt: now, collectedBy: u.name, sampleNote: String(r.sampleNote || '').trim() });
      if (to === 'Resulted') {
        const draft = { ...before, results: r.results };
        const missing = missingFields(draft); if (missing.length) return Promise.reject(new Error(`Enter: ${missing.join(', ')}.`));
        const bad = validateResults(draft); if (bad.length) return Promise.reject(new Error(bad[0]));
        Object.assign(next, { results: r.results, resultedAt: now, resultedBy: u.name, resultedById: u.id });
      }
      if (to === 'Reviewed') {
        if (!['director', 'surgeon'].includes(u.role)) return Promise.reject(new Error('Only a surgeon or the Medical Director can sign off a result.'));
        if (!can.review) return Promise.reject(new Error('You entered these results, so someone else has to sign them off.'));
        if (flaggedResults(before).length && !String(r.reviewNote || '').trim()) return Promise.reject(new Error('Add a note on the abnormal result before signing off.'));
        Object.assign(next, { reviewNote: String(r.reviewNote || '').trim(), reviewedAt: now, reviewedBy: u.name });
      }
    }
    mock.labRequests[i] = next;
    // A normal reviewed result ticks the matching "Result reviewed" item on the patient's surgical plan. Abnormal ones are left for the surgeon.
    if (to === 'Reviewed' && flaggedResults(next).length === 0) {
      const plan = mock.plans.find((p) => p.patientId === next.patientId && p.status !== 'Cancelled');
      const item = plan?.checklist.find((c) => c.label === `Result reviewed: ${next.test}` && c.state === 'pending');
      if (item) Object.assign(item, { state: 'done', by: next.reviewedBy, at: todayISO() });
    }
    return delay(structuredClone(next), 200);
  },

  // ---- pharmacy ----
  getMedications: () => USE_MOCK ? delay(mock.medications.map((m) => structuredClone(m)), 150) : request('/medications'),
  getMedication: (id) => USE_MOCK
    ? delay((() => { const m = mock.medications.find((x) => x.id === id); return m ? { item: structuredClone(m), movements: mock.stockMovements.filter((x) => x.itemId === id).map((x) => ({ ...x })).sort((a, b) => b.at.localeCompare(a.at)) } : null; })(), 150)
    : request(`/medications/${id}`),
  // Stock changes always leave a ledger entry. The server must write them in the same transaction.
  receiveStock: ({ itemId, batchNo, expiry, qty }, by) => {
    if (!USE_MOCK) return request(`/medications/${itemId}/receive`, { method: 'POST', body: { batchNo, expiry, qty } });
    const m = medById(itemId); const n = Number(qty);
    if (!batchNo.trim()) return Promise.reject(new Error('Enter the batch number.'));
    if (!Number.isInteger(n) || n < 1) return Promise.reject(new Error('Quantity must be a whole number, 1 or more.'));
    if (!expiry || expiry <= todayISO()) return Promise.reject(new Error('Expiry must be a future date. Don’t receive expired stock.'));
    const b = m.batches.find((x) => x.batchNo === batchNo.trim());
    if (b && b.expiry !== expiry) return Promise.reject(new Error(`Batch ${b.batchNo} already exists with expiry ${b.expiry}.`));
    if (b) b.qty += n; else m.batches.push({ batchNo: batchNo.trim(), expiry, qty: n });
    mock.addMovement(itemId, 'Received', n, batchNo.trim(), by);
    return delay({ ok: true }, 200);
  },
  adjustStock: ({ itemId, batchNo, newQty, reason }, by) => {
    if (!USE_MOCK) return request(`/medications/${itemId}/adjust`, { method: 'POST', body: { batchNo, newQty, reason } });
    const m = medById(itemId); const b = m.batches.find((x) => x.batchNo === batchNo); const n = Number(newQty);
    if (!b) return Promise.reject(new Error('Batch not found.'));
    if (!Number.isInteger(n) || n < 0) return Promise.reject(new Error('Quantity must be a whole number, 0 or more.'));
    if (!reason.trim()) return Promise.reject(new Error('Say why the count is being changed.'));
    mock.addMovement(itemId, 'Adjusted', n - b.qty, batchNo, by, reason.trim());
    b.qty = n;
    return delay({ ok: true }, 200);
  },
  writeOffExpired: (itemId, by) => {
    if (!USE_MOCK) return request(`/medications/${itemId}/write-off-expired`, { method: 'POST' });
    const m = medById(itemId);
    m.batches.filter((b) => batchState(b) === 'Expired' && b.qty > 0).forEach((b) => { mock.addMovement(itemId, 'Expired write-off', -b.qty, b.batchNo, by, `Expired ${b.expiry}`); b.qty = 0; });
    return delay({ ok: true }, 200);
  },
  getPrescriptions: ({ patientId } = {}) => USE_MOCK
    ? delay(mock.prescriptions.filter((r) => !patientId || r.patientId === patientId).map(rxView), 150)
    : request(`/prescriptions${patientId ? `?patientId=${patientId}` : ''}`),
  getPrescription: (id) => USE_MOCK ? delay(rxView(mock.prescriptions.find((r) => r.id === id) ?? null), 150) : request(`/prescriptions/${id}`),
  // A medicine that matches a recorded allergy needs a written override. The server must enforce this too.
  createPrescription: (body) => {
    if (!USE_MOCK) return request('/prescriptions', { method: 'POST', body });
    const actor = sessionUser();
    if (!actor || !['director', 'surgeon', 'pharmacist'].includes(actor.role)) return Promise.reject(new Error('Only a surgeon, the Medical Director or a pharmacist can write prescriptions.'));
    const fromPharmacy = actor.role === 'pharmacist';
    const errs = validatePrescription(body); if (errs.length) return Promise.reject(new Error(errs[0]));
    // A pharmacist's prescription must go to a surgeon or nurse who is signed up and active. The server must check this too.
    const to = fromPharmacy ? liveStaff().find((x) => x.id === body.sendToId && ['surgeon', 'nurse'].includes(x.role) && x.id !== actor.id) : null;
    if (fromPharmacy && !to) return Promise.reject(new Error('Choose the surgeon or nurse this prescription is for.'));
    const pt = mock.patients.find((x) => x.id === body.patientId);
    const lines = body.lines.map((l) => { const m = medById(l.itemId); return { itemId: m.id, name: m.name, dose: l.dose.trim(), frequency: l.frequency, days: Number(l.days), qty: Number(l.qty), controlled: m.controlled }; });
    const clash = [...new Set(lines.map((l) => allergyConflict(medById(l.itemId), allergiesOf(pt.id))).filter(Boolean))];
    if (clash.length && !body.allergyOverride?.reason?.trim()) return Promise.reject(new Error(`This patient is allergic to ${clash.join(', ')}. Choose another medicine or record why it is safe.`));
    const rx = mock.blankRx({ patientId: pt.id, patient: pt.name, lines, notes: body.notes.trim(), allergyOverride: clash.length ? { allergen: clash.join(', '), reason: body.allergyOverride.reason.trim(), by: body.by } : null,
      ...(fromPharmacy ? { prescriberName: actor.name, createdById: actor.id, sentToId: to.id, source: 'Pharmacy' } : { prescriberId: body.prescriberId, createdById: actor.id }) });
    mock.prescriptions.unshift(rx);
    return delay(rxView(rx), 200);
  },
  // The surgeon or nurse a pharmacist's prescription was sent to replies with the action taken: approve, record an action, send it back or decline.
  // A note is required for every reply except Approve. Returned and Declined stop it being dispensed. Nobody else can reply.
  respondPrescription: (id, { action, note = '' }) => {
    if (!USE_MOCK) return request(`/prescriptions/${id}/respond`, { method: 'POST', body: { action, note } });
    const u = sessionUser(); const rx = mock.prescriptions.find((r) => r.id === id);
    if (!u || !rx) return Promise.reject(new Error('Prescription not found.'));
    if (rx.sentToId !== u.id) return Promise.reject(new Error('This prescription wasn’t sent to you.'));
    if (rx.receipt) return Promise.reject(new Error('You have already replied to this prescription.'));
    if (rx.cancelledAt) return Promise.reject(new Error('This prescription is cancelled.'));
    const reply = RX_REPLIES[action];
    if (!reply) return Promise.reject(new Error('Unknown action.'));
    if (reply.needsNote && !note.trim()) return Promise.reject(new Error(reply.prompt.replace(' (required)', '')));
    rx.receipt = { state: reply.state, at: new Date().toISOString(), byId: u.id, note: note.trim() };
    return delay(rxView(rx), 200);
  },
  cancelPrescription: (id, reason) => {
    if (!USE_MOCK) return request(`/prescriptions/${id}/cancel`, { method: 'POST', body: { reason } });
    const rx = mock.prescriptions.find((r) => r.id === id);
    if (rx.lines.some((l) => l.dispensedQty > 0)) return Promise.reject(new Error('Part of this prescription has been dispensed, so it can’t be cancelled.'));
    if (!reason.trim()) return Promise.reject(new Error('Say why it is being cancelled.'));
    rx.cancelledAt = new Date().toISOString(); rx.cancelReason = reason.trim();
    return delay(rxView(rx), 200);
  },
  // Takes stock first-expiry-first-out, refuses expired stock, allergy clashes and over-dispensing, and needs a witness for controlled drugs.
  dispensePrescription: (id, { lines, witness }, by) => {
    if (!USE_MOCK) return request(`/prescriptions/${id}/dispense`, { method: 'POST', body: { lines, witness } });
    const rx = mock.prescriptions.find((r) => r.id === id);
    if (rx.cancelledAt) return Promise.reject(new Error('This prescription is cancelled.'));
    if (rxBlocked(rx)) return Promise.reject(new Error(`The person it was sent to replied “${rx.receipt.state}”. It needs to be corrected or cancelled first.`));
    const picked = lines.filter((l) => Number(l.qty) > 0);
    if (picked.length === 0) return Promise.reject(new Error('Enter a quantity for at least one medicine.'));
    const plan = [];
    for (const l of picked) {
      const line = rx.lines.find((x) => x.itemId === l.itemId); const m = medById(l.itemId); const q = Number(l.qty);
      if (!Number.isInteger(q) || q < 1) return Promise.reject(new Error(`${m.name}: quantity must be a whole number.`));
      if (q > remaining(line)) return Promise.reject(new Error(`${m.name}: only ${remaining(line)} left to dispense on this prescription.`));
      const clash = allergyConflict(m, allergiesOf(rx.patientId));
      if (clash && !rx.allergyOverride) return Promise.reject(new Error(`${m.name} conflicts with a recorded ${clash} allergy. It needs a prescriber’s override first.`));
      const take = fefoPlan(m, q, todayISO());
      if (!take) return Promise.reject(new Error(`Not enough in-date ${m.name} in stock (${usableStock(m)} available).`));
      plan.push({ line, m, q, take });
    }
    if (plan.some((x) => x.m.controlled) && !witness.trim()) return Promise.reject(new Error('A controlled medicine needs a second member of staff as witness.'));
    plan.forEach(({ line, m, q, take }) => {
      take.forEach((t) => { m.batches.find((b) => b.batchNo === t.batchNo).qty -= t.qty; mock.addMovement(m.id, 'Dispensed', -t.qty, t.batchNo, by, `For ${rx.patient}`, rx.id); });
      line.dispensedQty += q;
    });
    rx.dispensings.push({ id: nextId(), at: new Date().toISOString(), by, witness: witness.trim(), lines: plan.map(({ m, q, take }) => ({ itemId: m.id, name: m.name, qty: q, batches: take })) });
    return delay(rxView(rx), 250);
  },


  // ---- tasks and requests between departments ----
  // Inside a department only the head assigns work. Between departments, anyone may send a request to a department they work with.
  // The server must apply the same rules (see src/utils/tasks.js and src/utils/interactions.js) and never trust the browser.
  getColleagues: () => !USE_MOCK ? request('/staff/colleagues') : later(() => {
    needUser(); return liveStaff().map((x) => ({ ...personOf(x), isHead: !!x.isHead }));
  }, 120),
  getTasks: () => !USE_MOCK ? request('/tasks') : later(() => {
    const u = needUser();
    return mock.tasks.filter((t) => canSeeTask(t, u)).map((t) => taskView(t)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, 150),
  createTask: (b) => !USE_MOCK ? request('/tasks', { method: 'POST', body: b }) : later(() => {
    const u = needUser(); const own = !!u.department && b.toDept === u.department;
    // The Medical Director may give work to a department head, or send a request to a department's queue. Never to anyone else inside a department.
    let headTarget = null;
    if (u.role === 'director' && b.assigneeId) {
      headTarget = liveStaff().find((x) => x.id === b.assigneeId && x.isHead && x.department);
      if (!headTarget) throw new Error('The Medical Director gives work to a department head. The head then gives it to a person on their team.');
      b = { ...b, toDept: headTarget.department };
    }
    const mode = headTarget ? 'head' : own ? 'assign' : 'request';
    const problem = validateTask({ ...b, mode }); if (problem) throw new Error(problem);
    if (own && !u.isHead) throw new Error('Only the head of your department can assign work inside it.');
    if (u.role === 'director' && own) throw new Error('The Medical Director has no department.');
    if (!own && !canRequestDepartment(u, b.toDept)) throw new Error('Your department doesn’t work with that department. Ask the Medical Director.');
    if (!DEPARTMENTS.some((d) => d.key === b.toDept)) throw new Error('Choose a department.');
    let assigneeId = headTarget ? headTarget.id : null;
    if (own) {
      const to = liveStaff().find((x) => x.id === b.assigneeId && x.department === u.department && x.id !== u.id);
      if (!to) throw new Error('Choose someone in your department.'); assigneeId = to.id;
    }
    const pt = b.patientId ? mock.patients.find((x) => x.id === b.patientId) : null;
    if (b.patientId && !pt) throw new Error('Patient not found.');
    const t = mock.blankTask({ title: b.title.trim(), details: (b.details || '').trim(), priority: b.priority === 'Urgent' ? 'Urgent' : 'Normal', dueDate: b.dueDate || '',
      patientId: pt?.id ?? null, patient: pt?.name ?? '', kind: own || headTarget ? 'assigned' : 'request', fromId: u.id, fromDept: u.department || '', toDept: b.toDept, assigneeId, byName: u.name });
    mock.tasks.push(t);
    return taskView(t);
  }, 250),
  // action: start | done | claim | assign | cancel | reopen. The server checks each against taskActions().
  updateTask: (id, { action, note = '', assigneeId = null }) => !USE_MOCK ? request(`/tasks/${id}/${action}`, { method: 'POST', body: { note, assigneeId } }) : later(() => {
    const u = needUser(); const t = mock.tasks.find((x) => x.id === id);
    if (!t || !canSeeTask(t, u)) throw new Error('Task not found.');
    if (!taskActions(t, u).includes(action)) throw new Error('You can’t do that to this task.');
    const log = (text) => { const at = new Date().toISOString(); t.history.push({ at, by: u.name, text }); t.updatedAt = at; };
    if (action === 'start') { t.status = 'In progress'; log('Started work'); }
    if (action === 'claim') { t.assigneeId = u.id; t.status = 'In progress'; log('Took the request'); }
    if (action === 'done') { t.status = 'Done'; t.doneNote = note.trim(); log(note.trim() ? `Marked done: ${note.trim()}` : 'Marked done'); }
    if (action === 'assign') {
      const to = liveStaff().find((x) => x.id === assigneeId && x.department === t.toDept);
      if (!to) throw new Error('Choose someone in that department.');
      t.assigneeId = to.id; t.status = 'To do'; log(`Assigned to ${to.name}`);
    }
    if (action === 'cancel') {
      if (!note.trim()) throw new Error('Say why it is being cancelled.');
      t.status = 'Cancelled'; log(`Cancelled: ${note.trim()}`);
    }
    if (action === 'reopen') {
      if (!note.trim()) throw new Error('Say what still needs doing.');
      t.status = 'To do'; t.doneNote = ''; log(`Reopened: ${note.trim()}`);
    }
    return taskView(t);
  }, 200),
  // The numbers shown beside Messages, Tasks and Pharmacy in the sidebar.
  getBadges: () => !USE_MOCK ? request('/badges') : later(() => {
    const u = sessionUser(); if (!u) return { messages: 0, tasks: 0, pharmacy: 0, laboratory: 0 };
    const mine = mock.tasks.filter((t) => isOpen(t) && t.assigneeId === u.id).length;
    const queue = u.department ? mock.tasks.filter((t) => isOpen(t) && t.toDept === u.department && !t.assigneeId).length : 0;
    return { messages: mock.threads.filter((t) => t.members.includes(u.id) && isUnread(t, u.id)).length, tasks: mine + queue,
      pharmacy: mock.prescriptions.filter((r) => r.sentToId === u.id && !r.receipt && !r.cancelledAt).length,
      // for the laboratory team: requests waiting in the queue, plus the ones they took that still need work
      laboratory: isLabStaff(u) ? mock.labRequests.filter((l) => inLabQueue(l) || (isLabOpen(l) && l.takenById === u.id)).length : 0 };
  }, 50),


  // ---- authentication ----
  // Step 1 of 2. A correct password never signs anyone in by itself: it returns a challenge for the code (or for setting up the app).
  login: ({ email, password, deviceToken }) => !USE_MOCK ? request('/auth/login', { method: 'POST', body: { email, password } }) : later(() => {
    const generic = 'Email or password is incorrect.';   // same message for unknown email and wrong password
    const st = findByEmail(email); const a = st && accountOf(st.id);
    if (!st || !a) throw new Error(generic);
    if (isLocked(a)) throw new Error(lockedMessage(a));
    if (st.status === 'Inactive' || a.status === 'Disabled') throw new Error('This account has been turned off. Contact the Staff Administrator.');
    if (a.status === 'Invited' || !a.password) throw new Error('This account isn’t active yet. Use the invitation link sent to your email.');
    if (a.password !== password) { throw new Error(recordFailure(a) ? `Too many failed attempts. The account is locked for ${LOCK_MINUTES} minutes.` : generic); }
    if (a.mfa && isTrusted(a, deviceToken)) {   // a device the person already trusted: no code needed
      Object.assign(a, { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() });
      session.set({ staffId: st.id, token: newToken() });
      return { step: 'done', user: publicUser(st) };
    }
    return a.mfa ? { step: 'mfa', challenge: newChallenge(st.id, 'mfa') } : startEnrol(st);   // no authenticator yet (for example after a reset): set one up now
  }),
  // Step 2 of 2: the 6-digit code, or one of the 8 one-time backup codes.
  verifyMfa: ({ challenge, code, remember }) => !USE_MOCK ? request('/auth/verify-mfa', { method: 'POST', body: { challenge, code, remember } }) : later(async () => {
    const c = getChallenge(challenge, 'mfa'); const st = mock.staff.find((x) => x.id === c.staffId); const a = accountOf(st.id);
    if (isLocked(a)) throw new Error(lockedMessage(a));
    const typed = String(code).trim().toLowerCase();
    const backup = a.backupCodes.find((b) => !b.used && b.code === typed);
    if (backup) backup.used = true;
    else if (!(await verifyTotp(a.mfa.secret, code))) throw new Error(recordFailure(a) ? `Too many failed attempts. The account is locked for ${LOCK_MINUTES} minutes.` : 'That code isn’t right. Check the 6 digits in your authenticator app.');
    challenges.delete(challenge);
    Object.assign(a, { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date().toISOString() });
    session.set({ staffId: st.id, token: newToken() });
    return { user: publicUser(st), backupCodesLeft: a.backupCodes.filter((b) => !b.used).length, deviceToken: remember ? trustDevice(a) : '' };
  }, 250),
  // Finishes setting up the authenticator app (first sign-in after an invitation, or after the Staff Administrator reset it).
  confirmEnrolment: ({ challenge, code, remember }) => !USE_MOCK ? request('/auth/confirm-enrolment', { method: 'POST', body: { challenge, code, remember } }) : later(async () => {
    const c = getChallenge(challenge, 'enrol'); const st = mock.staff.find((x) => x.id === c.staffId); const a = accountOf(st.id);
    if (isLocked(a)) throw new Error(lockedMessage(a));
    if (!(await verifyTotp(c.secret, code))) throw new Error(recordFailure(a) ? `Too many failed attempts. The account is locked for ${LOCK_MINUTES} minutes.` : 'That code isn’t right. Check the 6 digits in your authenticator app.');
    const codes = makeBackupCodes(); const now = new Date().toISOString();
    Object.assign(a, { mfa: { secret: c.secret, enrolledAt: now }, backupCodes: codes.map((x) => ({ code: x, used: false })), status: 'Active', invite: null, failedAttempts: 0, lockedUntil: null, lastLoginAt: now });
    challenges.delete(challenge);
    session.set({ staffId: st.id, token: newToken() });
    return { user: publicUser(st), backupCodes: codes, deviceToken: remember ? trustDevice(a) : '' };   // codes shown once, never again
  }, 250),
  // Prototype only, so the demo works without a phone. The real backend has nothing like this.
  demoMfaCode: (challenge) => later(async () => {
    const c = challenges.get(challenge); if (!c) return '';
    return totpAt(c.kind === 'enrol' ? c.secret : accountOf(c.staffId).mfa.secret);
  }, 50),
  me: () => !USE_MOCK ? request('/auth/me') : later(() => { const u = sessionUser(); if (!u) throw new Error('Not signed in'); return publicUser(u); }, 150),
  logout: () => !USE_MOCK ? request('/auth/logout', { method: 'POST' }) : later(() => { session.clear(); return { ok: true }; }, 50),
  // Always answers the same way, so nobody can use it to find out which emails have accounts.
  forgotPassword: ({ email }) => !USE_MOCK ? request('/auth/forgot-password', { method: 'POST', body: { email } }) : later(() => {
    const st = findByEmail(email); const a = st && accountOf(st.id); const out = { sent: true };
    if (st && a && st.status === 'Active' && a.status === 'Active') {
      a.reset = { token: newToken(), expiresAt: new Date(Date.now() + RESET_MINUTES * 60000).toISOString() };
      out.demoLink = `${origin()}/reset-password?token=${a.reset.token}`;   // demo only: the real backend emails this and never returns it
    }
    return out;
  }),
  // kind: 'invite' or 'reset'. Tells the page whose link it is, or that the link is no longer valid.
  checkToken: (kind, tk) => !USE_MOCK ? request(`/auth/${kind}/${tk}`) : later(() => {
    const f = byToken(kind, tk); if (!f) throw new Error(BAD_LINK);
    return { name: f.st.name, title: f.st.title, email: f.st.email, role: f.st.role, expiresAt: f.a[kind].expiresAt };
  }, 200),
  // A password reset never removes two-step verification: the person still needs their authenticator to sign in.
  resetPassword: ({ token, password }) => !USE_MOCK ? request('/auth/reset-password', { method: 'POST', body: { token, password } }) : later(() => {
    const f = byToken('reset', token); if (!f) throw new Error(BAD_LINK);
    const probs = passwordProblems(password, { name: f.st.name, email: f.st.email }); if (probs.length) throw new Error(probs[0]);
    Object.assign(f.a, { password, reset: null, failedAttempts: 0, lockedUntil: null, trusted: [] });
    return { ok: true };
  }),
  // First visit for an invited person: choose a password and accept the confidentiality statement. Then set up the authenticator.
  activate: ({ token, password, acknowledged }) => !USE_MOCK ? request('/auth/activate', { method: 'POST', body: { token, password, acknowledged } }) : later(() => {
    const f = byToken('invite', token); if (!f) throw new Error(BAD_LINK);
    if (!acknowledged) throw new Error('Please accept the confidentiality statement to continue.');
    const probs = passwordProblems(password, { name: f.st.name, email: f.st.email }); if (probs.length) throw new Error(probs[0]);
    f.a.password = password;   // the account stays "Invited" until the authenticator is confirmed
    return startEnrol(f.st);
  }),
  changePassword: ({ current, next }) => !USE_MOCK ? request('/auth/change-password', { method: 'POST', body: { current, next } }) : later(() => {
    const u = sessionUser(); if (!u) throw new Error('Please sign in again.');
    const a = accountOf(u.id);
    if (a.password !== current) throw new Error('Your current password is wrong.');
    if (next === current) throw new Error('Choose a password you haven’t used just now.');
    const probs = passwordProblems(next, { name: u.name, email: u.email }); if (probs.length) throw new Error(probs[0]);
    Object.assign(a, { password: next, trusted: [] });
    return { ok: true };
  }),

  // ---- sign-in accounts: Staff Administrator only (the Medical Director can't invite, reset or see links) ----
  getAccounts: () => USE_MOCK ? later(() => { requireRole('hr'); return mock.accounts.map((a) => ({ staffId: a.staffId, status: effectiveStatus(a, mock.staff.find((x) => x.id === a.staffId)),
    lastLoginAt: a.lastLoginAt, inviteExpiresAt: a.invite?.expiresAt ?? null, lockedUntil: isLocked(a) ? a.lockedUntil : null, twoStep: !!a.mfa })); }, 120) : request('/staff/accounts'),
  sendInvite: (staffId) => !USE_MOCK ? request(`/staff/${staffId}/invite`, { method: 'POST' }) : later(() => {
    requireRole('hr');
    const st = mock.staff.find((x) => x.id === staffId);
    if (st.status !== 'Active') throw new Error('Make this staff member active first.');
    let a = accountOf(staffId);
    if (a?.status === 'Active') throw new Error('This person already has an active account. Reset their password instead.');
    if (!a) { a = { staffId, status: 'Invited', password: null, failedAttempts: 0, lockedUntil: null, lastLoginAt: null, invite: null, reset: null, mfa: null, backupCodes: [] }; mock.accounts.push(a); }
    Object.assign(a, { status: 'Invited', password: null, mfa: null, backupCodes: [], trusted: [], invite: { token: newToken(), expiresAt: new Date(Date.now() + INVITE_HOURS * 36e5).toISOString() } });
    return { email: st.email, expiresAt: a.invite.expiresAt, inviteLink: `${origin()}/activate?token=${a.invite.token}` };   // the real backend emails the link instead
  }, 250),
  sendReset: (staffId) => !USE_MOCK ? request(`/staff/${staffId}/reset-password`, { method: 'POST' }) : later(() => {
    requireRole('hr');
    const st = mock.staff.find((x) => x.id === staffId); const a = accountOf(staffId);
    if (!a || a.status !== 'Active' || st.status !== 'Active') throw new Error('Only active accounts can be reset.');
    a.reset = { token: newToken(), expiresAt: new Date(Date.now() + RESET_MINUTES * 60000).toISOString() };
    return { email: st.email, expiresAt: a.reset.expiresAt, resetLink: `${origin()}/reset-password?token=${a.reset.token}` };
  }, 250),
  unlockAccount: (staffId) => !USE_MOCK ? request(`/staff/${staffId}/unlock`, { method: 'POST' }) : later(() => {
    requireRole('hr'); const a = accountOf(staffId); if (!a) throw new Error('No account.');
    a.lockedUntil = null; a.failedAttempts = 0; return { ok: true };
  }, 150),
  // For a lost or replaced phone. Check who is asking first. At their next sign-in the person sets up the authenticator again.
  resetTwoStep: (staffId) => !USE_MOCK ? request(`/staff/${staffId}/reset-two-step`, { method: 'POST' }) : later(() => {
    requireRole('hr'); const a = accountOf(staffId);
    if (!a || a.status !== 'Active') throw new Error('Only active accounts can be reset.');
    Object.assign(a, { mfa: null, backupCodes: [], trusted: [] }); return { ok: true };
  }, 150),

  // ---- messages ----
  // Only people you are allowed to message are listed. Departments are listed only if you may message every member.
  getMessageDirectory: () => !USE_MOCK ? request('/messages/directory') : later(() => {
    const u = needUser(); const others = liveStaff().filter((x) => x.id !== u.id);
    const departments = DEPARTMENTS.map((d) => { const m = others.filter((x) => x.department === d.key); return { key: d.key, label: d.label, memberCount: m.length, allowed: m.length > 0 && m.every((x) => canMessage(u.role, x.role)) }; })
      .filter((d) => d.allowed).map(({ allowed, ...d }) => d);
    return { people: others.filter((x) => canMessage(u.role, x.role)).map(personOf), departments };
  }, 150),
  getThreads: () => !USE_MOCK ? request('/messages/threads') : later(() => {
    const u = needUser();
    return mock.threads.filter((t) => t.members.includes(u.id)).map((t) => {
      const last = t.messages[t.messages.length - 1];
      return { id: t.id, subject: t.subject, unread: isUnread(t, u.id), lastAt: last.at, lastFrom: staffById(last.fromId).name, lastFromMe: last.fromId === u.id, preview: last.body.slice(0, 110),
        count: t.messages.length, with: t.members.filter((id) => id !== u.id).map((id) => staffById(id).name), departments: deptNames(t.departments) };
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, 150),
  getThread: (id) => !USE_MOCK ? request(`/messages/threads/${id}`) : later(() => { const u = needUser(); return threadView(myThread(id, u), u.id); }, 120),
  markThreadRead: (id) => !USE_MOCK ? request(`/messages/threads/${id}/read`, { method: 'POST' }) : later(() => { const u = needUser(); const t = myThread(id, u); t.readUpTo[u.id] = t.messages.length; return { ok: true }; }, 50),
  getUnreadCount: () => !USE_MOCK ? request('/messages/unread-count') : later(() => { const u = sessionUser(); return u ? mock.threads.filter((t) => t.members.includes(u.id) && isUnread(t, u.id)).length : 0; }, 50),
  // The server must check every recipient against the same rules, and never trust the list the browser sends.
  sendMessage: ({ toStaff = [], toDepartments = [], subject, body }) => !USE_MOCK ? request('/messages/threads', { method: 'POST', body: { toStaff, toDepartments, subject, body } }) : later(() => {
    const u = needUser();
    const problem = messageProblem({ subject, body }); if (problem) throw new Error(problem);
    const others = liveStaff().filter((x) => x.id !== u.id); const to = new Set();
    toStaff.forEach((id) => { const x = others.find((y) => y.id === id); if (!x || !canMessage(u.role, x.role)) throw new Error('You can’t message that person.'); to.add(x.id); });
    toDepartments.forEach((key) => {
      const m = others.filter((x) => x.department === key);
      if (!m.length || !m.every((x) => canMessage(u.role, x.role))) throw new Error(`You can’t message the ${deptNames([key])[0] || 'that'} department.`);
      m.forEach((x) => to.add(x.id));
    });
    if (to.size === 0) throw new Error('Choose at least one person or department.');
    const next = Math.max(0, ...mock.threads.map((t) => Number(t.id.slice(2)))) + 1;
    const t = { id: `T-${next}`, subject: subject.trim(), members: [u.id, ...to], departments: toDepartments, readUpTo: { [u.id]: 1 },
      messages: [{ id: 1, fromId: u.id, at: new Date().toISOString(), body: body.trim() }] };
    mock.threads.push(t);
    return threadView(t, u.id);
  }, 250),
  replyToThread: (id, { body }) => !USE_MOCK ? request(`/messages/threads/${id}/reply`, { method: 'POST', body: { body } }) : later(() => {
    const u = needUser(); const t = myThread(id, u);
    const problem = messageProblem({ subject: 'x', body }); if (problem) throw new Error(problem);
    t.messages.push({ id: t.messages.length + 1, fromId: u.id, at: new Date().toISOString(), body: body.trim() });
    t.readUpTo[u.id] = t.messages.length;
    return threadView(t, u.id);
  }, 200),

  // ---- staff (the Medical Director can read the list; only the Staff Administrator changes it) ----
  getStaff: () => USE_MOCK ? later(() => { const u = sessionUser(); if (!u || !can(u.role, 'viewStaff')) throw new Error('Not allowed.'); return mock.staff.map((x) => ({ ...x })); }, 150) : request('/staff'),
  // The server must also refuse: Medical Director or Staff Administrator accounts being created or changed here, and anyone turning off their own account.
  saveStaff: (x, opts = {}) => !USE_MOCK ? (x.id ? request(`/staff/${x.id}`, { method: 'PUT', body: x }) : request('/staff', { method: 'POST', body: x })) : later(() => {
    const actor = requireRole('hr');
    const before = x.id ? mock.staff.find((y) => y.id === x.id) : null;
    const clean = { ...x, name: x.name.trim(), email: x.email.trim(), title: (x.title || '').trim(), isHead: !!x.isHead, department: x.department || '' };
    const prob = protectedRoleProblem(clean, before, actor.id); if (prob) throw new Error(prob);
    const errs = validateStaff(clean, mock.staff, opts); if (errs.length) throw new Error(errs[0]);
    if (before) {
      mock.staff[mock.staff.findIndex((y) => y.id === x.id)] = clean;
      const acc = accountOf(x.id);
      if (acc && clean.status === 'Inactive') Object.assign(acc, { status: 'Disabled', password: null, invite: null, reset: null, mfa: null, backupCodes: [], trusted: [] });
      return { ...clean };
    }
    const next = Math.max(...mock.staff.map((y) => Number(y.id.slice(3)))) + 1;
    const created = { ...clean, id: `ST-${String(next).padStart(2, '0')}` };
    mock.staff.push(created);
    return { ...created };
  }, 200),
  // Reads the centre's existing staff portal (read-only). The HMS never receives portal passwords.
  getPortalStaff: () => !USE_MOCK ? request('/staff/portal') : later(() => {
    requireRole('hr');
    return mock.portalStaff.map((p) => ({ ...p, inHms: mock.staff.some((s) => s.portalId === p.portalId || s.email.toLowerCase() === p.email.toLowerCase()),
      suggestedRole: suggestRole(p.title), suggestedDepartment: suggestDepartment(p.department) }));
  }, 400),
  // rows come from the portal or a CSV, after the Staff Administrator has confirmed each role and department.
  importStaff: ({ rows }) => !USE_MOCK ? request('/staff/import', { method: 'POST', body: { rows } }) : later(() => {
    const actor = requireRole('hr'); const added = [], skipped = [];
    rows.forEach((r) => {
      const next = Math.max(...mock.staff.map((y) => Number(y.id.slice(3)))) + 1;
      const cand = { id: `ST-${String(next).padStart(2, '0')}`, name: (r.name || '').trim(), title: (r.title || '').trim(), role: r.role, department: r.department || '', isHead: false, phone: r.phone || '',
        email: (r.email || '').trim(), joined: todayISO(), status: 'Active', portalId: r.portalId || '' };
      const problem = protectedRoleProblem({ ...cand, id: undefined }, null, actor.id) || validateStaff(cand, mock.staff, { imported: true })[0]
        || (cand.portalId && mock.staff.some((s) => s.portalId === cand.portalId) ? 'Already in the HMS.' : '');
      if (problem) skipped.push({ name: cand.name || '(no name)', reason: problem }); else { mock.staff.push(cand); added.push({ ...cand }); }
    });
    return { added, skipped };
  }, 400),

  // ---- department reports ----
  // Each department head writes one report a month; the Medical Director reads, acknowledges or sends it back.
  getDepartmentReports: ({ month }) => USE_MOCK ? later(() => {
    const u = sessionUser(); if (!u) throw new Error('Please sign in again.');
    const depts = u.role === 'director' ? DEPARTMENTS : u.isHead ? DEPARTMENTS.filter((d) => d.key === u.department) : null;
    if (!depts) throw new Error('Not allowed.');
    return depts.map((d) => deptReportView(d.key, month, u));
  }, 200) : request(`/department-reports?month=${month}`),
  getDepartmentReport: (dept, month) => USE_MOCK ? later(() => {
    const u = sessionUser(); if (!u) throw new Error('Please sign in again.');
    if (!(u.role === 'director' || (u.isHead && u.department === dept))) throw new Error('Not allowed.');
    return deptReportView(dept, month, u);
  }, 200) : request(`/department-reports/${dept}/${month}`),
  saveDepartmentDraft: (dept, month, body) => !USE_MOCK ? request(`/department-reports/${dept}/${month}`, { method: 'PUT', body }) : later(() => {
    const u = headOnly(dept); const r = reportRecord(dept, month, u);
    if (['Submitted', 'Acknowledged'].includes(r.status)) throw new Error('This report has already been submitted.');
    Object.assign(r, { highlights: body.highlights, issues: body.issues, requests: body.requests });
    return deptReportView(dept, month, u);
  }, 200),
  submitDepartmentReport: (dept, month, body) => !USE_MOCK ? request(`/department-reports/${dept}/${month}/submit`, { method: 'POST', body }) : later(() => {
    const u = headOnly(dept); const r = reportRecord(dept, month, u);
    if (['Submitted', 'Acknowledged'].includes(r.status)) throw new Error('This report has already been submitted.');
    if ((body.highlights || '').trim().length < 10) throw new Error('Say what went well (at least a sentence).');
    if ((body.issues || '').trim().length < 10) throw new Error('Describe any problems, or write that there were none.');
    Object.assign(r, { highlights: body.highlights.trim(), issues: body.issues.trim(), requests: (body.requests || '').trim(), status: 'Submitted', submittedAt: new Date().toISOString(),
      figures: departmentFigures(mock, dept, month), authorId: u.id, authorName: u.name, returnNote: '' });   // the figures are frozen as they were when it was submitted
    return deptReportView(dept, month, u);
  }, 250),
  reviewDepartmentReport: (dept, month, { action, note }) => !USE_MOCK ? request(`/department-reports/${dept}/${month}/review`, { method: 'POST', body: { action, note } }) : later(() => {
    const u = requireRole('director'); const r = mock.departmentReports.find((x) => x.department === dept && x.month === month);
    if (!r || r.status !== 'Submitted') throw new Error('Only a submitted report can be reviewed.');
    if (action === 'return') { if (!(note || '').trim()) throw new Error('Say what needs changing.'); Object.assign(r, { status: 'Draft', returnNote: note.trim(), submittedAt: null }); }
    else Object.assign(r, { status: 'Acknowledged', ackBy: u.name, ackAt: new Date().toISOString(), ackNote: (note || '').trim() });
    return deptReportView(dept, month, u);
  }, 200),

  // ---- money report (lives in Billing: Finance and Medical Director only) ----
  getMoneyReport: ({ from, to }) => USE_MOCK ? later(() => {
    const u = sessionUser(); if (!u || !can(u.role, 'viewRevenue')) throw new Error('Not allowed.');
    return buildMoneyReport(mock, { from, to });
  }, 250) : request(`/billing/money-report?from=${from}&to=${to}`),

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
    autoRequestLabs(done);
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

seedDepartmentReports(mock);

// Prototype only: keep the demo data in the browser (see persist.js). Before each call, pick up what another tab saved; after it, save.
const READ_ONLY = /^(get|check|demo)|^me$/;   // reading never changes anything, so there's nothing to save
const withSaving = (fns) => Object.fromEntries(Object.entries(fns).map(([name, fn]) => {
  const save = READ_ONLY.test(name) ? () => {} : saveDemo;
  return [name, (...args) => {
    syncDemo();
    let out; try { out = fn(...args); } catch (e) { save(); throw e; }
    return Promise.resolve(out).then((v) => { save(); return v; }, (e) => { save(); throw e; });
  }];
}));
if (USE_MOCK) startDemo();
export const api = USE_MOCK ? withSaving(apiBase) : apiBase;
