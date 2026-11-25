import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { payOf, CATEGORIES, type Booking, type CatalogTour, type Notification } from '../lib/types';
import { kzt, fmtDate } from '../lib/format';
import { searchTours, emptyFilters, useCompare, useFavorites } from '../lib/hooks';
import { recommend } from '../lib/recommend';
import { Spinner, Empty, ErrorBox, PageHeader, StatusBadge, Confirm, Field, Modal } from '../components/ui';
import { TourCard } from '../components/TourCard';
import { useToast } from '../lib/toast';

const SEL = '*, tour_dates(start_date,end_date,tour_id,tours(id,title,price_kzt,agencies(name))), demo_payments(status,processed_at,method_label,amount_kzt)';
export function MyBookings() {
  const { t, i18n } = useTranslation(); const toast = useToast(); const qc = useQueryClient(); const { session } = useAuth();
  const q = useQuery({ queryKey: ['my-bookings'], queryFn: async () => { const { data, error } = await supabase.from('bookings').select(SEL).eq('tourist_id', session!.user.id).order('created_at', { ascending: false }); if (error) throw error; return data as Booking[]; } });
  const [cancelId, setCancelId] = useState<string | null>(null); const [people, setPeople] = useState<Booking | null>(null); const [names, setNames] = useState<string[]>([]);
  async function cancel() { const id = cancelId!; setCancelId(null); const { error } = await supabase.rpc('change_booking_status', { p_booking_id: id, p_new_status: 'cancelled' }); if (error) toast.err(errMsg(error)); else { toast.ok(t('cancelled_ok')); qc.invalidateQueries({ queryKey: ['my-bookings'] }); } }
  async function openPeople(b: Booking) { const { data } = await supabase.from('booking_participants').select('full_name').eq('booking_id', b.id); const n = (data ?? []).map((x) => x.full_name as string); setNames([...n, ...Array(Math.max(0, b.participants_count - n.length)).fill('')]); setPeople(b); }
  async function savePeople() { const list = names.map((n) => n.trim()).filter(Boolean).map((full_name) => ({ full_name })); if (!list.length) return toast.err(t('v_participants'));
    const { error } = await supabase.rpc('set_booking_participants', { p_booking_id: people!.id, p_participants: list }); if (error) toast.err(errMsg(error)); else { toast.ok(t('saved')); setPeople(null); } }
  return (
    <div className="mx-auto max-w-5xl px-4 py-10"><PageHeader title={t('nav_bookings')} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !q.data?.length ? <Empty title={t('empty_bookings')} action={<Link className="btn btn-primary" to="/tours">{t('nav_tours')}</Link>} /> :
        <div className="space-y-3">{q.data.map((b) => { const p = payOf(b); const live = b.status === 'pending' || b.status === 'confirmed'; return (
          <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4"><div><Link to={`/tours/${b.tour_dates.tours.id}`} className="font-serif text-2xl hover:text-terra">{b.tour_dates.tours.title}</Link>
            <p className="text-sm text-mute">{b.tour_dates.tours.agencies.name} · {fmtDate(b.tour_dates.start_date, i18n.language)} · {t('pax_n', { count: b.participants_count })}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge s={b.status} />{p && <StatusBadge s={p.status} />}<span className="text-sm font-semibold">{kzt(b.total_kzt, i18n.language)}</span></p></div>
            <div className="flex flex-wrap gap-2">{p?.status === 'unpaid' && b.status !== 'cancelled' && <Link className="btn btn-primary" to={`/checkout/${b.id}`}>{t('pay')}</Link>}{p?.status === 'paid_demo' && <Link className="btn btn-ghost" to={`/checkout/${b.id}`}>{t('receipt')}</Link>}
              {live && <button className="btn btn-ghost" onClick={() => openPeople(b)}>{t('participants')}</button>}{live && <button className="btn btn-danger" onClick={() => setCancelId(b.id)}>{t('cancel_booking')}</button>}</div></div>); })}</div>}
      <Confirm open={!!cancelId} title={t('cancel_booking')} text={t('cancel_text')} onYes={cancel} onNo={() => setCancelId(null)} />
      <Modal open={!!people} onClose={() => setPeople(null)} title={t('participants')}><div className="space-y-2">{names.map((n, i) => <input key={i} className="input" maxLength={120} placeholder={`${t('participant')} ${i + 1}`} value={n} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />)}<button className="btn btn-primary w-full" onClick={savePeople}>{t('save')}</button></div></Modal>
    </div>
  );
}
export function Favorites() {
  const { t } = useTranslation(); const fav = useFavorites(); const toast = useToast();
  const q = useQuery({ queryKey: ['fav-tours', fav.ids], queryFn: async () => { if (!fav.ids.length) return []; const { data, error } = await supabase.from('tour_catalog').select('*').in('id', fav.ids).eq('status', 'published'); if (error) throw error; return data as CatalogTour[]; } });
  return (<div className="mx-auto max-w-7xl px-4 py-10"><PageHeader title={t('nav_favorites')} />
    {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title={t('empty_fav')} action={<Link className="btn btn-primary" to="/tours">{t('nav_tours')}</Link>} /> :
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{q.data.map((x) => <TourCard key={x.id} t={x} fav onFav={() => fav.toggle(x.id).catch((e) => toast.err(errMsg(e)))} />)}</div>}</div>);
}
export function Compare() {
  const { t, i18n } = useTranslation(); const cmp = useCompare();
  const q = useQuery({ queryKey: ['cmp', cmp.ids], queryFn: async () => { if (!cmp.ids.length) return []; const { data, error } = await supabase.from('tour_catalog').select('*').in('id', cmp.ids); if (error) throw error; return data as CatalogTour[]; } });
  const rows: [string, (x: CatalogTour) => string][] = [[t('price_per_person'), (x) => kzt(x.price_kzt, i18n.language)], [t('duration'), (x) => t('days_n', { count: x.duration_days })], [t('category'), (x) => t('cat_' + x.category)], [t('destination'), (x) => `${x.city}, ${x.country}`], [t('agency'), (x) => x.agency_name], [t('next_date'), (x) => fmtDate(x.next_date, i18n.language)], [t('seats'), (x) => String(x.seats_left)], [t('rating'), (x) => (x.avg_rating ? `${x.avg_rating} (${x.review_count})` : '—')]];
  return (<div className="mx-auto max-w-6xl px-4 py-10"><PageHeader title={t('compare')} right={cmp.ids.length > 0 && <button className="btn btn-ghost" onClick={cmp.clear}>{t('clear')}</button>} />
    {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title={t('empty_compare')} hint={t('empty_compare_hint')} action={<Link className="btn btn-primary" to="/tours">{t('nav_tours')}</Link>} /> :
      <div className="card overflow-x-auto"><table className="w-full"><thead><tr><th className="th" />{q.data.map((x) => <th key={x.id} className="px-3 py-3 text-left"><Link to={`/tours/${x.id}`} className="font-serif text-2xl hover:text-terra">{x.title}</Link><button className="mt-1 block text-xs underline" onClick={() => cmp.toggle(x.id)}>{t('remove')}</button></th>)}</tr></thead>
        <tbody>{rows.map(([l, fn]) => <tr key={l} className="border-t border-sand"><td className="th">{l}</td>{q.data!.map((x) => <td key={x.id} className="td">{fn(x)}</td>)}</tr>)}</tbody></table></div>}</div>);
}
export function Quiz() {
  const { t } = useTranslation(); const [budget, setBudget] = useState(100000); const [days, setDays] = useState(3); const [cats, setCats] = useState<string[]>([]); const [go, setGo] = useState(false);
  const all = useQuery({ queryKey: ['quiz-all'], queryFn: () => searchTours(emptyFilters, 200) });
  const res = go && all.data ? recommend(all.data, { budget, maxDays: days, categories: cats }) : null;
  return (<div className="mx-auto max-w-5xl px-4 py-10"><PageHeader title={t('nav_quiz')} sub={t('quiz_sub')} />
    <div className="card mb-8 space-y-5 p-6">
      <Field label={`${t('quiz_budget')}: ${kzt(budget)}`}><input type="range" min={10000} max={300000} step={5000} value={budget} onChange={(e) => { setBudget(+e.target.value); setGo(false); }} className="w-full accent-[#c46942]" /></Field>
      <Field label={`${t('quiz_days')}: ${days}`}><input type="range" min={1} max={7} value={days} onChange={(e) => { setDays(+e.target.value); setGo(false); }} className="w-full accent-[#c46942]" /></Field>
      <div><span className="label">{t('quiz_interests')}</span><div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button key={c} type="button" aria-pressed={cats.includes(c)} onClick={() => { setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c]); setGo(false); }} className={`rounded-full border px-4 py-1.5 text-sm ${cats.includes(c) ? 'border-terra bg-terra text-white' : 'border-sage/60'}`}>{t('cat_' + c)}</button>)}</div></div>
      <button className="btn btn-primary" disabled={all.isLoading} onClick={() => setGo(true)}>{t('quiz_go')}</button></div>
    {res && (!res.length ? <Empty title={t('quiz_none')} /> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{res.slice(0, 6).map((x) => <TourCard key={x.id} t={x} />)}</div>)}</div>);
}
export function Notifications() {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const { session } = useAuth();
  const q = useQuery({ queryKey: ['notifs'], queryFn: async () => { const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as Notification[]; } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifs'] }); qc.invalidateQueries({ queryKey: ['unread'] }); };
  const read = async (id: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', id); refresh(); };
  const readAll = async () => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', session!.user.id).eq('is_read', false); refresh(); };
  const text = (n: Notification) => { const k = 'n_' + n.title_key; return n.title_key && i18n.exists(k) ? t(k, { ...n.params, status: n.params.status ? t('st_' + n.params.status) : '' }) : n.message; };
  return (<div className="mx-auto max-w-3xl px-4 py-10"><PageHeader title={t('nav_notifications')} right={<button className="btn btn-ghost" onClick={readAll}>{t('mark_all')}</button>} />
    {q.isLoading ? <Spinner /> : !q.data?.length ? <Empty title={t('empty_notifs')} /> : <ul className="space-y-2">{q.data.map((n) => <li key={n.id} className={`card flex items-start justify-between gap-3 p-4 ${n.is_read ? 'opacity-70' : 'border-l-4 border-l-terra'}`}><div><p className="text-sm">{text(n)}</p><p className="text-xs text-mute">{fmtDate(n.created_at, i18n.language)}</p></div>{!n.is_read && <button className="text-xs underline" onClick={() => read(n.id)}>{t('mark_read')}</button>}</li>)}</ul>}</div>);
}
export function ProfilePage() {
  const { t, i18n } = useTranslation(); const { profile, session, role, agency, refresh } = useAuth(); const toast = useToast(); const [name, setName] = useState('');
  useEffect(() => setName(profile?.full_name ?? ''), [profile]);
  async function save(e: React.FormEvent) { e.preventDefault(); if (name.trim().length < 2) return toast.err(t('v_name')); const { error } = await supabase.from('profiles').update({ full_name: name.trim(), preferred_language: i18n.language === 'ru' ? 'ru' : 'en' }).eq('id', session!.user.id); if (error) toast.err(errMsg(error)); else { toast.ok(t('saved')); refresh(); } }
  return (<div className="mx-auto max-w-xl px-4 py-10"><PageHeader title={t('nav_profile')} /><form onSubmit={save} className="card space-y-4 p-6"><Field label={t('email')}><input className="input" disabled value={session?.user.email ?? ''} /></Field><Field label={t('full_name')}><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
    <p className="text-sm text-mute">{t('role')}: <b className="text-ink">{t('role_' + (role ?? 'tourist'))}</b>{agency && <> · {t('agency')}: <b className="text-ink">{agency.name}</b> <StatusBadge s={agency.status} /></>}</p><button className="btn btn-primary">{t('save')}</button></form></div>);
}
