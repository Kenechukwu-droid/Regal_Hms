// Two-step verification codes (RFC 6238, the same kind Google Authenticator and Microsoft Authenticator use).
// The real backend generates and checks these; this copy lets the prototype behave the same way.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes) {
  let bits = '', out = '';
  bytes.forEach((b) => { bits += b.toString(2).padStart(8, '0'); });
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}
export function base32Decode(str) {
  let bits = '';
  [...str.replace(/=+$/, '').toUpperCase()].forEach((c) => { bits += ALPHABET.indexOf(c).toString(2).padStart(5, '0'); });
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(out);
}
export const makeSecret = () => base32Encode(globalThis.crypto.getRandomValues(new Uint8Array(20)));

async function hotp(secret, counter) {
  const key = await globalThis.crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const buf = new DataView(new ArrayBuffer(8));
  buf.setUint32(0, Math.floor(counter / 2 ** 32)); buf.setUint32(4, counter >>> 0);
  const h = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, buf.buffer));
  const o = h[19] & 0xf;
  const n = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1_000_000;
  return String(n).padStart(6, '0');
}
export const totpAt = (secret, ms = Date.now()) => hotp(secret, Math.floor(ms / 30000));
// Accepts the code from the previous, current or next 30-second window, to allow for clock drift.
export async function verifyTotp(secret, code, ms = Date.now(), window = 1) {
  const c = String(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  for (let w = -window; w <= window; w += 1) if ((await hotp(secret, Math.floor(ms / 30000) + w)) === c) return true;
  return false;
}
export const otpauthUri = ({ secret, email, issuer = 'Regal HMS' }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
export const makeBackupCodes = (n = 8) => Array.from({ length: n }, () => {
  const hex = [...globalThis.crypto.getRandomValues(new Uint8Array(5))].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 5)}-${hex.slice(5)}`;
});
