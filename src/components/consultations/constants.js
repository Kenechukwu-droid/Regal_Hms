// Appointment types that open a consultation record
export const CONSULT_TYPES = ['Consultation', 'Follow-up', 'Pre-op assessment', 'Post-op review'];
export const PROCEDURES = ['Rhinoplasty', 'Blepharoplasty', 'Facelift', 'Breast augmentation', 'Breast reduction', 'Abdominoplasty', 'Liposuction', 'Brazilian butt lift', 'Otoplasty', 'Scar revision', 'Other'];
export const CANDIDACY = ['Suitable', 'Suitable with conditions', 'Needs further assessment', 'Not suitable at this time'];
export const INVESTIGATIONS = ['Full blood count', 'Electrolytes, urea and creatinine', 'Blood group and genotype', 'Fasting blood glucose', 'Pregnancy test', 'ECG', 'Chest X-ray', 'Echocardiogram'];
export const NEXT_STEPS = ['Proceed to surgical planning', 'Await investigation results', 'Book follow-up consultation', 'Discharge, no surgery'];

// Must be filled before a consultation can be completed and locked
export const REQUIRED = [['chiefComplaint', 'chief complaint'], ['diagnosis', 'diagnosis'], ['candidacy', 'suitability for surgery'], ['nextStep', 'next step']];
export const BP_PATTERN = /^\d{2,3}\/\d{2,3}$/;
export const bmi = (h, w) => (Number(h) > 0 && Number(w) > 0 ? (Number(w) / ((Number(h) / 100) ** 2)).toFixed(1) : '');
export const fmtDateTime = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
