export const CLINICIANS = [
  { id: 'bello', name: 'Dr. Bello', role: 'Surgeon' },
  { id: 'amadi', name: 'Dr. Amadi', role: 'Surgeon' },
  { id: 'joy', name: 'Nurse Joy', role: 'Nurse' },
];
// Default length in minutes for each appointment type
export const TYPES = { Consultation: 45, 'Pre-op assessment': 45, 'Post-op review': 30, 'Follow-up': 30, 'Wound review': 15 };
export const STATUSES = ['Pending', 'Confirmed', 'Checked in', 'Completed', 'No-show', 'Cancelled'];
export const DURATIONS = [15, 30, 45, 60, 90, 120];
export const DAY_START = 8 * 60;   // 08:00
export const DAY_END = 18 * 60;    // 18:00
export const clinicianName = (id) => CLINICIANS.find((c) => c.id === id)?.name ?? id;
