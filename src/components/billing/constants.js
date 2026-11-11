export const CATEGORIES = ['Surgeon fee', 'Theatre', 'Anaesthesia', 'Implants and consumables', 'Medication', 'Aftercare', 'Consultation', 'Other'];
export const METHODS = ['Cash', 'Bank transfer', 'POS card'];
export const NEEDS_REFERENCE = ['Bank transfer', 'POS card'];

// Placeholders: replace with the centre's own rules and price list.
export const DISCOUNT_LIMIT_PCT = 10;   // larger discounts need the Medical Director
export const QUOTE_VALID_DAYS = 30;
export const INVOICE_DUE_DAYS = 14;

// Placeholder prices in whole naira, used only to pre-fill a new quotation. Staff edit every line.
export const PRICE_LIST = {
  Rhinoplasty: 1800000, Abdominoplasty: 2400000, Blepharoplasty: 900000, 'Breast augmentation': 2600000, Facelift: 3200000, Liposuction: 1500000,
};
export const FIXED_LINES = [
  { category: 'Theatre', description: 'Theatre and nursing fee', unitPrice: 350000 },
  { category: 'Anaesthesia', description: 'Anaesthesia', unitPrice: 250000 },
  { category: 'Aftercare', description: 'Aftercare package (reviews and dressings)', unitPrice: 120000 },
];

export const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
