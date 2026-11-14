import { addDays, todayISO } from './dates';

export const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Every 8 hours', 'At night', 'When needed'];
export const EXPIRY_WARNING_DAYS = 90;   // placeholder: replace with the centre's own policy

export const batchState = (b, today = todayISO()) => (b.expiry < today ? 'Expired' : b.expiry <= addDays(today, EXPIRY_WARNING_DAYS) ? 'Expiring' : 'OK');
// Expired stock is never counted as available and is never dispensed.
export const usableStock = (item, today) => item.batches.filter((b) => batchState(b, today) !== 'Expired').reduce((s, b) => s + b.qty, 0);
export const expiredStock = (item, today) => item.batches.filter((b) => batchState(b, today) === 'Expired').reduce((s, b) => s + b.qty, 0);
export function stockState(item, today) {
  const u = usableStock(item, today);
  return u === 0 ? 'Out of stock' : u <= item.reorderLevel ? 'Low' : 'OK';
}
export const nearestExpiry = (item, today) => item.batches.filter((b) => b.qty > 0 && batchState(b, today) !== 'Expired').map((b) => b.expiry).sort()[0] ?? '';

// First expiry, first out. Returns the batches to take from, or null when there isn't enough in-date stock.
export function fefoPlan(item, qty, today) {
  let need = qty; const take = [];
  for (const b of [...item.batches].filter((x) => x.qty > 0 && batchState(x, today) !== 'Expired').sort((a, c) => a.expiry.localeCompare(c.expiry))) {
    const n = Math.min(b.qty, need);
    if (n > 0) { take.push({ batchNo: b.batchNo, qty: n }); need -= n; }
    if (need === 0) break;
  }
  return need === 0 ? take : null;
}

// Matches the allergen against the drug's name and class, e.g. "Penicillin" against "Penicillin antibiotic".
export function allergyConflict(item, allergies = []) {
  const hay = `${item.name} ${item.class}`.toLowerCase();
  return allergies.find((a) => a.substance && hay.includes(a.substance.toLowerCase()))?.substance ?? null;
}

export const remaining = (l) => l.qty - l.dispensedQty;
export function rxStatus(rx) {
  if (rx.cancelledAt) return 'Cancelled';
  const all = rx.lines.every((l) => remaining(l) <= 0);
  return all ? 'Dispensed' : rx.lines.some((l) => l.dispensedQty > 0) ? 'Part-dispensed' : 'Pending';
}

export function validatePrescription(rx) {
  const errs = [];
  if (!rx.patientId) errs.push('Choose a patient.');
  if (rx.lines.length === 0) errs.push('Add at least one medicine.');
  rx.lines.forEach((l, i) => {
    const n = i + 1;
    if (!l.itemId) errs.push(`Line ${n}: choose a medicine.`);
    if (!String(l.dose).trim()) errs.push(`Line ${n}: enter the dose.`);
    if (!Number.isInteger(Number(l.days)) || Number(l.days) < 1) errs.push(`Line ${n}: days must be a whole number, 1 or more.`);
    if (!Number.isInteger(Number(l.qty)) || Number(l.qty) < 1) errs.push(`Line ${n}: quantity must be a whole number, 1 or more.`);
  });
  return errs;
}

// A prescription a pharmacist sends to a surgeon or nurse gets a reply that says what action was taken.
// "blocks" means the pharmacy can't dispense it until the prescription is corrected or cancelled.
// (Older saved prescriptions may say "Received": treat that like Approved.)
export const RX_REPLIES = {
  approve: { state: 'Approved', label: 'Approve', hint: 'I have checked it. The pharmacy can dispense.', prompt: 'Note for the pharmacy (optional)', needsNote: false, blocks: false },
  act: { state: 'Action taken', label: 'Record an action taken', hint: 'I dealt with it myself, for example gave the dose or changed the plan.', prompt: 'What did you do? (required)', needsNote: true, blocks: false },
  return: { state: 'Returned', label: 'Send back for a change', hint: 'Something needs correcting before it can go ahead.', prompt: 'What needs changing? (required)', needsNote: true, blocks: true },
  decline: { state: 'Declined', label: 'Decline', hint: 'It should not go ahead for this patient.', prompt: 'Why? (required)', needsNote: true, blocks: true },
};
export const RX_REPLY_KEYS = Object.keys(RX_REPLIES);
export const rxBlocked = (rx) => !!rx.receipt && Object.values(RX_REPLIES).some((x) => x.blocks && x.state === rx.receipt.state);
