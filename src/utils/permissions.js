// One place that says who may see what. The backend MUST enforce the same rules:
// hiding something in the screen is not security, because the data is still sent to the browser.
export const ROLE_KEYS = ['director', 'surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance', 'hr'];
export const PERMISSIONS = {
  viewRevenue: ['director', 'finance'],     // company revenue, totals collected, outstanding and overdue amounts
  viewStaff: ['director', 'hr'],            // the staff list (the Medical Director can look, but not change)
  manageStaff: ['hr'],                      // add staff, import from the portal, invitations, password and sign-in resets
  reviewReports: ['director'],              // read, acknowledge or send back department reports
};
export const can = (role, permission) => PERMISSIONS[permission]?.includes(role) ?? false;
export const isHead = (user) => !!user?.isHead;

// Staff Administrator and Medical Director accounts can't be created or changed by the Staff Administrator.
export const PROTECTED_ROLES = ['director', 'hr'];

// Documentation of the finer rules each module applies. The modules enforce these themselves.
export const ACTIONS = [
  ['Record vitals, complaint and history', ['director', 'surgeon', 'nurse']],
  ['Write the diagnosis and complete a consultation', ['director', 'surgeon']],
  ['Record consent and clearance, mark a plan ready', ['director', 'surgeon']],
  ['Tick off the pre-op checklist', ['director', 'surgeon', 'nurse']],
  ['Schedule surgery and run the case in theatre', ['director', 'surgeon', 'nurse']],
  ['Take a request from the laboratory’s queue and do the lab work (laboratory department staff only)', ['surgeon', 'nurse']],
  ['Ask the laboratory for tests (the Medical Director and the departments that work with it)', ['director', 'surgeon', 'nurse']],
  ['Sign off lab results (not your own work) or cancel a lab request', ['director', 'surgeon']],
  ['Write prescriptions (a pharmacist’s prescription is sent to a surgeon or nurse)', ['director', 'surgeon', 'pharmacist']],
  ['Reply to a prescription sent to you: approve, record an action taken, send back or decline', ['surgeon', 'nurse']],
  ['Assign tasks to people in their own department (department heads only)', ['surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance']],
  ['Ask another department for something (the departments that work together). The Medical Director sees all tasks, can ask any department, and can assign a task to a department head (never to people inside a department).', ['director', 'surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance']],
  ['Dispense medicines and manage stock', ['director', 'nurse', 'pharmacist']],
  ['Approve quotation discounts above the limit', ['director']],
  ['Void an unpaid invoice', ['director', 'finance']],
  ['Write and submit a department report (department heads only)', ['surgeon', 'nurse', 'pharmacist', 'frontdesk', 'finance']],
  ['Read, acknowledge or send back department reports', ['director']],
  ['Add staff, import from the portal, send invitations, reset sign-in', ['hr']],
];
