import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { searchTours, filtersFromParams } from '../lib/hooks';
import type { CatalogTour } from '../lib/types';
import { kzt, fmtDate } from '../lib/format';
import { Spinner, ErrorBox, PageHeader } from '../components/ui';
import { pinIcon } from '../components/MiniMap';
import { CATEGORIES } from '../lib/types';

const bubble = (n: number, size: number) => L.divIcon({ className: '', html: `<div class="cluster-pin" style="width:${size}px;height:${size}px">${n}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
type Agg = { key: string; lat: number; lng: number; tours: CatalogTour[]; label: string };
function aggregate(tours: CatalogTour[], by: 'country' | 'city'): Agg[] {
  const m = new Map<string, Agg>();
  tours.filter((t) => t.latitude != null && t.longitude != null).forEach((t) => {
    const key = by === 'country' ? t.country : `${t.country}|${t.city}`; const a = m.get(key);
    if (a) a.tours.push(t); else m.set(key, { key, lat: 0, lng: 0, tours: [t], label: by === 'country' ? t.country : t.city });
  });
  m.forEach((a) => { a.lat = a.tours.reduce((s, t) => s + Number(t.latitude), 0) / a.tours.length; a.lng = a.tours.reduce((s, t) => s + Number(t.longitude), 0) / a.tours.length; });
  return [...m.values()];
}
function Layers({ tours }: { tours: CatalogTour[] }) {
  const { t, i18n } = useTranslation(); const [zoom, setZoom] = useState(4);
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const level = zoom < 5 ? 'country' : zoom < 8 ? 'city' : 'tour';
  const aggs = useMemo(() => (level === 'tour' ? [] : aggregate(tours, level)), [tours, level]);
  return (<>
    {level !== 'tour' && aggs.map((a) => <Marker key={a.key} position={[a.lat, a.lng]} icon={bubble(a.tours.length, 34 + Math.min(26, a.tours.length * 4))} eventHandlers={{ click: () => map.flyTo([a.lat, a.lng], level === 'country' ? 6 : 9) }} title={`${a.label}: ${a.tours.length}`} />)}
    {level === 'tour' && tours.filter((x) => x.latitude != null && x.longitude != null).map((x) => (
      <Marker key={x.id} position={[Number(x.latitude), Number(x.longitude)]} icon={pinIcon}>
        <Popup><div className="w-52 space-y-1"><p className="font-serif text-xl leading-tight">{x.title}</p><p className="text-xs">{x.city}, {x.country}</p><p className="font-semibold text-terra">{kzt(x.price_kzt, i18n.language)}</p><p className="text-xs">{t('next_date')}: {fmtDate(x.next_date, i18n.language)}</p><Link to={`/tours/${x.id}`} className="btn btn-primary mt-1 w-full !py-1.5 !text-white">{t('view_tour')}</Link></div></Popup>
      </Marker>))}
  </>);
}
export default function ExploreMap() {
  const { t } = useTranslation(); const [params, setParams] = useSearchParams(); const f = filtersFromParams(params);
  const q = useQuery({ queryKey: ['map-tours', f], queryFn: () => searchTours(f, 200) });
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };
  const geo = q.data?.filter((x) => x.latitude != null).length ?? 0;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader title={t('nav_map')} sub={t('map_sub')} right={<Link to={`/tours?${params.toString()}`} className="btn btn-ghost">{t('open_catalog')}</Link>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <select className="input" aria-label={t('category')} value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">{t('category')}: {t('any')}</option>{CATEGORIES.map((c) => <option key={c} value={c}>{t('cat_' + c)}</option>)}</select>
        <input className="input" type="number" placeholder={t('price_max')} value={f.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} />
        <input className="input" type="date" aria-label={t('date_from')} value={f.from} onChange={(e) => set('from', e.target.value)} />
        <input className="input" type="search" placeholder={t('search')} value={f.q} onChange={(e) => set('q', e.target.value)} />
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={(q.error as Error).message} /> : (<>
        <p className="mb-2 text-sm text-mute" aria-live="polite">{t('map_count', { count: geo })} · {t('map_levels')}</p>
        <div className="overflow-hidden rounded-3xl border border-sand shadow-soft"><MapContainer center={[45, 60]} zoom={4} minZoom={2} style={{ height: '65vh' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={18} />
          <Layers tours={q.data ?? []} /></MapContainer></div></>)}
    </div>
  );
}
