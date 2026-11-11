import { timeToMin } from './dates';

// Cancelled and no-show appointments free up the slot.
export const blocks = (a) => !['Cancelled', 'No-show'].includes(a.status);
export const endMin = (a) => timeToMin(a.start) + Number(a.duration);

// First existing appointment that overlaps the candidate for the same clinician.
export function findConflict(list, c) {
  const s = timeToMin(c.start), e = s + Number(c.duration);
  return list.find((a) => a.id !== c.id && blocks(a) && a.clinicianId === c.clinicianId && a.date === c.date
    && timeToMin(a.start) < e && endMin(a) > s);
}
