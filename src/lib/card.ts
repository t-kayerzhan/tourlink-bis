// CLIENT-SIDE ONLY demo card validation. Values never leave component state.
export const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
export const formatExpiry = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
export function luhn(num: string): boolean {
  const d = num.replace(/\D/g, ''); if (d.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
  return sum % 10 === 0;
}
export function validateExpiry(v: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false;
  const mm = +m[1], yy = 2000 + +m[2]; if (mm < 1 || mm > 12) return false;
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}
export const DECLINE_CARD = '4000000000000002';
export type CardError = 'name' | 'number' | 'expiry' | 'cvv' | 'declined';
export function checkCard(f: { name: string; number: string; expiry: string; cvv: string }): CardError | null {
  if (f.name.trim().length < 2) return 'name';
  if (!luhn(f.number)) return 'number';
  if (!validateExpiry(f.expiry)) return 'expiry';
  if (!/^\d{3}$/.test(f.cvv)) return 'cvv';
  if (f.number.replace(/\D/g, '') === DECLINE_CARD) return 'declined';
  return null;
}
