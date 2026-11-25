import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Map as MapIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { searchTours, filtersFromParams, emptyFilters, useFavorites, useCompare, type Filters } from '../lib/hooks';
import { TourCard } from '../components/TourCard';
import { Spinner, Empty, ErrorBox, PageHeader, Field } from '../components/ui';
import { CATEGORIES, type Destination } from '../lib/types';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { AssistantWidget } from '../components/Assistant';

export default function Tours() {
  const { t } = useTranslation(); const [params, setParams] = useSearchParams(); const { session } = useAuth(); const toast = useToast();
  const f = useMemo(() => filtersFromParams(params), [params]);
  const set = (k: keyof Filters, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const fav = useFavorites(); const cmp = useCompare();
  const tours = useQuery({ queryKey: ['tours', f], queryFn: () => searchTours(f, 60) });
  const dests = useQuery({ queryKey: ['dests'], queryFn: async () => (await supabase.from('destinations').select('*').order('country').order('city')).data as Destination[] });
  const agencies = useQuery({ queryKey: ['agencies-list'], queryFn: async () => (await supabase.from('agencies').select('id,name').eq('status', 'approved').order('name')).data as { id: string; name: string }[] });
  const entities = useQuery({ queryKey: ['entities', f.q], enabled: f.q.trim().length >= 2, queryFn: async () => { const { data, error } = await supabase.rpc('search_entities', { p_q: f.q }); if (error) throw error; return data as { entity_type: string; entity_id: string; title: string; subtitle: string; tour_count: number }[]; } });
  const countries = [...new Set(dests.data?.map((d) => d.country))];
  const cities = dests.data?.filter((d) => !f.country || d.country === f.country).map((d) => d.city) ?? [];
  const activeCount = Object.entries(f).filter(([k, v]) => v && k !== 'sort' && k !== 'q').length;
  const mapQs = params.toString();
  async function onFav(id: string) { if (!session) { toast.err(t('login_required')); return; } try { await fav.toggle(id); } catch (e) { toast.err((e as Error).message); } }
  const inp = (k: keyof Filters, type = 'text', ph = '') => <input className="input" type={type} placeholder={ph} value={f[k]} onChange={(e) => set(k, e.target.value)} />;
  const dest = entities.data?.filter((e) => e.entity_type === 'destination') ?? []; const ag = entities.data?.filter((e) => e.entity_type === 'agency') ?? [];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader title={t('nav_tours')} sub={t('catalog_sub')} right={<Link to={`/explore-map?${mapQs}`} className="btn btn-ghost"><MapIcon className="h-4 w-4" />{t('show_on_map')}</Link>} />
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="card h-fit space-y-3 p-4 lg:sticky lg:top-24" aria-label={t('filters')}>
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-2xl"><SlidersHorizontal className="h-4 w-4" />{t('filters')}{activeCount > 0 && <span className="chip">{activeCount}</span>}</h2>
            {(activeCount > 0 || f.q) && <button className="text-xs underline" onClick={() => setParams({}, { replace: true })}>{t('clear')}</button>}</div>
          <Field label={t('search')}>{inp('q', 'search', t('search_ph'))}</Field>
          <Field label={t('country')}><select className="input" value={f.country} onChange={(e) => { const p = new URLSearchParams(params); e.target.value ? p.set('country', e.target.value) : p.delete('country'); p.delete('city'); setParams(p, { replace: true }); }}><option value="">{t('any')}</option>{countries.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label={t('city')}><select className="input" value={f.city} onChange={(e) => set('city', e.target.value)}><option value="">{t('any')}</option>{cities.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label={t('agency')}><select className="input" value={f.agency} onChange={(e) => set('agency', e.target.value)}><option value="">{t('any')}</option>{agencies.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label={t('category')}><select className="input" value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">{t('any')}</option>{CATEGORIES.map((c) => <option key={c} value={c}>{t('cat_' + c)}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2"><Field label={t('price_min')}>{inp('minPrice', 'number')}</Field><Field label={t('price_max')}>{inp('maxPrice', 'number')}</Field></div>
          <div className="grid grid-cols-2 gap-2"><Field label={t('days_min')}>{inp('minDays', 'number')}</Field><Field label={t('days_max')}>{inp('maxDays', 'number')}</Field></div>
          <div className="grid grid-cols-2 gap-2"><Field label={t('date_from')}>{inp('from', 'date')}</Field><Field label={t('date_to')}>{inp('to', 'date')}</Field></div>
          <Field label={t('seats_min')}>{inp('seats', 'number')}</Field>
          <Field label={t('rating_min')}><select className="input" value={f.rating} onChange={(e) => set('rating', e.target.value)}><option value="">{t('any')}</option>{[3, 4, 4.5].map((r) => <option key={r} value={r}>{r}+</option>)}</select></Field>
        </aside>
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-mute" aria-live="polite">{tours.data ? t('results_n', { count: tours.data.length }) : ''}</p>
            <label className="flex items-center gap-2 text-sm">{t('sort')}<select className="input !w-auto" value={f.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="">{t('sort_new')}</option><option value="price_asc">{t('sort_price_asc')}</option><option value="price_desc">{t('sort_price_desc')}</option>
              <option value="duration_asc">{t('sort_dur_asc')}</option><option value="duration_desc">{t('sort_dur_desc')}</option><option value="date">{t('sort_date')}</option><option value="rating">{t('sort_rating')}</option></select></label>
          </div>
          {f.q.trim().length >= 2 && (dest.length > 0 || ag.length > 0) && (
            <div className="card mb-6 space-y-3 p-4">
              {dest.length > 0 && <div><p className="label">{t('ent_destinations')}</p><div className="flex flex-wrap gap-2">{dest.map((d) => <button key={d.entity_id} className="chip hover:bg-sage/40" onClick={() => { const p = new URLSearchParams(params); p.delete('q'); p.set('city', d.title); setParams(p); }}>{d.title} · {d.subtitle} ({d.tour_count})</button>)}</div></div>}
              {ag.length > 0 && <div><p className="label">{t('ent_agencies')}</p><div className="flex flex-wrap gap-2">{ag.map((a) => <Link key={a.entity_id} to={`/agencies/${a.entity_id}`} className="chip hover:bg-sage/40">{a.title} ({a.tour_count})</Link>)}</div></div>}
            </div>)}
          {tours.isLoading ? <Spinner label={t('loading')} /> : tours.error ? <ErrorBox message={(tours.error as Error).message} onRetry={() => tours.refetch()} /> :
            !tours.data?.length ? <Empty title={t('empty_tours')} hint={t('empty_tours_hint')} action={<button className="btn btn-primary" onClick={() => setParams({}, { replace: true })}><X className="h-4 w-4" />{t('clear')}</button>} /> :
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{tours.data.map((x) => <TourCard key={x.id} t={x} fav={fav.ids.includes(x.id)} onFav={() => onFav(x.id)} onCompare={() => cmp.toggle(x.id)} inCompare={cmp.ids.includes(x.id)} />)}</div>}
        </section>
      </div>
      {cmp.ids.length > 0 && <div className="fixed bottom-4 left-1/2 z-[1400] flex -translate-x-1/2 items-center gap-3 rounded-full bg-forest px-5 py-3 text-cream shadow-soft"><span className="text-sm">{t('compare_n', { count: cmp.ids.length })}</span><Link to="/compare" className="btn btn-primary !py-1.5">{t('compare')}</Link><button onClick={cmp.clear} aria-label={t('clear')}><X className="h-4 w-4" /></button></div>}
      <AssistantWidget />
    </div>
  );
}
export { emptyFilters };
