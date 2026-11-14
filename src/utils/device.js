// "Don't ask for a code on this device": the browser keeps a random token per email address.
// The real backend keeps this in an httpOnly cookie instead, so the browser code never touches it.
const KEY = 'regal.devices';
const memory = {};
const ls = typeof localStorage !== 'undefined' ? localStorage : { getItem: (k) => memory[k] ?? null, setItem: (k, v) => { memory[k] = v; } };
const read = () => { try { return JSON.parse(ls.getItem(KEY) || '{}'); } catch { return {}; } };
const norm = (email) => String(email).trim().toLowerCase();
export const deviceToken = (email) => read()[norm(email)] || '';
export const rememberDevice = (email, token) => { if (token) ls.setItem(KEY, JSON.stringify({ ...read(), [norm(email)]: token })); };
