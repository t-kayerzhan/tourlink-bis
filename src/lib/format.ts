export const kzt = (n: number | string | null | undefined, lng = 'en') =>
  new Intl.NumberFormat(lng === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 }).format(Number(n ?? 0)) + ' ₸';
export const fmtDate = (d: string | null | undefined, lng = 'en') =>
  d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(lng === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV formula-injection guard
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
export function downloadText(name: string, text: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + text], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export const seatBadge = (left: number): 'soldout' | 'almost' | 'ok' => (left <= 0 ? 'soldout' : left <= 4 ? 'almost' : 'ok');
