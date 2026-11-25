import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload } from 'lucide-react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg, imageUrl } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { CATEGORIES, type Destination, type TourDate, type TourImage, type Step } from '../../lib/types';
import { Field, Spinner, PageHeader } from '../../components/ui';
import { useToast } from '../../lib/toast';
import { fmtDate } from '../../lib/format';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']; const MAX = 5 * 1024 * 1024; const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const blank = { title: '', description: '', destination_id: '', category: 'nature', duration_days: 1, price_kzt: 0, meeting_point: '', latitude: '', longitude: '', included: '', excluded: '', status: 'draft' };
type StepDraft = { day_number: number; start_time: string; title: string; details: string };

export default function TourForm() {
  const { id } = useParams(); const editing = !!id; const { t, i18n } = useTranslation(); const { agency, role } = useAuth(); const nav = useNavigate(); const toast = useToast(); const qc = useQueryClient();
  const [f, setF] = useState<typeof blank>(blank); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [files, setFiles] = useState<File[]>([]); const [steps, setSteps] = useState<StepDraft[]>([]);
  const dests = useQuery({ queryKey: ['dests'], queryFn: async () => (await supabase.from('destinations').select('*').order('country').order('city')).data as Destination[] });
  const load = useQuery({ queryKey: ['edit-tour', id], enabled: editing, queryFn: async () => {
    const [t1, st, im, dt] = await Promise.all([supabase.from('tours').select('*').eq('id', id!).maybeSingle(), supabase.from('itinerary_steps').select('*').eq('tour_id', id!).order('day_number').order('step_order'),
      supabase.from('tour_images').select('*').eq('tour_id', id!).order('position'), supabase.from('tour_dates').select('*').eq('tour_id', id!).order('start_date')]);
    return { tour: t1.data, steps: st.data as Step[], images: im.data as TourImage[], dates: dt.data as TourDate[] }; } });
  useEffect(() => { const d = load.data; if (!d?.tour) return; const x = d.tour; setF({ title: x.title, description: x.description, destination_id: x.destination_id, category: x.category, duration_days: x.duration_days, price_kzt: Number(x.price_kzt), meeting_point: x.meeting_point ?? '', latitude: x.latitude ?? '', longitude: x.longitude ?? '', included: x.included, excluded: x.excluded, status: x.status });
    setSteps(d.steps.map((s) => ({ day_number: s.day_number, start_time: s.start_time?.slice(0, 5) ?? '', title: s.title, details: s.details }))); }, [load.data]);

  const schema = z.object({ title: z.string().trim().min(3, t('v_title')).max(120), description: z.string().max(5000), destination_id: z.string().min(1, t('v_destination')), category: z.enum(CATEGORIES),
    duration_days: z.number().int().min(1).max(90), price_kzt: z.number().min(0, t('v_price')).max(100_000_000), meeting_point: z.string().max(200), included: z.string().max(2000), excluded: z.string().max(2000),
    latitude: z.string().refine((v) => v === '' || (+v >= -90 && +v <= 90), t('v_lat')), longitude: z.string().refine((v) => v === '' || (+v >= -180 && +v <= 180), t('v_lng')), status: z.enum(['draft', 'published', 'archived']) });
  const pickDest = (did: string) => { const d = dests.data?.find((x) => x.id === did); setF((p) => ({ ...p, destination_id: did, latitude: p.latitude === '' && d?.latitude != null ? String(d.latitude) : p.latitude, longitude: p.longitude === '' && d?.longitude != null ? String(d.longitude) : p.longitude })); };
  function addFiles(list: FileList | null) { if (!list) return; const ok: File[] = []; for (const file of Array.from(list)) { if (!ALLOWED.includes(file.type)) { toast.err(t('img_type')); continue; } if (file.size > MAX) { toast.err(t('img_size')); continue; } ok.push(file); } setFiles((p) => [...p, ...ok]); }
  async function upload(tourId: string, start: number) {
    for (let i = 0; i < files.length; i++) { const file = files[i]; const path = `${agency!.id}/${crypto.randomUUID()}.${EXT[file.type]}`;
      const up = await supabase.storage.from('tour-images').upload(path, file, { contentType: file.type, upsert: false }); if (up.error) throw up.error;
      const ins = await supabase.from('tour_images').insert({ tour_id: tourId, storage_path: path, alt_text: f.title.slice(0, 120), position: start + i }); if (ins.error) throw ins.error; }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; const r = schema.safeParse({ ...f, duration_days: Number(f.duration_days), price_kzt: Number(f.price_kzt), latitude: String(f.latitude), longitude: String(f.longitude) });
    if (!r.success) { setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); toast.err(t('fix_errors')); return; } setErrs({});
    if (!agency && role !== 'admin') return; setBusy(true);
    try {
      const v = r.data; const row = { title: v.title, description: v.description, destination_id: v.destination_id, category: v.category, duration_days: v.duration_days, price_kzt: v.price_kzt, meeting_point: v.meeting_point || null, latitude: v.latitude === '' ? null : +v.latitude, longitude: v.longitude === '' ? null : +v.longitude, included: v.included, excluded: v.excluded, status: v.status };
      let tourId = id;
      if (editing) { const { error } = await supabase.from('tours').update(row).eq('id', id!); if (error) throw error; }
      else { const { data, error } = await supabase.from('tours').insert({ ...row, agency_id: agency!.id }).select('id').single(); if (error) throw error; tourId = data.id; }
      const cleanSteps = steps.filter((s) => s.title.trim()).map((s, i) => ({ tour_id: tourId, day_number: s.day_number, step_order: i + 1, start_time: s.start_time || null, title: s.title.trim(), details: s.details }));
      await supabase.from('itinerary_steps').delete().eq('tour_id', tourId!); if (cleanSteps.length) { const { error } = await supabase.from('itinerary_steps').insert(cleanSteps); if (error) throw error; }
      if (files.length) await upload(tourId!, load.data?.images.length ?? 0);
      toast.ok(t('saved')); setFiles([]); qc.invalidateQueries({ queryKey: ['own-tours'] }); qc.invalidateQueries({ queryKey: ['edit-tour', tourId] });
      if (!editing) nav(`/agency/tours/${tourId}/edit`, { replace: true });
    } catch (er) { toast.err(errMsg(er)); } finally { setBusy(false); }
  }
  async function delImage(im: TourImage) { const { error } = await supabase.from('tour_images').delete().eq('id', im.id); if (error) return toast.err(errMsg(error)); await supabase.storage.from('tour-images').remove([im.storage_path]); qc.invalidateQueries({ queryKey: ['edit-tour', id] }); }
  const [nd, setNd] = useState({ start: '', end: '', cap: 10 });
  async function addDate() { if (!nd.start) return toast.err(t('pick_date')); const end = nd.end || nd.start; if (end < nd.start || nd.cap < 1) return toast.err(t('v_dates'));
    const { error } = await supabase.from('tour_dates').insert({ tour_id: id, start_date: nd.start, end_date: end, capacity: nd.cap }); if (error) return toast.err(error.code === '23505' ? t('date_dup') : errMsg(error)); setNd({ start: '', end: '', cap: 10 }); qc.invalidateQueries({ queryKey: ['edit-tour', id] }); }
  async function updDate(d: TourDate, patch: Partial<TourDate>) { const { error } = await supabase.from('tour_dates').update(patch).eq('id', d.id); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); qc.invalidateQueries({ queryKey: ['edit-tour', id] }); } }
  async function delDate(d: TourDate) { const { error } = await supabase.from('tour_dates').delete().eq('id', d.id); if (error) toast.err(error.code === '23503' ? t('delete_blocked_date') : errMsg(error)); else qc.invalidateQueries({ queryKey: ['edit-tour', id] }); }
  if (editing && load.isLoading) return <Spinner />;
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-8"><PageHeader title={editing ? t('edit_tour') : t('new_tour')} />
      <form onSubmit={save} className="space-y-6" noValidate>
        <div className="card grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2"><Field label={t('title')} error={errs.title}><input className="input" value={f.title} onChange={set('title')} maxLength={120} /></Field></div>
          <div className="md:col-span-2"><Field label={t('description')} error={errs.description}><textarea className="input" rows={5} value={f.description} onChange={set('description')} maxLength={5000} /></Field></div>
          <Field label={t('destination')} error={errs.destination_id}><select className="input" value={f.destination_id} onChange={(e) => pickDest(e.target.value)}><option value="">—</option>{dests.data?.map((d) => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}</select></Field>
          <Field label={t('category')}><select className="input" value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{t('cat_' + c)}</option>)}</select></Field>
          <Field label={t('duration_days')} error={errs.duration_days}><input className="input" type="number" min={1} max={90} value={f.duration_days} onChange={set('duration_days')} /></Field>
          <Field label={t('price_kzt')} error={errs.price_kzt}><input className="input" type="number" min={0} value={f.price_kzt} onChange={set('price_kzt')} /></Field>
          <Field label={t('meeting_point')}><input className="input" value={f.meeting_point} onChange={set('meeting_point')} /></Field>
          <Field label={t('status')}><select className="input" value={f.status} onChange={set('status')}>{['draft', 'published', 'archived'].map((s) => <option key={s} value={s}>{t('st_' + s)}</option>)}</select></Field>
          <Field label={t('latitude')} error={errs.latitude}><input className="input" value={f.latitude} onChange={set('latitude')} inputMode="decimal" /></Field><Field label={t('longitude')} error={errs.longitude}><input className="input" value={f.longitude} onChange={set('longitude')} inputMode="decimal" /></Field>
          <Field label={t('included')}><textarea className="input" rows={3} value={f.included} onChange={set('included')} /></Field><Field label={t('excluded')}><textarea className="input" rows={3} value={f.excluded} onChange={set('excluded')} /></Field>
        </div>
        <div className="card space-y-3 p-5"><h2 className="text-2xl">{t('photos')}</h2><p className="text-xs text-mute">{t('img_rules')}</p>
          <div className="flex flex-wrap gap-3">{load.data?.images.map((im) => <div key={im.id} className="relative"><img src={imageUrl(im.storage_path)!} alt={im.alt_text} className="h-24 w-32 rounded-xl object-cover" /><button type="button" onClick={() => delImage(im)} aria-label={t('delete')} className="absolute right-1 top-1 rounded-full bg-cream p-1 text-terra"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
            {files.map((x, i) => <div key={i} className="relative"><img src={URL.createObjectURL(x)} alt="" className="h-24 w-32 rounded-xl object-cover opacity-80" /><button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-cream p-1 text-terra" aria-label={t('remove')}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>
          <label className="btn btn-ghost cursor-pointer"><Upload className="h-4 w-4" />{t('add_photos')}<input type="file" className="hidden" multiple accept={ALLOWED.join(',')} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} /></label></div>
        <div className="card space-y-3 p-5"><div className="flex items-center justify-between"><h2 className="text-2xl">{t('itinerary')}</h2><button type="button" className="btn btn-ghost" onClick={() => setSteps([...steps, { day_number: steps[steps.length - 1]?.day_number ?? 1, start_time: '', title: '', details: '' }])}><Plus className="h-4 w-4" />{t('add_step')}</button></div>
          {steps.map((s, i) => <div key={i} className="grid gap-2 rounded-xl border border-sand p-3 md:grid-cols-[5rem_6rem_1fr_auto]"><input className="input" type="number" min={1} aria-label={t('day')} value={s.day_number} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, day_number: Math.max(1, +e.target.value) } : x)))} /><input className="input" type="time" value={s.start_time} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, start_time: e.target.value } : x)))} />
            <div className="space-y-1"><input className="input" placeholder={t('title')} value={s.title} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /><input className="input" placeholder={t('description')} value={s.details} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)))} /></div><button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label={t('remove')} className="text-terra"><Trash2 className="h-4 w-4" /></button></div>)}</div>
        <button className="btn btn-primary" disabled={busy}>{busy ? t('saving') : t('save')}</button>
      </form>
      {editing ? <div className="card space-y-3 p-5"><h2 className="text-2xl">{t('departures')}</h2>
        {load.data?.dates.map((d) => <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-sand p-3 text-sm"><b>{fmtDate(d.start_date, i18n.language)}{d.end_date !== d.start_date && ` – ${fmtDate(d.end_date, i18n.language)}`}</b>
          <label className="flex items-center gap-1">{t('capacity')}<input className="input !w-20" type="number" min={1} defaultValue={d.capacity} onBlur={(e) => +e.target.value !== d.capacity && +e.target.value > 0 && updDate(d, { capacity: +e.target.value })} /></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={d.active} onChange={(e) => updDate(d, { active: e.target.checked })} />{t('active')}</label><button className="ml-auto text-terra" onClick={() => delDate(d)} aria-label={t('delete')}><Trash2 className="h-4 w-4" /></button></div>)}
        <div className="grid gap-2 sm:grid-cols-4"><input className="input" type="date" aria-label={t('date_from')} value={nd.start} onChange={(e) => setNd({ ...nd, start: e.target.value })} /><input className="input" type="date" aria-label={t('date_to')} value={nd.end} onChange={(e) => setNd({ ...nd, end: e.target.value })} /><input className="input" type="number" min={1} aria-label={t('capacity')} value={nd.cap} onChange={(e) => setNd({ ...nd, cap: +e.target.value })} /><button type="button" className="btn btn-forest" onClick={addDate}><Plus className="h-4 w-4" />{t('add_date')}</button></div></div>
        : <p className="text-sm text-mute">{t('dates_after_save')}</p>}
    </div>
  );
}
