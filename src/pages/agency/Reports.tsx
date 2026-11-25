import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useAgencyBookings } from './Bookings';
import { kzt, fmtDate, seatBadge } from '../../lib/format';
import { Spinner, ErrorBox, PageHeader, Empty, StatusBadge } from '../../components/ui';
import type { TourDate } from '../../lib/types';

export function summarize(rows: { status: string; participants_count: number; total_kzt: number; payment_status: string | null; created_at: string; tour_title: string }[]) {
  const live = rows.filter((r) => r.status !== 'cancelled');
  const byDay = new Map<string, number>(); rows.forEach((r) => byDay.set(r.created_at.slice(0, 10), (byDay.get(r.created_at.slice(0, 10)) ?? 0) + 1));
  const byTour = new Map<string, number>(); rows.filter((r) => r.payment_status === 'paid_demo' && r.status !== 'cancelled').forEach((r) => byTour.set(r.tour_title, (byTour.get(r.tour_title) ?? 0) + Number(r.total_kzt)));
  return { total: rows.length, pending: rows.filter((r) => r.status === 'pending').length, confirmed: rows.filter((r) => r.status === 'confirmed').length, seats: live.reduce((s, r) => s + r.participants_count, 0),
    revenue: rows.filter((r) => r.payment_status === 'paid_demo' && r.status !== 'cancelled').reduce((s, r) => s + Number(r.total_kzt), 0),
    daily: [...byDay.entries()].sort().map(([d, n]) => ({ d: d.slice(5), n })), tours: [...byTour.entries()].map(([name, v]) => ({ name, v })) };
}
const Stat = ({ l, v }: { l: string; v: string | number }) => <div className="card p-4"><p className="label">{l}</p><p className="font-serif text-4xl">{v}</p></div>;
export function Dashboard() {
  const { t, i18n } = useTranslation(); const { agency } = useAuth(); const b = useAgencyBookings();
  const tours = useQuery({ queryKey: ['own-tour-count'], queryFn: async () => (await supabase.from('tours').select('id', { count: 'exact', head: true }).eq('agency_id', agency!.id)).count ?? 0 });
  if (b.isLoading) return <Spinner />; if (b.error) return <ErrorBox message={errMsg(b.error)} />; const s = summarize(b.data ?? []);
  return (<div><PageHeader title={agency?.name ?? t('ag_dashboard')} sub={t('ag_dash_sub')} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat l={t('stat_tours')} v={tours.data ?? '—'} /><Stat l={t('ag_bookings')} v={s.total} /><Stat l={t('st_pending')} v={s.pending} /><Stat l={t('st_confirmed')} v={s.confirmed} /></div>
    {s.pending > 0 && <Link to="/agency/bookings" className="btn btn-primary mt-4">{t('review_pending', { count: s.pending })}</Link>}
    <h2 className="mb-2 mt-8 text-3xl">{t('recent_bookings')}</h2>{!b.data?.length ? <Empty title={t('empty_bookings')} /> : <div className="card divide-y divide-sand">{b.data.slice(0, 6).map((r) => <div key={r.booking_id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{r.customer_name} · {r.tour_title} · {fmtDate(r.start_date, i18n.language)}</span><StatusBadge s={r.status} /></div>)}</div>}</div>);
}
export function Analytics() {
  const { t, i18n } = useTranslation(); const b = useAgencyBookings();
  if (b.isLoading) return <Spinner />; if (b.error) return <ErrorBox message={errMsg(b.error)} />; const s = summarize(b.data ?? []);
  return (<div><PageHeader title={t('ag_analytics')} /><p className="mb-4 rounded-xl bg-terra/10 p-3 text-sm text-terra">{t('revenue_demo_note')}</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat l={t('ag_bookings')} v={s.total} /><Stat l={t('seats_sold')} v={s.seats} /><Stat l={t('st_confirmed')} v={s.confirmed} /><Stat l={t('revenue_demo')} v={kzt(s.revenue, i18n.language)} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card p-4"><h3 className="mb-2 text-2xl">{t('bookings_by_day')}</h3>{!s.daily.length ? <p className="text-sm text-mute">{t('no_data')}</p> : <ResponsiveContainer height={240}><LineChart data={s.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="d" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="n" stroke="#c46942" strokeWidth={2} /></LineChart></ResponsiveContainer>}</div>
      <div className="card p-4"><h3 className="mb-2 text-2xl">{t('revenue_by_tour')}</h3>{!s.tours.length ? <p className="text-sm text-mute">{t('no_data')}</p> : <ResponsiveContainer height={240}><BarChart data={s.tours}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" hide /><YAxis /><Tooltip /><Bar dataKey="v" fill="#1f3d2f" /></BarChart></ResponsiveContainer>}</div></div></div>);
}
export function Customers() {
  const { t, i18n } = useTranslation(); const b = useAgencyBookings();
  if (b.isLoading) return <Spinner />; if (b.error) return <ErrorBox message={errMsg(b.error)} />;
  const m = new Map<string, { name: string; email: string; n: number; spent: number; last: string }>();
  (b.data ?? []).filter((r) => r.status !== 'cancelled').forEach((r) => { const k = r.customer_email.toLowerCase(); const c = m.get(k) ?? { name: r.customer_name, email: r.customer_email, n: 0, spent: 0, last: r.created_at }; c.n++; c.spent += Number(r.total_kzt); if (r.created_at > c.last) c.last = r.created_at; m.set(k, c); });
  return (<div><PageHeader title={t('ag_customers')} />{!m.size ? <Empty title={t('empty_customers')} /> : <div className="card overflow-x-auto"><table className="w-full"><thead><tr>{['customer', 'email', 'bookings', 'spent', 'last'].map((h) => <th key={h} className="th">{t('col_' + h)}</th>)}</tr></thead><tbody>{[...m.values()].map((c) => <tr key={c.email} className="border-t border-sand"><td className="td">{c.name}</td><td className="td">{c.email}</td><td className="td">{c.n}</td><td className="td">{kzt(c.spent, i18n.language)}</td><td className="td">{fmtDate(c.last, i18n.language)}</td></tr>)}</tbody></table></div>}</div>);
}
export function CalendarPage() {
  const { t, i18n } = useTranslation(); const { agency } = useAuth();
  const q = useQuery({ queryKey: ['own-calendar'], queryFn: async () => {
    const { data, error } = await supabase.from('tour_dates').select('*, tours!inner(title,agency_id)').eq('tours.agency_id', agency!.id).gte('start_date', new Date().toISOString().slice(0, 10)).order('start_date'); if (error) throw error;
    return Promise.all((data as unknown as (TourDate & { tours: { title: string } })[]).map(async (d) => ({ ...d, left: Number((await supabase.rpc('available_seats', { p_date_id: d.id })).data ?? 0) }))); } });
  if (q.isLoading) return <Spinner />; if (q.error) return <ErrorBox message={errMsg(q.error)} />;
  return (<div><PageHeader title={t('ag_calendar')} />{!q.data?.length ? <Empty title={t('no_dates')} /> : <div className="card divide-y divide-sand">{q.data.map((d) => { const b = seatBadge(d.left); return <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span className="font-semibold">{fmtDate(d.start_date, i18n.language)}</span><span>{d.tours.title}</span><span>{d.capacity - d.left}/{d.capacity} {t('seats')}</span><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b === 'ok' ? 'bg-sage/40' : 'bg-terra text-white'}`}>{b === 'soldout' ? t('sold_out') : b === 'almost' ? t('almost_full') : t('seats_left_n', { count: d.left })}</span></div>; })}</div>}</div>);
}
