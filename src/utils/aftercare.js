import { addDays, fromISO, isSunday, todayISO } from './dates';
import { FOLLOW_UP_PLAN, LIMITS, WOUND_STATES } from '../components/aftercare/constants';

export const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / 86400000);

// Follow-ups are due on set days after surgery; the centre is closed on Sundays, so those move to Monday.
export const buildFollowUps = (surgeryDate) => FOLLOW_UP_PLAN.map((f) => {
  let due = addDays(surgeryDate, f.days);
  if (isSunday(due)) due = addDays(due, 1);
  return { key: f.key, label: f.label, type: f.type, dueDate: due, appointmentId: null };
});

const num = (v) => (v === '' || v == null ? NaN : Number(v));
const systolic = (bp) => { const m = /^(\d{2,3})\/(\d{2,3})$/.exec((bp || '').trim()); return m ? Number(m[1]) : NaN; };

// Why an observation needs a clinician's attention. The backend must apply the same rules.
export function getFlags(o) {
  const out = [];
  const t = num(o.temp), p = num(o.pulse), sys = systolic(o.bp), pain = num(o.pain);
  if (t >= LIMITS.tempHigh) out.push(`Temperature ${t}°C`);
  if (p > LIMITS.pulseHigh) out.push(`Pulse ${p} bpm (high)`);
  if (p < LIMITS.pulseLow) out.push(`Pulse ${p} bpm (low)`);
  if (sys < LIMITS.systolicLow) out.push(`Blood pressure ${o.bp} (low)`);
  if (sys > LIMITS.systolicHigh) out.push(`Blood pressure ${o.bp} (high)`);
  if (pain >= LIMITS.painHigh) out.push(`Pain ${pain} out of 10`);
  if (WOUND_STATES.find((w) => w.value === o.wound)?.concern) out.push(`Wound: ${o.wound.toLowerCase()}`);
  return out;
}

// Vitals are optional, but if typed they must be believable. Pain and wound are always recorded.
export function validateObservation(o) {
  const errs = [];
  const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  if (!inRange(num(o.pain), 0, 10)) errs.push('Choose a pain score from 0 to 10.');
  if (!o.wound) errs.push('Choose how the wound looks.');
  if (o.temp !== '' && !inRange(num(o.temp), 30, 43)) errs.push('Temperature should be between 30 and 43 °C.');
  if (o.pulse !== '' && !inRange(num(o.pulse), 20, 220)) errs.push('Pulse should be between 20 and 220 bpm.');
  if (o.bp !== '' && !(inRange(systolic(o.bp), 50, 260))) errs.push('Write blood pressure like 120/80.');
  return errs;
}

export const unreviewed = (rec) => rec.observations.filter((o) => o.flags.length > 0 && !o.review);

export function followUpState(f, today = todayISO()) {
  const a = f.appointment;
  const live = a && !['Cancelled', 'No-show'].includes(a.status);
  if (live && a.status === 'Completed') return 'Done';
  if (live) return a.date < today ? 'Overdue' : 'Booked';
  return f.dueDate < today ? 'Overdue' : 'Due';
}

export const overdueFollowUps = (rec, today = todayISO()) => rec.followUps.filter((f) => followUpState(f, today) === 'Overdue');

// What stops someone leaving active recovery monitoring. The backend must enforce the same rules.
export function getDischargeBlockers(rec) {
  const out = [];
  if (rec.observations.length === 0) out.push('Record at least one observation');
  const n = unreviewed(rec).length;
  if (n) out.push(`${n} flagged observation${n > 1 ? 's' : ''} not yet reviewed by a clinician`);
  return out;
}
