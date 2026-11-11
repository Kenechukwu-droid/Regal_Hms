export const WOUND_STATES = [
  { value: 'Clean and dry', concern: false },
  { value: 'Expected swelling or bruising', concern: false },
  { value: 'Discharge or oozing', concern: true },
  { value: 'Spreading redness', concern: true },
  { value: 'Bleeding', concern: true },
  { value: 'Wound opening', concern: true },
];

// Placeholder thresholds: replace with the centre's own escalation protocol before clinical use.
export const LIMITS = { tempHigh: 38, pulseHigh: 120, pulseLow: 50, systolicLow: 90, systolicHigh: 180, painHigh: 8 };

// Placeholder schedule: replace with the centre's own follow-up protocol. `days` counts from the day of surgery.
export const FOLLOW_UP_PLAN = [
  { key: 'day1', label: 'Day 1 wound check', days: 1, type: 'Wound review' },
  { key: 'week1', label: '1 week review', days: 7, type: 'Post-op review' },
  { key: 'week6', label: '6 week review', days: 42, type: 'Post-op review' },
  { key: 'month3', label: '3 month review', days: 90, type: 'Follow-up' },
];

export const fmtDateTime = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
