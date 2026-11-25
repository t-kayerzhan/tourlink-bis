import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../lib/supabase';
import type { Agency, Destination } from '../lib/types';
import { searchTours, emptyFilters } from '../lib/hooks';
import { TourCard } from '../components/TourCard';
import { Spinner, ErrorBox, Empty, PageHeader } from '../components/ui';


export function Destinations() {
  const { t } = useTranslation();

  const q = useQuery({
    queryKey: ['dest-counts'],
    queryFn: async () => {
      const [d, tr] = await Promise.all([
        supabase
          .from('destinations')
          .select('*')
          .order('country')
          .order('city'),

        supabase
          .from('tours')
          .select('destination_id')
          .eq('status', 'published'),
      ]);

      if (d.error) throw d.error;
      if (tr.error) throw tr.error;

      const c = new Map<string, number>();

      tr.data?.forEach(x =>
        c.set(
          x.destination_id,
          (c.get(x.destination_id) ?? 0) + 1
        )
      );

      return (d.data as Destination[]).map(x => ({
        ...x,
        n: c.get(x.id) ?? 0,
      }));
    },
  });

  if (q.isLoading) return <Spinner />;

  if (q.error) {
    return <ErrorBox message={errMsg(q.error)} />;
  }

  const by = new Map<string, typeof q.data>();

  q.data?.forEach(d =>
    by.set(d.country, [
      ...(by.get(d.country) ?? []),
      d,
    ])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">

      <PageHeader
        title={t('nav_destinations')}
        sub={t('dest_sub')}
      />

      {[...by.entries()].map(([country, ds]) => (
        <section key={country} className="mb-8">

          <h2 className="mb-3 text-3xl">
            {country}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {ds!.map(d => {
              const photoUrl = d.image_path
                ? supabase.storage
                    .from('destination-images')
                    .getPublicUrl(d.image_path).data.publicUrl
                : null;

              return (
                <Link
                  key={d.id}
                  to={`/tours?country=${encodeURIComponent(d.country)}&city=${encodeURIComponent(d.city)}`}
                  className="card overflow-hidden transition hover:-translate-y-1"
                >

                  <div className="relative aspect-[16/10] overflow-hidden bg-sand">

                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="h-10 w-10 text-terra opacity-50" />
                    </div>

                    {photoUrl && (
                      <img
                        src={photoUrl}
                        alt={d.city}
                        loading="lazy"
                        className="relative h-full w-full object-cover"
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}

                  </div>

                  <div className="p-4">

                    <p className="flex items-center gap-1 font-serif text-2xl">
                      <MapPin className="h-4 w-4 text-terra" />
                      {d.city}
                    </p>

                    <p className="text-xs text-mute">
                      {d.region}
                    </p>

                    <p className="mt-2 text-sm">
                      {t('tours_n', { count: d.n })}
                    </p>

                  </div>

                </Link>
              );
            })}

          </div>

        </section>
      ))}

    </div>
  );
}

export function AgencyPublic() {
  const { id = '' } = useParams(); const { t } = useTranslation();
  const a = useQuery({ queryKey: ['agency', id], queryFn: async () => (await supabase.from('agencies').select('*').eq('id', id).maybeSingle()).data as Agency | null });
  const tours = useQuery({ queryKey: ['agency-tours', id], queryFn: () => searchTours({ ...emptyFilters, agency: id }, 60) });
  if (a.isLoading) return <Spinner />;
  if (!a.data) return <div className="mx-auto max-w-3xl px-4 py-16"><Empty title={t('agency_nf')} /></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="section-dark mb-8 rounded-3xl p-8"><p className="mb-2 inline-flex items-center gap-1 rounded-full bg-cream/10 px-3 py-1 text-xs"><ShieldCheck className="h-4 w-4" />{t('verified')}</p><h1 className="text-5xl">{a.data.name}</h1><p className="mt-2 max-w-2xl opacity-85">{a.data.description || '—'}</p></div>
      <h2 className="mb-4 text-3xl">{t('nav_tours')}</h2>
      {tours.isLoading ? <Spinner /> : !tours.data?.length ? <Empty title={t('empty_tours')} /> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tours.data.map((x) => <TourCard key={x.id} t={x} />)}</div>}
    </div>
  );
}
export function About() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10"><PageHeader title={t('nav_about')} sub={t('about_sub')} />
      <div className="card space-y-3 p-6"><h2 className="text-3xl">{t('about_aim')}</h2><p className="text-mute">{t('about_aim_t')}</p></div>
      <div className="card space-y-2 p-6"><h2 className="text-3xl">{t('about_actors')}</h2><ul className="list-disc space-y-1 pl-5 text-mute"><li>{t('actor_tourist')}</li><li>{t('actor_agency')}</li><li>{t('actor_admin')}</li></ul></div>
      <div className="card space-y-2 p-6"><h2 className="text-3xl">{t('about_demo')}</h2><p className="text-mute">{t('about_demo_t')}</p></div>
    </div>
  );
}
