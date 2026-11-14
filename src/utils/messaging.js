// Who may message whom. People in the same group can message each other (including others with the same role).
// The Medical Director can message, and be messaged by, everyone. To change the rules, edit MESSAGE_GROUPS.
export const MESSAGE_GROUPS = [
  ['surgeon', 'nurse', 'pharmacist', 'frontdesk'],   // the clinical team, plus the front desk (bookings and patients arriving)
  ['frontdesk', 'finance'],                          // front desk and the accounts department
  ['pharmacist', 'finance'],                         // pharmacy and the accounts department (medicine charges, stock purchases)
  ['hr'],
];
export const canMessage = (from, to) => from === 'director' || to === 'director' || MESSAGE_GROUPS.some((g) => g.includes(from) && g.includes(to));
export const MAX_SUBJECT = 120;
export const MAX_BODY = 2000;
export const messageProblem = ({ subject, body }) => {
  if (!subject.trim()) return 'Add a subject.';
  if (subject.trim().length > MAX_SUBJECT) return `Keep the subject under ${MAX_SUBJECT} characters.`;
  if (!body.trim()) return 'Write a message.';
  if (body.trim().length > MAX_BODY) return `Keep the message under ${MAX_BODY} characters.`;
  return '';
};
