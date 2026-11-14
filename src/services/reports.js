// How each report number is worked out. The real backend should compute these in the database and apply the same role rules.
import { addDays, fromISO, isSunday, todayISO } from '../utils/dates';
import { DEPARTMENTS, monthRange } from '../utils/departments';
import { invoiceBalance, invoiceStatus, invoiceTotal, quoteStatus } from '../utils/billing';
import { flaggedResults } from '../utils/laboratory';
import { followUpState, unreviewed } from '../utils/aftercare';
import { batchState, expiredStock, stockState } from '../utils/pharmacy';
import { isActive } from '../utils/theatre';

const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const fig = (label, value, note = '') => ({ label, value: String(value), note });
const DAY_MIN = 600;   // theatre day: 08:00 to 18:00

// ---------------------------------------------------------------- department figures (no money anywhere in these)
export function departmentFigures(mock, dept, month) {
  const [from, to] = monthRange(month);
  const today = todayISO();
  const inR = (iso) => !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
  const out = [];

  if (dept === 'frontdesk') {
    const a = mock.appointments.filter((x) => inR(x.date));
    const by = (st) => a.filter((x) => x.status === st).length;
    out.push(fig('Appointments booked', a.length), fig('Completed', by('Completed')),
      fig('No-shows', by('No-show'), `${pct(by('No-show'), a.length - by('Cancelled'))} of appointments that went ahead or were missed`), fig('Cancelled', by('Cancelled')));
  }
  if (dept === 'clinic') {
    out.push(fig('Consultations completed', mock.consultations.filter((c) => c.status === 'Completed' && inR(c.completedAt)).length),
      fig('Consultations left in draft', mock.consultations.filter((c) => c.status === 'Draft' && inR(c.date)).length, 'Not yet signed off'),
      fig('Surgical plans marked ready', mock.plans.filter((p) => inR(p.readyAt)).length),
      fig('Plans still being prepared', mock.plans.filter((p) => p.status === 'Planning').length, 'Right now'),
      fig('Plans on hold', mock.plans.filter((p) => p.status === 'On hold').length, 'Right now'));
  }
  if (dept === 'theatre') {
    const performed = mock.surgeries.filter((s) => inR(s.date) && ['In theatre', 'Recovering', 'Completed'].includes(s.status));
    const byProc = {}; performed.forEach((s) => { byProc[s.procedure] = (byProc[s.procedure] || 0) + 1; });
    const reached = performed.filter((s) => ['Recovering', 'Completed'].includes(s.status));
    const safe = reached.filter((s) => s.safety.signIn && s.safety.timeOut && s.safety.signOut).length;
    const end = to < today ? to : today; let workDays = 0;
    for (let d = from; d <= end; d = addDays(d, 1)) if (!isSunday(d)) workDays += 1;
    const booked = sum(mock.surgeries.filter((s) => isActive(s) && s.date >= from && s.date <= end), (s) => Number(s.duration));
    const theatres = new Set(mock.surgeries.map((s) => s.theatreId)).size || 1;
    out.push(fig('Surgeries performed', performed.length, Object.entries(byProc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')),
      fig('Postponed or cancelled', mock.surgeries.filter((s) => inR(s.date) && !isActive(s)).length),
      fig('Safety checks fully completed', pct(safe, reached.length), 'Of cases that reached recovery'),
      fig('Theatre use', pct(booked, workDays * DAY_MIN * theatres), 'Booked hours against 08:00 to 18:00, Mon to Sat'));
  }
  if (dept === 'aftercare') {
    const recs = mock.aftercare;
    const open = recs.filter((r) => r.status === 'In recovery');
    const overdue = sum(open, (r) => r.followUps.filter((f) => followUpState({ ...f, appointment: mock.appointments.find((x) => x.id === f.appointmentId) }) === 'Overdue').length);
    const done = sum(recs, (r) => r.followUps.filter((f) => { const ap = mock.appointments.find((x) => x.id === f.appointmentId); return ap && ap.status === 'Completed' && inR(ap.date); }).length);
    out.push(fig('Patients in recovery', open.length, 'Right now'), fig('Discharged', recs.filter((r) => inR(r.dischargedAt)).length),
      fig('Follow-ups completed', done), fig('Follow-ups overdue', overdue, 'Right now'),
      fig('Readings waiting for review', sum(open, (r) => unreviewed(r).length), 'Right now'));
  }
  if (dept === 'laboratory') {
    const reqs = mock.labRequests.filter((l) => inR(l.requestedAt));
    const reviewed = mock.labRequests.filter((l) => l.status === 'Reviewed' && inR(l.reviewedAt));
    const resulted = mock.labRequests.filter((l) => ['Resulted', 'Reviewed'].includes(l.status) && inR(l.resultedAt));
    const tat = reviewed.length ? (sum(reviewed, (l) => (new Date(l.reviewedAt) - new Date(l.requestedAt)) / 36e5) / reviewed.length).toFixed(1) : null;
    out.push(fig('Requests received', reqs.length), fig('Results signed off', reviewed.length),
      fig('Average turnaround', tat === null ? '—' : `${tat} h`, 'Request to sign-off'),
      fig('Abnormal results', pct(resulted.filter((l) => flaggedResults(l).length).length, resulted.length)),
      fig('Urgent tests still open', mock.labRequests.filter((l) => l.priority === 'Urgent' && ['Requested', 'Collected', 'Resulted'].includes(l.status)).length, 'Right now'));
  }
  if (dept === 'pharmacy') {
    const controlled = new Set(mock.medications.filter((m) => m.controlled).map((m) => m.id));
    out.push(fig('Prescriptions written', mock.prescriptions.filter((r) => inR(r.createdAt)).length),
      fig('Dispensing events', sum(mock.prescriptions, (r) => r.dispensings.filter((d) => inR(d.at)).length)),
      fig('Controlled medicine units dispensed', sum(mock.stockMovements.filter((m) => m.type === 'Dispensed' && controlled.has(m.itemId) && inR(m.at)), (m) => Math.abs(m.qty))),
      fig('Medicines low or out of stock', mock.medications.filter((m) => stockState(m) !== 'OK').length, 'Right now'),
      fig('Expired units in stock', sum(mock.medications, expiredStock), 'Right now: write off'),
      fig('Medicines with stock expiring soon', mock.medications.filter((m) => m.batches.some((b) => b.qty > 0 && batchState(b) === 'Expiring')).length, 'Within 90 days'));
  }
  if (dept === 'finance') {   // counts only: the money figures live in Billing
    const live = mock.invoices.filter((i) => !i.voidedAt);
    const quotes = mock.quotations.filter((q) => inR(q.sentAt));
    out.push(fig('Invoices issued', live.filter((i) => inR(i.issuedAt)).length), fig('Quotations sent', quotes.length),
      fig('Quotations accepted', pct(quotes.filter((q) => q.status === 'Accepted').length, quotes.length)),
      fig('Invoices overdue', live.filter((i) => invoiceStatus(i) === 'Overdue').length, 'Right now'),
      fig('Payments recorded', sum(live, (i) => i.payments.filter((p) => inR(p.at)).length)));
  }

  const team = mock.staff.filter((s) => s.status === 'Active' && s.department === dept);
  out.push(fig('Staff in this department', team.length));
  return out;
}

// A few reports already filed, so the director's screen isn't empty in the demo.
export function seedDepartmentReports(mock) {
  const month = todayISO().slice(0, 7);
  const file = (dept, status, highlights, issues, requests, extra = {}) => {
    const head = mock.staff.find((s) => s.isHead && s.department === dept);
    mock.departmentReports.push({ department: dept, month, status, highlights, issues, requests, figures: departmentFigures(mock, dept, month),
      authorId: head.id, authorName: head.name, submittedAt: new Date(Date.now() - 36e5 * 5).toISOString(), ackBy: '', ackAt: null, ackNote: '', returnNote: '', ...extra });
  };
  file('theatre', 'Acknowledged', 'Every case this month started on time and all three safety checks were completed.', 'Theatre 2 recovery chairs are worn and one monitor needs recalibration.',
    'Approve servicing for the Theatre 2 monitor.', { ackBy: 'Dr. Chidi Eze', ackAt: new Date(Date.now() - 36e5).toISOString(), ackNote: 'Approved. Please book the servicing this week.' });
  file('clinic', 'Submitted', 'Consultation notes are being signed off the same day.', 'Two patients waited over a week for a consultation slot.', 'A third consultation room on Thursdays.');
  file('frontdesk', 'Submitted', 'Reminder calls reduced no-shows.', 'Phones are overwhelmed between 9 and 11 in the morning.', 'A second person on phones in the mornings.');
}

// ---------------------------------------------------------------- money report (Billing section, Finance and Medical Director only)
export function buildMoneyReport(mock, { from, to }) {
  const today = todayISO();
  const inRange = (iso) => !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
  const live = mock.invoices.filter((i) => !i.voidedAt);
  const issued = live.filter((i) => inRange(i.issuedAt));
  const pays = live.flatMap((i) => i.payments.map((p) => ({ ...p, invoice: i }))).filter((p) => inRange(p.at));
  const open = live.filter((i) => invoiceBalance(i) > 0);
  const order = ['Not yet due', '1 to 30 days late', '31 to 60 days late', 'Over 60 days late'];
  const bucket = (i) => { const late = Math.round((fromISO(today) - fromISO(i.dueDate)) / 864e5); return late <= 0 ? order[0] : late <= 30 ? order[1] : late <= 60 ? order[2] : order[3]; };
  const aging = order.map((name) => ({ name, amount: sum(open.filter((i) => bucket(i) === name), invoiceBalance) }));
  const byProc = {};
  issued.forEach((i) => { const r = (byProc[i.procedure] ||= { procedure: i.procedure, invoices: 0, invoiced: 0, outstanding: 0 }); r.invoices += 1; r.invoiced += invoiceTotal(i); r.outstanding += invoiceBalance(i); });
  const methods = {}; pays.forEach((p) => { methods[p.method] = (methods[p.method] || 0) + p.amount; });
  const quotes = mock.quotations.filter((q) => inRange(q.sentAt));
  const accepted = quotes.filter((q) => q.status === 'Accepted').length;
  return {
    period: { from, to },
    invoiced: sum(issued, invoiceTotal), collected: sum(pays, (p) => p.amount), outstandingNow: sum(open, invoiceBalance),
    collectedByMethod: Object.entries(methods).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    aging, byProcedure: Object.values(byProc).sort((a, b) => b.invoiced - a.invoiced),
    topOutstanding: [...open].sort((a, b) => invoiceBalance(b) - invoiceBalance(a)).slice(0, 5)
      .map((i) => ({ id: i.id, patient: i.patient, procedure: i.procedure, balance: invoiceBalance(i), dueDate: i.dueDate, status: invoiceStatus(i) })),
    quotes: { sent: quotes.length, accepted, declined: quotes.filter((q) => q.status === 'Declined').length, expired: quotes.filter((q) => quoteStatus(q) === 'Expired').length,
      conversion: quotes.length ? Math.round((accepted / quotes.length) * 100) : 0 },
    monthly: mock.revenue,   // demonstration series: the backend supplies the real monthly figures
  };
}
export { DEPARTMENTS };
