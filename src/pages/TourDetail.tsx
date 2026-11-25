import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, Star, ChevronDown, Check, X as XIcon, Users, ShieldCheck, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../lib/supabase';
import type { CatalogTour, TourDate, Step, TourImage } from '../lib/types';
import { kzt, fmtDate, seatBadge } from '../lib/format';
import { Photo } from '../components/Photo';
import { MiniMap } from '../components/MiniMap';
import { Spinner, ErrorBox, Empty, StatusBadge, Field } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useFavorites } from '../lib/hooks';
import { useToast } from '../lib/toast';
import { AssistantWidget } from '../components/Assistant';

interface Review { id: string; rating: number; comment: string; created_at: string; user_id: string }

export default function TourDetail() {
  const { id = '' } = useParams(); const { t, i18n } = useTranslation(); const nav = useNavigate(); const toast = useToast(); const qc = useQueryClient();
  const { session, role, agency } = useAuth(); const fav = useFavorites();
  const [img, setImg] = useState(0); const [dateId, setDateId] = useState(''); const [pax, setPax] = useState(1); const [promo, setPromo] = useState(''); const [busy, setBusy] = useState(false); const [openDay, setOpenDay] = useState<number | null>(1);
  const tour = useQuery({ queryKey: ['tour', id], queryFn: async () => (await supabase.from('tour_catalog').select('*').eq('id', id).maybeSingle()).data as (CatalogTour & { included?: string }) | null });
  const extra = useQuery({ queryKey: ['tour-extra', id], queryFn: async () => (await supabase.from('tours').select('included,excluded').eq('id', id).maybeSingle()).data as { included: string; excluded: string } | null });
  const images = useQuery({ queryKey: ['tour-images', id], queryFn: async () => (await supabase.from('tour_images').select('*').eq('tour_id', id).order('position')).data as TourImage[] });
  const steps = useQuery({ queryKey: ['tour-steps', id], queryFn: async () => (await supabase.from('itinerary_steps').select('*').eq('tour_id', id).order('day_number').order('step_order')).data as Step[] });
  const dates = useQuery({ queryKey: ['tour-dates', id], queryFn: async () => {
    const { data, error } = await supabase.from('tour_dates').select('*').eq('tour_id', id).eq('active', true).gte('start_date', new Date().toISOString().slice(0, 10)).order('start_date'); if (error) throw error;
    return Promise.all((data as TourDate[]).map(async (d) => ({ ...d, left: Number((await supabase.rpc('available_seats', { p_date_id: d.id })).data ?? 0) }))); } });
  const reviews = useQuery({ queryKey: ['reviews', id], queryFn: async () => (await supabase.from('reviews').select('id,rating,comment,created_at,user_id').eq('tour_id', id).eq('is_visible', true).order('created_at', { ascending: false })).data as Review[] });
  const days = useMemo(() => { const m = new Map<number, Step[]>(); steps.data?.forEach((s) => m.set(s.day_number, [...(m.get(s.day_number) ?? []), s])); return [...m.entries()]; }, [steps.data]);
  const selected = dates.data?.find((d) => d.id === dateId);
  const isOwn = !!agency && tour.data?.agency_id === agency.id;
  const total = (tour.data?.price_kzt ?? 0) * pax;

  async function book() {
    if (!session) { nav('/login', { state: { from: `/tours/${id}` } }); return; }
    if (!selected) { toast.err(t('pick_date')); return; }
    if (busy) return; setBusy(true);
    const { data, error } = await supabase.rpc('create_booking', { p_date_id: selected.id, p_participants: pax, p_promo_code: promo.trim() || null });
    setBusy(false);
    if (error) { toast.err(errMsg(error)); qc.invalidateQueries({ queryKey: ['tour-dates', id] }); return; }
    toast.ok(t('booking_created')); nav(`/checkout/${data as string}`);
  }
  async function toggleFav() { if (!session) { nav('/login', { state: { from: `/tours/${id}` } }); return; } try { await fav.toggle(id); } catch (e) { toast.err(errMsg(e)); } }
  const [rate, setRate] = useState(5); const [comment, setComment] = useState('');
  async function review(e: React.FormEvent) {
    e.preventDefault(); if (comment.length > 2000) return;
    const { error } = await supabase.from('reviews').insert({ user_id: session!.user.id, tour_id: id, rating: rate, comment: comment.trim() });
    if (error) { toast.err(error.code === '23505' ? t('review_dup') : error.code === '42501' ? t('review_not_eligible') : errMsg(error)); return; }
    setComment(''); toast.ok(t('review_added')); qc.invalidateQueries({ queryKey: ['reviews', id] }); qc.invalidateQueries({ queryKey: ['tour', id] });
  }

  if (tour.isLoading) return <Spinner />;
  if (tour.error) return <ErrorBox message={errMsg(tour.error)} />;
  if (!tour.data) return <div className="mx-auto max-w-3xl px-4 py-16"><Empty title={t('tour_nf')} action={<Link className="btn btn-primary" to="/tours">{t('nav_tours')}</Link>} /></div>;
  const tr = tour.data; const imgs = images.data ?? []; const cur = imgs[img];
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div>
        <p className="flex items-center gap-1 text-sm text-mute"><MapPin className="h-4 w-4" />{tr.city}, {tr.country} · <span className="chip">{t('cat_' + tr.category)}</span></p>
        <h1 className="mt-1 text-4xl md:text-6xl">{tr.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm"><Link to={`/agencies/${tr.agency_id}`} className="flex items-center gap-1 hover:underline"><ShieldCheck className="h-4 w-4 text-sage" />{tr.agency_name} <span className="chip">{t('verified')}</span></Link>
          {tr.avg_rating ? <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-terra text-terra" />{tr.avg_rating} ({tr.review_count})</span> : <span className="text-mute">{t('no_reviews')}</span>}</p></div>
        <button className="btn btn-ghost" onClick={toggleFav}><Heart className={`h-4 w-4 ${fav.ids.includes(id) ? 'fill-terra text-terra' : ''}`} />{t('favorite')}</button></div>
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-10">
          <div>
            <div className="overflow-hidden rounded-3xl"><Photo path={cur?.storage_path} category={tr.category} alt={cur?.alt_text || tr.title} className="h-72 w-full md:h-[28rem]" /></div>
            {imgs.length > 1 && <div className="mt-2 flex gap-2 overflow-x-auto">{imgs.map((im, i) => <button key={im.id} onClick={() => setImg(i)} aria-label={`${i + 1}`} className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 ${i === img ? 'border-terra' : 'border-transparent'}`}><Photo path={im.storage_path} alt={im.alt_text || ''} className="h-full w-full" /></button>)}</div>}
            {!imgs.length && <p className="mt-2 text-xs text-mute">{t('placeholder_note')}</p>}
          </div>
          <section><h2 className="mb-2 text-3xl">{t('overview')}</h2><p className="whitespace-pre-line text-mute">{tr.description || '—'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3"><div className="card p-3"><dt className="label">{t('duration')}</dt><dd>{t('days_n', { count: tr.duration_days })}</dd></div><div className="card p-3"><dt className="label">{t('meeting_point')}</dt><dd>{tr.meeting_point || '—'}</dd></div><div className="card p-3"><dt className="label">{t('price_per_person')}</dt><dd>{kzt(tr.price_kzt, i18n.language)}</dd></div></dl></section>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="card p-4"><h3 className="mb-2 flex items-center gap-2 text-2xl"><Check className="h-5 w-5 text-sage" />{t('included')}</h3><p className="whitespace-pre-line text-sm text-mute">{extra.data?.included || '—'}</p></div>
            <div className="card p-4"><h3 className="mb-2 flex items-center gap-2 text-2xl"><XIcon className="h-5 w-5 text-terra" />{t('excluded')}</h3><p className="whitespace-pre-line text-sm text-mute">{extra.data?.excluded || '—'}</p></div>
          </section>
          <section><h2 className="mb-3 text-3xl">{t('itinerary')}</h2>
            {!days.length ? <p className="text-mute">{t('no_itinerary')}</p> : <div className="space-y-2">{days.map(([d, ss]) => (
              <div key={d} className="card overflow-hidden"><button className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={openDay === d} onClick={() => setOpenDay(openDay === d ? null : d)}><span className="font-serif text-2xl">{t('day_n', { n: d })}</span><ChevronDown className={`h-5 w-5 transition ${openDay === d ? 'rotate-180' : ''}`} /></button>
                {openDay === d && <ol className="space-y-3 border-t border-sand px-4 py-3">{ss.map((s) => <li key={s.id} className="flex gap-3"><span className="w-14 shrink-0 text-sm font-semibold text-terra">{s.start_time?.slice(0, 5) ?? '•'}</span><div><p className="font-medium">{s.title}</p>{s.details && <p className="text-sm text-mute">{s.details}</p>}</div></li>)}</ol>}</div>))}</div>}
          </section>
          {tr.latitude != null && tr.longitude != null && <section><h2 className="mb-3 text-3xl">{t('location')}</h2><div className="overflow-hidden rounded-2xl"><MiniMap lat={Number(tr.latitude)} lng={Number(tr.longitude)} /></div></section>}
          <section><h2 className="mb-3 text-3xl">{t('reviews')}</h2>
            {!reviews.data?.length ? <p className="text-mute">{t('no_reviews')}</p> : <ul className="space-y-3">{reviews.data.map((r) => <li key={r.id} className="card p-4"><p className="flex items-center gap-1 text-sm">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-terra text-terra" />)} <span className="ml-2 text-mute">{fmtDate(r.created_at, i18n.language)} · {t('verified_traveler')}</span></p>{r.comment && <p className="mt-1 whitespace-pre-line text-sm">{r.comment}</p>}</li>)}</ul>}
            {session && role === 'tourist' && <form onSubmit={review} className="card mt-4 space-y-3 p-4"><h3 className="text-2xl">{t('write_review')}</h3>
              <Field label={t('rating')}><select className="input" value={rate} onChange={(e) => setRate(+e.target.value)}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></Field>
              <Field label={t('comment')}><textarea className="input" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} /></Field><button className="btn btn-forest">{t('submit')}</button><p className="text-xs text-mute">{t('review_rule')}</p></form>}
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card space-y-4 p-5">
            <p className="font-serif text-4xl text-terra">{kzt(tr.price_kzt, i18n.language)} <span className="text-base text-mute">/ {t('person')}</span></p>
            <Field label={t('select_date')}>
              {dates.isLoading ? <Spinner /> : !dates.data?.length ? <p className="text-sm text-mute">{t('no_dates')}</p> :
                <div className="space-y-2">{dates.data.map((d) => { const b = seatBadge(d.left); return (
                  <button key={d.id} disabled={d.left <= 0} onClick={() => { setDateId(d.id); setPax((p) => Math.min(p, Math.max(1, d.left))); }} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${dateId === d.id ? 'border-terra bg-terra/10' : 'border-sage/50 hover:bg-sand'} disabled:opacity-50`}>
                    <span>{fmtDate(d.start_date, i18n.language)}{d.end_date !== d.start_date && ` – ${fmtDate(d.end_date, i18n.language)}`}</span>
                    <span className={`text-xs font-semibold ${b === 'ok' ? 'text-forest dark:text-sage' : 'text-terra'}`}>{b === 'soldout' ? t('sold_out') : b === 'almost' ? t('seats_left_n', { count: d.left }) + ' · ' + t('almost_full') : t('seats_left_n', { count: d.left })}</span></button>); })}</div>}
            </Field>
            <Field label={t('participants')}><div className="flex items-center gap-3"><button type="button" className="btn btn-ghost !p-2" onClick={() => setPax(Math.max(1, pax - 1))} aria-label="-"><Minus className="h-4 w-4" /></button><span className="flex w-12 items-center justify-center gap-1 text-lg font-semibold"><Users className="h-4 w-4" />{pax}</span><button type="button" className="btn btn-ghost !p-2" onClick={() => setPax(Math.min(selected ? selected.left : 30, 30, pax + 1))} aria-label="+"><Plus className="h-4 w-4" /></button></div>{pax > 1 && <p className="mt-1 text-xs text-mute">{t('group_booking')}</p>}</Field>
            <Field label={t('promo')}><input className="input" value={promo} maxLength={32} onChange={(e) => setPromo(e.target.value)} placeholder="SAVE10" /></Field>
            <div className="space-y-1 border-t border-sand pt-3 text-sm"><div className="flex justify-between"><span>{kzt(tr.price_kzt, i18n.language)} × {pax}</span><span>{kzt(total, i18n.language)}</span></div>{promo.trim() && <p className="text-xs text-mute">{t('promo_note')}</p>}<div className="flex justify-between font-serif text-2xl"><span>{t('total')}</span><span>{kzt(total, i18n.language)}</span></div></div>
            {isOwn ? <p className="text-sm text-mute">{t('own_tour')}</p> : <button className="btn btn-primary w-full" onClick={book} disabled={busy || !dates.data?.length}>{busy ? '…' : t('book_now')}</button>}
            <p className="text-center text-xs text-mute">{t('book_note')}</p>
          </div>
        </aside>
      </div>
      <AssistantWidget tourId={id} />
    </div>
  );
}
export { StatusBadge };
