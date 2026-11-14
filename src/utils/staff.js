import { PROTECTED_ROLES, ROLE_KEYS } from './permissions';
import { DEPARTMENTS } from './departments';

const NO_DEPARTMENT = ['director', 'hr'];

// `all` is the full staff list, used for unique email, one-head-per-department and "keep one Medical Director".
export function validateStaff(s, all, { imported = false } = {}) {
  const errs = [];
  if (!s.name.trim()) errs.push('Enter the name.');
  if (!ROLE_KEYS.includes(s.role)) errs.push('Choose a role.');
  if (!/^\S+@\S+\.\S+$/.test(s.email.trim())) errs.push('Enter a valid email address.');
  else if (all.some((x) => x.id !== s.id && x.email.toLowerCase() === s.email.trim().toLowerCase())) errs.push('Another staff member already uses that email.');
  if (!NO_DEPARTMENT.includes(s.role) && !DEPARTMENTS.some((d) => d.key === s.department)) errs.push('Choose a department.');
  if (s.isHead && s.status === 'Active' && all.some((x) => x.id !== s.id && x.isHead && x.status === 'Active' && x.department === s.department)) errs.push('Someone else already heads that department. Remove their head role first.');
  if (s.isHead && NO_DEPARTMENT.includes(s.role)) errs.push('Only department staff can be a department head.');
  const after = all.some((x) => x.id === s.id) ? all.map((x) => (x.id === s.id ? s : x)) : [...all, s];
  if (!after.some((x) => x.role === 'director' && x.status === 'Active')) errs.push('The centre must keep at least one active Medical Director.');
  return errs;
}

// What the Staff Administrator may not do. The server must enforce these as well.
export function protectedRoleProblem(next, before, actorId) {
  if (!before && PROTECTED_ROLES.includes(next.role)) return 'Medical Director and Staff Administrator accounts are set up by the system administrator, not here.';
  if (before && before.role !== next.role && (PROTECTED_ROLES.includes(next.role) || PROTECTED_ROLES.includes(before.role))) return 'That role can’t be changed here. Ask the system administrator.';
  if (before && PROTECTED_ROLES.includes(before.role) && before.status !== next.status) return 'Medical Director and Staff Administrator accounts can’t be turned off here.';
  if (before && before.id === actorId && before.status !== next.status) return 'You can’t turn off your own account.';
  return '';
}
