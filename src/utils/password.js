export const MIN_LENGTH = 8;
// Placeholder list. The backend should check against a large breached-password list.
const COMMON = ['password', 'password1', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyuiop', 'qwerty123', 'letmein', 'welcome', 'welcome1', 'admin', 'admin123', 'iloveyou', 'changeme', 'regal', 'regalhms', 'hospital', 'nurse', 'doctor'];

export const isCommon = (pw) => COMMON.includes(pw.toLowerCase().replace(/[0-9!@#$%^&*._-]+$/, '')) || COMMON.includes(pw.toLowerCase());

// Two rules only. Length matters more than odd symbols, and a blocked list of easy passwords does the rest.
export const passwordRules = (pw) => [
  { key: 'length', label: `At least ${MIN_LENGTH} characters`, ok: pw.length >= MIN_LENGTH, message: `Use at least ${MIN_LENGTH} characters.` },
  { key: 'common', label: 'Not an easy-to-guess password', ok: pw.length > 0 && !isCommon(pw), message: 'That password is too common. Add a few more words or numbers.' },
];
export const passwordProblems = (pw) => passwordRules(pw).filter((r) => !r.ok).map((r) => r.message);
export const strength = (pw) => (passwordProblems(pw).length ? 'Weak' : pw.length >= 12 ? 'Strong' : 'Okay');
