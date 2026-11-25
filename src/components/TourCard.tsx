import { Link } from 'react-router-dom';
import { Heart, Star, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CatalogTour } from '../lib/types';
import { kzt, fmtDate, seatBadge } from '../lib/format';
import { Photo } from './Photo';

export function TourCard({ t: tour, fav, onFav, onCompare, inCompare }: { t: CatalogTour; fav?: boolean; onFav?: () => void; onCompare?: () => void; inCompare?: boolean }) {
  const { t, i18n } = useTranslation();
  const b = seatBadge(tour.seats_left);
  return (
    <article className="card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden">
        <Link to={`/tours/${tour.id}`}><Photo path={tour.cover_path} category={tour.category} alt={tour.title} className="h-full w-full transition duration-500 group-hover:scale-105" /></Link>
        <span className="chip absolute left-3 top-3 bg-cream/90 text-forest">{t('cat_' + tour.category)}</span>
        {b !== 'ok' && <span className={`absolute bottom-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${b === 'soldout' ? 'bg-ink' : 'bg-terra'}`}>{t(b === 'soldout' ? 'sold_out' : 'almost_full')}</span>}
        {onFav && <button onClick={onFav} aria-label={t('favorite')} className="absolute right-3 top-3 rounded-full bg-cream/90 p-2 text-terra"><Heart className={`h-4 w-4 ${fav ? 'fill-terra' : ''}`} /></button>}
      </div>
      <div className="space-y-2 p-4">
        <Link to={`/tours/${tour.id}`}><h3 className="text-2xl leading-tight hover:text-terra">{tour.title}</h3></Link>
        <p className="flex items-center gap-1 text-sm text-mute"><MapPin className="h-3.5 w-3.5" />{tour.city}, {tour.country}</p>
        <p className="flex items-center gap-1 text-xs text-mute"><ShieldCheck className="h-3.5 w-3.5 text-sage" /><Link to={`/agencies/${tour.agency_id}`} className="hover:underline">{tour.agency_name}</Link></p>
        <div className="flex items-center justify-between text-sm text-mute">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t('days_n', { count: tour.duration_days })}</span>
          <span className="flex items-center gap-1">{tour.avg_rating ? <><Star className="h-3.5 w-3.5 fill-terra text-terra" />{tour.avg_rating} ({tour.review_count})</> : t('no_reviews')}</span>
        </div>
        <div className="flex items-end justify-between pt-1">
          <div><p className="text-xs text-mute">{t('from')}</p><p className="font-serif text-2xl text-terra">{kzt(tour.price_kzt, i18n.language)}</p></div>
          <p className="text-right text-xs text-mute">{tour.next_date ? <>{t('next_date')}<br /><b className="text-ink">{fmtDate(tour.next_date, i18n.language)}</b></> : t('no_dates')}</p>
        </div>
        {onCompare && <button onClick={onCompare} className={`btn w-full ${inCompare ? 'btn-forest' : 'btn-ghost'}`}>{inCompare ? t('in_compare') : t('compare')}</button>}
      </div>
    </article>
  );
}
