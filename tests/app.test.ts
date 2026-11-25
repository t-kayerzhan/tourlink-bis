import { describe, it, expect } from 'vitest';
import fs from 'fs'; import path from 'path';
import { en } from '../src/i18n/en'; import { ru } from '../src/i18n/ru';
import { checkCard, luhn, formatCard, formatExpiry, validateExpiry } from '../src/lib/card';
import { toCsv, seatBadge } from '../src/lib/format';
import { recommend } from '../src/lib/recommend';
import { summarize } from '../src/pages/agency/Reports';
import type { CatalogTour } from '../src/lib/types';

const walk = (d: string): string[] => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) && !p.includes('i18n') ? [p] : []; });
const has = (dict: Record<string, string>, k: string) => ['', '_one', '_other', '_few', '_many'].some((s) => (k + s) in dict);

describe('i18n', () => {
  it('EN and RU have identical key sets', () => { const n = (o: Record<string, string>) => [...new Set(Object.keys(o).map((k) => k.replace(/_(one|few|many|other)$/, '')))].sort(); expect(n(ru)).toEqual(n(en)); });
  it('every static t(\'key\') used in source exists in EN and RU', () => {
    const missing: string[] = [];
    for (const f of walk('src')) { const s = fs.readFileSync(f, 'utf8'); for (const m of s.matchAll(/\bt\(\s*'([a-z0-9_]+)'/g)) { const k = m[1]; if (k.endsWith('_') ) continue; if (!has(en, k) || !has(ru, k)) missing.push(`${f}:${k}`); } for (const m of s.matchAll(/'((?:ag|ad|feat)_[a-z_]+)'/g)) if (!has(en, m[1]) || !has(ru, m[1])) missing.push(`${f}:${m[1]}`); }
    expect(missing).toEqual([]);
  });
  it('dynamic key families are complete', () => {
    const fam: Record<string, string[]> = { cat_: ['nature', 'adventure', 'culture', 'family', 'relaxation', 'city'], st_: ['pending', 'confirmed', 'completed', 'cancelled', 'unpaid', 'paid_demo', 'refunded_demo', 'approved', 'rejected', 'suspended', 'published', 'draft', 'archived'], role_: ['tourist', 'agency', 'admin'], apply_status_: ['pending', 'approved', 'suspended', 'rejected'], n_: ['booking_new', 'booking_status', 'booking_cancelled', 'agency_application', 'agency_status'] };
    for (const [p, v] of Object.entries(fam)) for (const x of v) { expect(en[p + x], p + x).toBeTruthy(); expect(ru[p + x], p + x).toBeTruthy(); }
    for (const c of ['ref', 'customer', 'tour', 'date', 'pax', 'total', 'status', 'payment', 'agency', 'email', 'created', 'destination', 'price', 'city', 'country', 'region', 'coords', 'rating', 'comment', 'time', 'actor', 'action', 'entity', 'details', 'bookings', 'spent', 'last', 'role']) { expect(en['col_' + c], c).toBeTruthy(); expect(ru['col_' + c], c).toBeTruthy(); }
  });
  it('RU plural forms exist for count keys', () => { for (const k of ['days_n', 'tours_n', 'pax_n', 'results_n', 'seats_left_n', 'compare_n', 'map_count', 'review_pending']) for (const s of ['_one', '_few', '_many']) expect(ru[k + s], k + s).toBeTruthy(); });
});
describe('demo payment validation (client only)', () => {
  const ok = { name: 'Test User', number: '4242 4242 4242 4242', expiry: '12/45', cvv: '123' };
  it('accepts the fictional test card', () => expect(checkCard(ok)).toBeNull());
  it('luhn rejects bad numbers', () => { expect(luhn('4242424242424242')).toBe(true); expect(luhn('4242424242424241')).toBe(false); });
  it('declines the decline test card', () => expect(checkCard({ ...ok, number: '4000 0000 0000 0002' })).toBe('declined'));
  it('validates name, expiry, cvv', () => { expect(checkCard({ ...ok, name: '' })).toBe('name'); expect(checkCard({ ...ok, expiry: '01/20' })).toBe('expiry'); expect(checkCard({ ...ok, expiry: '13/40' })).toBe('expiry'); expect(checkCard({ ...ok, cvv: '12' })).toBe('cvv'); });
  it('formats input', () => { expect(formatCard('4242424242424242')).toBe('4242 4242 4242 4242'); expect(formatExpiry('1245')).toBe('12/45'); expect(validateExpiry('06/26', new Date('2026-07-01'))).toBe(false); });
  it('Checkout source only sends booking id to simulate_payment', () => { const s = fs.readFileSync('src/pages/Checkout.tsx', 'utf8'); expect(s).toContain("rpc('simulate_payment', { p_booking_id: id })"); expect(s).not.toMatch(/localStorage|sessionStorage|console\./); });
});
describe('csv', () => {
  it('escapes quotes/commas and neutralises formulas', () => { const c = toCsv([{ a: 'x,y', b: '=HYPERLINK("e")', c: 'say "hi"' }]); expect(c).toContain('"x,y"'); expect(c).toContain("'=HYPERLINK"); expect(c).toContain('"say ""hi"""'); });
});
const tour = (o: Partial<CatalogTour>): CatalogTour => ({ id: 'x', title: 't', description: '', category: 'nature', duration_days: 2, price_kzt: 50000, status: 'published', meeting_point: null, latitude: 1, longitude: 1, created_at: '', agency_id: 'a', agency_name: 'A', destination_id: 'd', country: 'KZ', city: 'Almaty', cover_path: null, next_date: null, seats_left: 5, avg_rating: 4, review_count: 1, ...o });
describe('quiz and analytics', () => {
  it('recommend respects budget/days and prefers matching category, avoids sold out', () => {
    const r = recommend([tour({ id: 'a' }), tour({ id: 'b', category: 'city' }), tour({ id: 'c', price_kzt: 999999 }), tour({ id: 'd', seats_left: 0 })], { budget: 100000, maxDays: 3, categories: ['nature'] });
    expect(r.map((x) => x.id)).toEqual(['a', 'b']); });
  it('seat badges', () => { expect(seatBadge(0)).toBe('soldout'); expect(seatBadge(3)).toBe('almost'); expect(seatBadge(9)).toBe('ok'); });
  it('summarize counts only paid, non-cancelled demo revenue', () => {
    const rows = [{ status: 'confirmed', participants_count: 2, total_kzt: 100, payment_status: 'paid_demo', created_at: '2027-01-01T00:00:00Z', tour_title: 'A' }, { status: 'cancelled', participants_count: 3, total_kzt: 500, payment_status: 'refunded_demo', created_at: '2027-01-01T00:00:00Z', tour_title: 'A' }, { status: 'pending', participants_count: 1, total_kzt: 50, payment_status: 'unpaid', created_at: '2027-01-02T00:00:00Z', tour_title: 'B' }];
    const s = summarize(rows); expect(s.revenue).toBe(100); expect(s.seats).toBe(3); expect(s.pending).toBe(1); expect(s.confirmed).toBe(1); expect(s.total).toBe(3); });
});
