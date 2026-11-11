import { addDays, todayISO } from './dates';
import { DISCOUNT_LIMIT_PCT, NEEDS_REFERENCE, PRICE_LIST, FIXED_LINES, QUOTE_VALID_DAYS } from '../components/billing/constants';

// All money is whole naira in the prototype. The backend should store it as an exact decimal or in kobo, never a float.
export const lineTotal = (l) => Number(l.qty) * Number(l.unitPrice);
export const quoteTotals = (q) => {
  const subtotal = q.lines.reduce((s, l) => s + (Number.isFinite(lineTotal(l)) ? lineTotal(l) : 0), 0);
  const discount = Number(q.discount) || 0;
  return { subtotal, discount, total: subtotal - discount };
};

export const newLines = (procedure) => [
  { id: 1, category: 'Surgeon fee', description: `Surgeon’s fee: ${procedure || 'procedure'}`, qty: 1, unitPrice: PRICE_LIST[procedure] ?? 0 },
  ...FIXED_LINES.map((l, i) => ({ id: i + 2, qty: 1, ...l })),
];
export const defaultValidUntil = () => addDays(todayISO(), QUOTE_VALID_DAYS);

export const discountPct = (q) => { const { subtotal, discount } = quoteTotals(q); return subtotal ? (discount / subtotal) * 100 : 0; };

// What stops a quotation being saved or sent. The backend must enforce the same rules.
export function validateQuote(q, { isDirector = false } = {}) {
  const errs = [];
  if (q.lines.length === 0) errs.push('Add at least one line.');
  q.lines.forEach((l, i) => {
    if (!l.description.trim()) errs.push(`Line ${i + 1} needs a description.`);
    if (!Number.isInteger(Number(l.qty)) || Number(l.qty) < 1) errs.push(`Line ${i + 1}: quantity must be a whole number, 1 or more.`);
    if (!Number.isInteger(Number(l.unitPrice)) || Number(l.unitPrice) < 0) errs.push(`Line ${i + 1}: price must be a whole number of naira, 0 or more.`);
  });
  const { subtotal, discount, total } = quoteTotals(q);
  if (!Number.isInteger(discount) || discount < 0) errs.push('Discount must be a whole number of naira, 0 or more.');
  else if (discount > subtotal) errs.push('Discount can’t be more than the subtotal.');
  else if (discountPct(q) > DISCOUNT_LIMIT_PCT && !isDirector) errs.push(`Discounts above ${DISCOUNT_LIMIT_PCT}% need the Medical Director.`);
  if (errs.length === 0 && total <= 0) errs.push('The total must be more than zero.');
  if (!q.validUntil) errs.push('Set how long the quotation is valid.');
  return errs;
}

// "Expired" is never stored: a sent quotation simply passes its date.
export const quoteStatus = (q, today = todayISO()) => (q.status === 'Sent' && q.validUntil < today ? 'Expired' : q.status);

export const invoiceTotal = (inv) => quoteTotals(inv).total;
export const invoicePaid = (inv) => inv.payments.reduce((s, p) => s + p.amount, 0);
export const invoiceBalance = (inv) => invoiceTotal(inv) - invoicePaid(inv);
export function invoiceStatus(inv, today = todayISO()) {
  if (inv.voidedAt) return 'Void';
  const bal = invoiceBalance(inv);
  if (bal <= 0) return 'Paid';
  if (inv.dueDate < today) return 'Overdue';
  return invoicePaid(inv) > 0 ? 'Part-paid' : 'Unpaid';
}

// What stops a payment being recorded. The backend must enforce the same rules.
export function validatePayment(inv, p) {
  const errs = [];
  const amt = Number(p.amount);
  const bal = invoiceBalance(inv);
  if (inv.voidedAt) errs.push('This invoice is void.');
  else if (bal <= 0) errs.push('This invoice is already paid in full.');
  if (!Number.isInteger(amt) || amt < 1) errs.push('Enter the amount as a whole number of naira.');
  else if (amt > bal) errs.push(`That is more than the balance of ₦${bal.toLocaleString('en-NG')}.`);
  if (!p.method) errs.push('Choose how it was paid.');
  if (NEEDS_REFERENCE.includes(p.method) && !(p.reference || '').trim()) errs.push(`Enter the ${p.method === 'POS card' ? 'POS slip' : 'transfer'} reference.`);
  return errs;
}
