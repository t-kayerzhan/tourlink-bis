import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Compass, Map as MapIcon, Sparkles, ShieldCheck, Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { searchTours, emptyFilters } from '../lib/hooks';
import { TourCard } from '../components/TourCard';
import { Spinner, ErrorBox } from '../components/ui';
import { CATEGORIES } from '../lib/types';

export default function Home() {
  const { t } = useTranslation(); const nav = useNavigate(); const [q, setQ] = useState('');
  const featured = useQuery({ queryKey: ['featured'], queryFn: () => searchTours({ ...emptyFilters, sort: 'rating' }, 6) });
  const stats = useQuery({ queryKey: ['home-stats'], queryFn: async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('tours').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('destinations').select('id', { count: 'exact', head: true }),
      supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('status', 'approved')]);
    return { tours: a.count ?? 0, dest: b.count ?? 0, ag: c.count ?? 0 }; } });
  return (
    <>
      <section className="section-dark relative overflow-hidden">
        <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" aria-hidden><path d="M0 320 L120 190 L220 270 L360 120 L520 290 L640 190 L800 300 V400 H0Z" fill="#a4b89c" /><path d="M0 360 Q200 300 400 350 T800 330 V400 H0Z" fill="#c46942" opacity=".6" /></svg>
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-32">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1 text-xs uppercase tracking-widest"><Leaf className="h-3.5 w-3.5" />{t('hero_kicker')}</p>
          <h1 className="max-w-3xl text-5xl leading-[1.05] md:text-7xl">{t('hero_title')}</h1>
          <p className="mt-4 max-w-xl text-lg opacity-85">{t('hero_sub')}</p>
          <form className="mt-8 flex max-w-2xl flex-col gap-2 rounded-3xl bg-cream p-2 text-ink shadow-soft sm:flex-row sm:rounded-full" onSubmit={(e) => { e.preventDefault(); nav(`/tours?q=${encodeURIComponent(q)}`); }}>
            <div className="flex flex-1 items-center gap-2 px-4"><Search className="h-5 w-5 text-mute" /><input aria-label={t('search')} className="w-full bg-transparent py-2 outline-none placeholder:text-mute" placeholder={t('search_ph')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button className="btn btn-primary">{t('search')}</button>
          </form>
          <div className="mt-10 flex flex-wrap gap-8 text-cream">
            {[[stats.data?.tours, t('stat_tours')], [stats.data?.dest, t('stat_dest')], [stats.data?.ag, t('stat_agencies')]].map(([n, l], i) => (<div key={i}><p className="font-serif text-4xl">{n ?? '—'}</p><p className="text-sm opacity-75">{l}</p></div>))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-6 text-4xl md:text-5xl">{t('browse_cat')}</h2>
        <div className="flex flex-wrap gap-3">{CATEGORIES.map((c) => (<Link key={c} to={`/tours?category=${c}`} className="rounded-full border border-sage/60 bg-card px-5 py-2.5 transition hover:-translate-y-0.5 hover:bg-sage/30">{t('cat_' + c)}</Link>))}</div>
      </section>
      <section className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-end justify-between"><h2 className="text-4xl md:text-5xl">{t('top_rated')}</h2><Link to="/tours" className="text-sm underline">{t('view_all')}</Link></div>
        {featured.isLoading ? <Spinner /> : featured.error ? <ErrorBox message={(featured.error as Error).message} onRetry={() => featured.refetch()} /> :
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.data?.map((x) => <TourCard key={x.id} t={x} />)}</div>}
      </section>
      <section className="mx-auto mt-16 grid max-w-7xl gap-6 px-4 md:grid-cols-3">
        {[[Compass, 'feat_search', 'feat_search_t', '/tours'], [MapIcon, 'feat_map', 'feat_map_t', '/explore-map'], [Sparkles, 'feat_quiz', 'feat_quiz_t', '/quiz']].map(([Ic, h, p, to], i) => { const I = Ic as typeof Compass; return (
          <Link key={i} to={to as string} className="card p-6 transition hover:-translate-y-1"><I className="h-8 w-8 text-terra" /><h3 className="mt-3 text-2xl">{t(h as string)}</h3><p className="mt-1 text-sm text-mute">{t(p as string)}</p></Link>); })}
      </section>
      <section className="section-dark mx-auto mt-16 max-w-7xl rounded-3xl px-8 py-12">
        <div className="grid items-center gap-6 md:grid-cols-2"><div><h2 className="text-4xl md:text-5xl">{t('agency_cta')}</h2><p className="mt-2 opacity-80">{t('agency_cta_t')}</p></div>
          <div className="flex items-center gap-4 md:justify-end"><ShieldCheck className="h-10 w-10 text-sage" /><Link to="/agency/apply" className="btn btn-primary">{t('nav_apply')}</Link></div></div>
      </section>
    </>
  );
}
