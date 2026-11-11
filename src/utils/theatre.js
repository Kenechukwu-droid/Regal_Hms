import { timeToMin } from './dates';
import { TURNOVER } from '../components/surgery/constants';

export const isActive = (s) => !['Cancelled', 'Postponed'].includes(s.status);
export const surgeryEnd = (s) => timeToMin(s.start) + Number(s.duration);

// Theatre needs a turnover gap either side; a surgeon simply can't be in two places at once.
export function findSurgeryConflicts(list, c) {
  const cs = timeToMin(c.start), ce = cs + Number(c.duration);
  const base = (a) => a.id !== c.id && isActive(a) && a.date === c.date;
  return {
    theatre: list.find((a) => base(a) && a.theatreId === c.theatreId && timeToMin(a.start) < ce + TURNOVER && surgeryEnd(a) + TURNOVER > cs),
    surgeon: list.find((a) => base(a) && a.surgeonId === c.surgeonId && timeToMin(a.start) < ce && surgeryEnd(a) > cs),
  };
}
