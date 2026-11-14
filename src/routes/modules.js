import { LayoutDashboard, Users, CalendarDays, Stethoscope, ClipboardCheck, Scissors,
  HeartPulse, Receipt, Pill, FlaskConical, UserCog, MessageSquare, ListChecks } from 'lucide-react';

// priority: P0 = first usable version, P1 = next stage
// roles: who sees this module in the sidebar (design-testing role switcher)
export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, priority: 'P0', group: 'Overview',
    roles: ['director', 'surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance', 'hr'] },
  { id: 'messages', label: 'Messages', path: '/messages', icon: MessageSquare, priority: 'P1', group: 'Overview',
    roles: ['director', 'surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance', 'hr'], blurb: 'Messages between staff and departments.' },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: ListChecks, priority: 'P1', group: 'Overview',
    roles: ['director', 'surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance'], blurb: 'Work given by department heads, and requests between departments.' },
  { id: 'patients', label: 'Patients', path: '/patients', icon: Users, priority: 'P0', group: 'Clinical',
    roles: ['director', 'surgeon', 'nurse', 'frontdesk'], blurb: 'Registration, profiles and medical history.' },
  { id: 'appointments', label: 'Appointments', path: '/appointments', icon: CalendarDays, priority: 'P0', group: 'Clinical',
    roles: ['director', 'surgeon', 'nurse', 'frontdesk'], blurb: 'Booking, calendar and scheduling.' },
  { id: 'consultations', label: 'Consultations', path: '/consultations', icon: Stethoscope, priority: 'P0', group: 'Clinical',
    roles: ['director', 'surgeon', 'nurse'], blurb: 'Assessment, diagnosis and surgeon notes.' },
  { id: 'planning', label: 'Surgical Planning', path: '/surgical-planning', icon: ClipboardCheck, priority: 'P0', group: 'Surgical',
    roles: ['director', 'surgeon', 'nurse'], blurb: 'Pre-op checklist, consent and clearance.' },
  { id: 'surgery', label: 'Surgery & Theatre', path: '/surgery', icon: Scissors, priority: 'P0', group: 'Surgical',
    roles: ['director', 'surgeon', 'nurse'], blurb: 'Surgery schedule and theatre allocation.' },
  { id: 'aftercare', label: 'Recovery & Aftercare', path: '/aftercare', icon: HeartPulse, priority: 'P0', group: 'Surgical',
    roles: ['director', 'surgeon', 'nurse'], blurb: 'Recovery monitoring and follow-ups.' },
  { id: 'billing', label: 'Billing & Payments', path: '/billing', icon: Receipt, priority: 'P1', group: 'Operations',
    roles: ['director', 'frontdesk', 'finance'], blurb: 'Quotations, invoices and receipts.' },
  { id: 'pharmacy', label: 'Pharmacy', path: '/pharmacy', icon: Pill, priority: 'P1', group: 'Operations',
    roles: ['director', 'surgeon', 'nurse', 'pharmacist'], blurb: 'Medication and inventory.' },
  { id: 'laboratory', label: 'Laboratory', path: '/laboratory', icon: FlaskConical, priority: 'P1', group: 'Operations',
    roles: ['director', 'surgeon', 'nurse'], blurb: 'Requests and results.' },
  { id: 'staff', label: 'Staff & Reports', path: '/staff', icon: UserCog, priority: 'P1', group: 'Operations',
    roles: ['director', 'hr'], blurb: 'Staff directory, department reports and permissions.',
    // department heads can also open it, to write their own report
    allow: (u) => ['director', 'hr'].includes(u.role) || !!u.isHead },
];

export const ROLES = {
  director: 'Medical Director', surgeon: 'Surgeon', nurse: 'Nurse', pharmacist: 'Pharmacist', frontdesk: 'Front Desk', finance: 'Finance', hr: 'Staff Administrator',
};

// Which module a URL belongs to (longest path wins), so typing an address can't bypass the sidebar.
export const moduleForPath = (pathname) => [...MODULES].sort((a, b) => b.path.length - a.path.length)
  .find((m) => (m.path === '/' ? pathname === '/' : pathname === m.path || pathname.startsWith(`${m.path}/`)));

export const canOpen = (m, user) => (m.allow ? m.allow(user) : m.roles.includes(user.role));
