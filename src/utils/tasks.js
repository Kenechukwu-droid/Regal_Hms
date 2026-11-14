import { todayISO } from './dates';

// Two kinds of work:
//  - "assigned": the head of a department gives work to someone in their own department.
//  - "request": someone asks another department for something. It lands in that department's queue; any member can take it,
//    and the head can hand it to a particular person.
// The backend must enforce every rule below. The screens only use them to decide which buttons to show.
export const TASK_STATUSES = ['To do', 'In progress', 'Done', 'Cancelled'];
export const PRIORITIES = ['Normal', 'Urgent'];
export const MAX_TITLE = 120;
export const MAX_DETAILS = 1000;
export const isOpen = (t) => ['To do', 'In progress'].includes(t.status);
export const isOverdue = (t) => isOpen(t) && !!t.dueDate && t.dueDate < todayISO();
const uid = (u) => u.staffId ?? u.id;

// The Medical Director sees every task and may (1) send a request to any department's queue, or (2) assign a task to a department HEAD.
// The Director never assigns to anyone else inside a department: only that department's head hands the work to a person on the team.
// Who can see a task: the director sees all; people involved see their own; a department sees its queue; heads see their whole department's work.
export function canSeeTask(t, u) {
  if (u.role === 'director') return true;
  const me = uid(u);
  if (t.fromId === me || t.assigneeId === me) return true;
  if (u.department && u.department === t.toDept && (u.isHead || !t.assigneeId)) return true;
  return !!(u.isHead && u.department && u.department === t.fromDept);
}

// What this person may do to this task right now.
export function taskActions(t, u) {
  const me = uid(u); const acts = [];
  if (!isOpen(t)) { if (t.status === 'Done' && t.fromId === me) acts.push('reopen'); return acts; }
  const inTarget = !!u.department && u.department === t.toDept;
  // The Medical Director never assigns work to people inside a department: the head does that (after the Director gives the task to the head).
  const headOfTarget = inTarget && !!u.isHead && u.role !== 'director';
  if (t.assigneeId === me) { if (t.status === 'To do') acts.push('start'); acts.push('done'); }
  if (!t.assigneeId && inTarget) acts.push('claim');
  if (headOfTarget) acts.push('assign');
  if (t.fromId === me || headOfTarget) acts.push('cancel');
  return acts;
}

// mode: 'assign' (a head gives work to their team), 'request' (to a department's queue), 'head' (the Medical Director gives work to a department head)
export function validateTask({ title, details, dueDate, toDept, assigneeId, mode }) {
  if (!String(title || '').trim()) return 'Give the task a title.';
  if (title.trim().length > MAX_TITLE) return `Keep the title under ${MAX_TITLE} characters.`;
  if ((details || '').trim().length > MAX_DETAILS) return `Keep the details under ${MAX_DETAILS} characters.`;
  if (dueDate && dueDate < todayISO()) return 'The due date can’t be in the past.';
  if (!toDept) return 'Choose a department.';
  if (mode === 'assign' && !assigneeId) return 'Choose who the task is for.';
  if (mode === 'head' && !assigneeId) return 'Choose the department head.';
  return '';
}

// The person a Medical Director task is for must be the active head of the department it goes to.
export const isHeadOf = (person, dept) => !!person && !!person.isHead && person.department === dept;
