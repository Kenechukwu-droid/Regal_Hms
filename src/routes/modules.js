import { LayoutDashboard, Users, CalendarDays, Stethoscope, ClipboardCheck, Scissors,
  HeartPulse, Receipt, Pill, FlaskConical, UserCog } from 'lucide-react';

// priority: P0 = first usable version, P1 = next stage
// roles: who sees this module in the sidebar (design-testing role switcher)
export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, priority: 'P0', group: 'Overview',
    roles: ['director', 'surgeon', 'nurse', 'frontdesk', 'finance'] },
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
    roles: ['director', 'nurse'], blurb: 'Medication and inventory.' },
  { id: 'laboratory', label: 'Laboratory', path: '/laboratory', icon: FlaskConical, priority: 'P1', group: 'Operations',
    roles: ['director', 'surgeon', 'nurse'], blurb: 'Requests and results.' },
  { id: 'staff', label: 'Staff & Reports', path: '/staff', icon: UserCog, priority: 'P1', group: 'Operations',
    roles: ['director', 'finance'], blurb: 'Staff directory, analytics and permissions.' },
];

export const ROLES = {
  director: 'Medical Director', surgeon: 'Surgeon', nurse: 'Nurse', frontdesk: 'Front Desk', finance: 'Finance',
};
