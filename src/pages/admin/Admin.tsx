import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../../lib/supabase';
import type { Agency, Destination } from '../../lib/types';
import { kzt, fmtDate } from '../../lib/format';
import { Spinner, Empty, ErrorBox, PageHeader, StatusBadge, Confirm, Modal, Field, Pager } from '../../components/ui';
import { useToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth';

export function AdminShell() {
  const { t } = useTranslation();
  const items = [['/admin', 'ad_overview'], ['/admin/agencies', 'ad_agencies'], ['/admin/users', 'ad_users'], ['/admin/tours', 'ad_tours'], ['/admin/destinations', 'ad_destinations'], ['/admin/bookings', 'ad_bookings'], ['/admin/reviews', 'ad_reviews'], ['/admin/audit', 'ad_audit']];
  return (<div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[14rem_1fr]">
    <nav className="card flex gap-1 overflow-x-auto p-2 lg:h-fit lg:flex-col" aria-label="Admin">{items.map(([to, k]) => <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `whitespace-nowrap rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-forest text-cream' : 'hover:bg-sand'}`}>{t(k)}</NavLink>)}</nav>
    <div className="min-w-0"><Outlet /></div></div>);
}
const Table = ({ head, children }: { head: string[]; children: ReactNode }) => { const { t } = useTranslation(); return <div className="card overflow-x-auto"><table className="w-full"><thead><tr>{head.map((h) => <th key={h} className="th">{h && t('col_' + h)}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; };
const Row = ({ children }: { children: ReactNode }) => <tr className="border-t border-sand">{children}</tr>;

export function AdminOverview() {
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: async () => {
    const c = async (tb: string, f?: (x: any) => any) => { let x = supabase.from(tb).select('id', { count: 'exact', head: true }); if (f) x = f(x); return (await x).count ?? 0; };
    const [users, ag, pend, tours, bookings, pays] = await Promise.all([c('profiles'), c('agencies', (x) => x.eq('status', 'approved')), c('agencies', (x) => x.eq('status', 'pending')), c('tours', (x) => x.eq('status', 'published')), c('bookings'), supabase.from('demo_payments').select('amount_kzt').eq('status', 'paid_demo')]);
    return { users, ag, pend, tours, bookings, rev: (pays.data ?? []).reduce((s, p) => s + Number(p.amount_kzt), 0) }; } });
  if (q.isLoading) return <Spinner />; if (q.error) return <ErrorBox message={errMsg(q.error)} />; const s = q.data!;
  const cards: [string, string | number][] = [['ad_users', s.users], ['stat_agencies', s.ag], ['ad_pending_agencies', s.pend], ['stat_tours', s.tours], ['ad_bookings', s.bookings], ['revenue_demo', kzt(s.rev, i18n.language)]];
  return (<div><PageHeader title={t('ad_overview')} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([k, v]) => <div key={k} className="card p-4"><p className="label">{t(k)}</p><p className="font-serif text-4xl">{v}</p></div>)}</div></div>);
}
export function AdminAgencies() {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const toast = useToast(); const [ask, setAsk] = useState<{ id: string; s: string } | null>(null);
  const q = useQuery({ queryKey: ['admin-agencies'], queryFn: async () => { const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false }); if (error) throw error; return data as Agency[]; } });
  async function set(id: string, s: string) { const { error } = await supabase.rpc('set_agency_status', { p_agency_id: id, p_status: s }); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); qc.invalidateQueries({ queryKey: ['admin-agencies'] }); } }
  return (<div><PageHeader title={t('ad_agencies')} />{q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !q.data?.length ? <Empty title={t('empty')} /> :
    <Table head={['agency', 'email', 'created', 'status', '']}>{q.data.map((a) => <Row key={a.id}><td className="td"><b>{a.name}</b><br /><span className="text-xs text-mute">{a.description.slice(0, 80)}</span></td><td className="td">{a.contact_email}</td><td className="td">{fmtDate(a.created_at, i18n.language)}</td><td className="td"><StatusBadge s={a.status} /></td>
      <td className="td"><div className="flex flex-wrap gap-1">{a.status !== 'approved' && <button className="btn btn-forest !px-3 !py-1" onClick={() => set(a.id, 'approved')}>{t('approve')}</button>}{a.status === 'pending' && <button className="btn btn-danger !px-3 !py-1" onClick={() => setAsk({ id: a.id, s: 'rejected' })}>{t('reject')}</button>}{a.status === 'approved' && <button className="btn btn-danger !px-3 !py-1" onClick={() => setAsk({ id: a.id, s: 'suspended' })}>{t('suspend')}</button>}</div></td></Row>)}</Table>}
    <Confirm open={!!ask} title={t('confirm')} text={t('agency_action_text')} onNo={() => setAsk(null)} onYes={() => { set(ask!.id, ask!.s); setAsk(null); }} /></div>);
}
export function AdminUsers() {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const toast = useToast(); const { session } = useAuth();
  const q = useQuery({ queryKey: ['admin-users'], queryFn: async () => { const { data, error } = await supabase.rpc('admin_list_users'); if (error) throw error; return data as { user_id: string; email: string; full_name: string; role: string; is_suspended: boolean; created_at: string }[]; } });
  async function toggle(id: string, s: boolean) { const { error } = await supabase.rpc('admin_set_user_suspended', { p_user: id, p_suspended: s }); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); qc.invalidateQueries({ queryKey: ['admin-users'] }); } }
  return (<div><PageHeader title={t('ad_users')} />{q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> :
    <Table head={['customer', 'email', 'role', 'created', 'status', '']}>{q.data!.map((u) => <Row key={u.user_id}><td className="td">{u.full_name}</td><td className="td">{u.email}</td><td className="td">{t('role_' + u.role)}</td><td className="td">{fmtDate(u.created_at, i18n.language)}</td><td className="td">{u.is_suspended ? <StatusBadge s="suspended" /> : <StatusBadge s="approved" />}</td>
      <td className="td">{u.role !== 'admin' && u.user_id !== session?.user.id && <button className="btn btn-ghost !px-3 !py-1" onClick={() => toggle(u.user_id, !u.is_suspended)}>{u.is_suspended ? t('restore') : t('suspend')}</button>}</td></Row>)}</Table>}</div>);
}
export function AdminTours() {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const toast = useToast(); const [page, setPage] = useState(0); const PS = 20;
  const q = useQuery({ queryKey: ['admin-tours', page], queryFn: async () => { const { data, error } = await supabase.from('tours').select('id,title,status,price_kzt,agencies(name),destinations(city)').order('created_at', { ascending: false }).range(page * PS, page * PS + PS); if (error) throw error; return data as unknown as { id: string; title: string; status: string; price_kzt: number; agencies: { name: string }; destinations: { city: string } }[]; } });
  async function set(id: string, status: string) { const { error } = await supabase.from('tours').update({ status }).eq('id', id); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); qc.invalidateQueries({ queryKey: ['admin-tours'] }); } }
  return (<div><PageHeader title={t('ad_tours')} />{q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : <><Table head={['tour', 'agency', 'destination', 'price', 'status', '']}>{q.data!.slice(0, PS).map((r) => <Row key={r.id}><td className="td">{r.title}</td><td className="td">{r.agencies.name}</td><td className="td">{r.destinations.city}</td><td className="td">{kzt(r.price_kzt, i18n.language)}</td><td className="td"><StatusBadge s={r.status} /></td>
    <td className="td"><div className="flex gap-1"><Link className="btn btn-ghost !px-3 !py-1" to={`/admin/tours/${r.id}/edit`}><Pencil className="h-3.5 w-3.5" />{t('edit')}</Link>{r.status !== 'published' && <button className="btn btn-forest !px-3 !py-1" onClick={() => set(r.id, 'published')}>{t('publish')}</button>}{r.status === 'published' && <button className="btn btn-ghost !px-3 !py-1" onClick={() => set(r.id, 'draft')}>{t('unpublish')}</button>}{r.status !== 'archived' && <button className="btn btn-danger !px-3 !py-1" onClick={() => set(r.id, 'archived')}>{t('archive')}</button>}</div></td></Row>)}</Table><Pager page={page} setPage={setPage} hasNext={(q.data?.length ?? 0) > PS} /></>}</div>);
}
const blankD = { country: '', city: '', region: '', latitude: '', longitude: '' };
export function AdminDestinations() {
  const { t } = useTranslation(); const qc = useQueryClient(); const toast = useToast(); const [edit, setEdit] = useState<(typeof blankD & { id?: string }) | null>(null); const [del, setDel] = useState<string | null>(null); const [err, setErr] = useState('');
  const q = useQuery({ queryKey: ['dests'], queryFn: async () => { const { data, error } = await supabase.from('destinations').select('*').order('country').order('city'); if (error) throw error; return data as Destination[]; } });
  async function save(e: React.FormEvent) { e.preventDefault(); const d = edit!; const lat = d.latitude === '' ? null : +d.latitude, lng = d.longitude === '' ? null : +d.longitude;
    if (d.country.trim().length < 2 || d.city.trim().length < 2) return setErr(t('v_name')); if ((lat != null && (lat < -90 || lat > 90)) || (lng != null && (lng < -180 || lng > 180))) return setErr(t('v_lat'));
    const row = { country: d.country.trim(), city: d.city.trim(), region: d.region.trim(), latitude: lat, longitude: lng }; const { error } = d.id ? await supabase.from('destinations').update(row).eq('id', d.id) : await supabase.from('destinations').insert(row);
    if (error) return setErr(errMsg(error)); setEdit(null); setErr(''); toast.ok(t('saved')); qc.invalidateQueries({ queryKey: ['dests'] }); }
  async function remove() { const id = del!; setDel(null); const { error } = await supabase.from('destinations').delete().eq('id', id); if (error) toast.err(error.code === '23503' ? t('delete_blocked_dest') : errMsg(error)); else { toast.ok(t('deleted')); qc.invalidateQueries({ queryKey: ['dests'] }); } }
  const f = (k: keyof typeof blankD) => <input className="input" value={edit?.[k] ?? ''} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })} />;
  return (<div><PageHeader title={t('ad_destinations')} right={<button className="btn btn-primary" onClick={() => { setErr(''); setEdit({ ...blankD }); }}><Plus className="h-4 w-4" />{t('add')}</button>} />
    {q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : <Table head={['country', 'city', 'region', 'coords', '']}>{q.data!.map((d) => <Row key={d.id}><td className="td">{d.country}</td><td className="td">{d.city}</td><td className="td">{d.region}</td><td className="td text-xs">{d.latitude}, {d.longitude}</td><td className="td"><div className="flex gap-1"><button aria-label={t('edit')} className="btn btn-ghost !px-2 !py-1" onClick={() => { setErr(''); setEdit({ id: d.id, country: d.country, city: d.city, region: d.region, latitude: String(d.latitude ?? ''), longitude: String(d.longitude ?? '') }); }}><Pencil className="h-3.5 w-3.5" /></button><button aria-label={t('delete')} className="btn btn-danger !px-2 !py-1" onClick={() => setDel(d.id)}><Trash2 className="h-3.5 w-3.5" /></button></div></td></Row>)}</Table>}
    <Modal open={!!edit} onClose={() => setEdit(null)} title={t('ad_destinations')}><form onSubmit={save} className="space-y-3"><Field label={t('country')}>{f('country')}</Field><Field label={t('city')}>{f('city')}</Field><Field label={t('region')}>{f('region')}</Field><div className="grid grid-cols-2 gap-2"><Field label={t('latitude')}>{f('latitude')}</Field><Field label={t('longitude')}>{f('longitude')}</Field></div>{err && <p className="text-sm text-terra" role="alert">{err}</p>}<button className="btn btn-primary w-full">{t('save')}</button></form></Modal>
    <Confirm open={!!del} title={t('delete')} text={t('delete_dest_text')} onYes={remove} onNo={() => setDel(null)} /></div>);
}
export function AdminBookings() {
  const { t, i18n } = useTranslation(); const [page, setPage] = useState(0); const PS = 20;
  const q = useQuery({ queryKey: ['admin-bookings', page], queryFn: async () => { const { data, error } = await supabase.from('bookings').select('id,status,total_kzt,participants_count,created_at,tour_dates(start_date,tours(title,agencies(name))),demo_payments(status)').order('created_at', { ascending: false }).range(page * PS, page * PS + PS); if (error) throw error; return data as any[]; } });
  return (<div><PageHeader title={t('ad_bookings')} />{q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !q.data?.length ? <Empty title={t('empty_bookings')} /> : <><Table head={['ref', 'tour', 'agency', 'date', 'pax', 'total', 'status', 'payment']}>{q.data.slice(0, PS).map((b) => { const p = Array.isArray(b.demo_payments) ? b.demo_payments[0] : b.demo_payments; return <Row key={b.id}><td className="td font-mono text-xs">{b.id.slice(0, 8)}</td><td className="td">{b.tour_dates.tours.title}</td><td className="td">{b.tour_dates.tours.agencies.name}</td><td className="td">{fmtDate(b.tour_dates.start_date, i18n.language)}</td><td className="td">{b.participants_count}</td><td className="td">{kzt(b.total_kzt, i18n.language)}</td><td className="td"><StatusBadge s={b.status} /></td><td className="td">{p && <StatusBadge s={p.status} />}</td></Row>; })}</Table><Pager page={page} setPage={setPage} hasNext={q.data.length > PS} /></>}</div>);
}
export function AdminReviews() {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const toast = useToast();
  const q = useQuery({ queryKey: ['admin-reviews'], queryFn: async () => { const { data, error } = await supabase.from('reviews').select('id,rating,comment,is_visible,created_at,tours(title)').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as unknown as { id: string; rating: number; comment: string; is_visible: boolean; created_at: string; tours: { title: string } }[]; } });
  async function vis(id: string, v: boolean) { const { error } = await supabase.from('reviews').update({ is_visible: v }).eq('id', id); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); qc.invalidateQueries({ queryKey: ['admin-reviews'] }); } }
  return (<div><PageHeader title={t('ad_reviews')} />{q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !q.data?.length ? <Empty title={t('empty')} /> :
    <Table head={['tour', 'rating', 'comment', 'created', 'status', '']}>{q.data.map((r) => <Row key={r.id}><td className="td">{r.tours.title}</td><td className="td">{r.rating}★</td><td className="td max-w-xs whitespace-pre-line break-words">{r.comment}</td><td className="td">{fmtDate(r.created_at, i18n.language)}</td><td className="td"><StatusBadge s={r.is_visible ? 'published' : 'archived'} /></td><td className="td"><button className="btn btn-ghost !px-3 !py-1" onClick={() => vis(r.id, !r.is_visible)}>{r.is_visible ? t('hide') : t('show')}</button></td></Row>)}</Table>}</div>);
}
export function AdminAudit() {
  const { t, i18n } = useTranslation(); const [page, setPage] = useState(0); const PS = 30;
  const q = useQuery({ queryKey: ['audit', page], queryFn: async () => { const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).range(page * PS, page * PS + PS); if (error) throw error; return data as { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; details: unknown; created_at: string }[]; } });
  return (<div><PageHeader title={t('ad_audit')} />{q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !q.data?.length ? <Empty title={t('empty')} /> : <><Table head={['time', 'actor', 'action', 'entity', 'details']}>{q.data.slice(0, PS).map((l) => <Row key={l.id}><td className="td whitespace-nowrap">{new Date(l.created_at).toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-GB')}</td><td className="td font-mono text-xs">{l.actor_id?.slice(0, 8) ?? 'system'}</td><td className="td">{l.action}</td><td className="td text-xs">{l.entity_type} {l.entity_id?.slice(0, 8)}</td><td className="td max-w-xs truncate text-xs">{JSON.stringify(l.details)}</td></Row>)}</Table><Pager page={page} setPage={setPage} hasNext={q.data.length > PS} /></>}</div>);
}
