// Which departments work with which. One list, used by Tasks (requests between departments) and by Messages.
// Each pair is two-way: if Pharmacy can ask Theatre for something, Theatre can ask Pharmacy.
// To change who works with whom, edit DEPARTMENT_PAIRS. The backend must enforce the same list.
export const DEPARTMENT_PAIRS = [
  ['frontdesk', 'clinic'],      // bookings, patients arriving, consultation rooms
  ['frontdesk', 'theatre'],     // theatre bookings and patient arrival on the day
  ['frontdesk', 'aftercare'],   // follow-up appointments
  ['frontdesk', 'finance'],     // quotations, invoices and payments
  ['clinic', 'theatre'],        // surgical plans, theatre lists
  ['clinic', 'aftercare'],      // handover and review of recovering patients
  ['clinic', 'laboratory'],     // tests and results
  ['clinic', 'pharmacy'],       // prescriptions
  ['theatre', 'aftercare'],     // handover from theatre to recovery
  ['theatre', 'laboratory'],    // pre-op and urgent tests
  ['theatre', 'pharmacy'],      // theatre medicines and anaesthetics
  ['aftercare', 'laboratory'],  // tests for recovering patients
  ['aftercare', 'pharmacy'],    // take-home and ward medicines
  ['pharmacy', 'finance'],      // medicine charges and stock purchases
];

export const linkedDepartments = (dept) => DEPARTMENT_PAIRS.filter((p) => p.includes(dept)).map((p) => p.find((k) => k !== dept));
// The Medical Director has no department and may send a request to any department.
export const canRequestDepartment = (user, toDept) => (user.role === 'director' ? true : !!user.department && linkedDepartments(user.department).includes(toDept));
