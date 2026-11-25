import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../../lib/supabase';
import type { AgencyBookingRow } from '../../lib/types';
import { kzt, fmtDate, toCsv, downloadText } from '../../lib/format';
import { Spinner, Empty, ErrorBox, PageHeader, StatusBadge, Modal, Field, Confirm } from '../../components/ui';
import { useToast } from '../../lib/toast';
import { useAuth } from '../../lib/auth';
import { z } from 'zod';

export const useAgencyBookings = () => useQuery({ queryKey: ['agency-bookings'], queryFn: async () => { const { data, error } = await supabase.rpc('agency_bookings'); if (error) throw error; return data as AgencyBookingRow[]; } });

export default function AgencyBookings() {
  const { t, i18n } = useTranslation(); const qc = useQueryClient(); const toast = useToast(); const { agency } = useAuth();
  const q = useAgencyBookings(); const [status, setStatus] = useState(''); const [manual, setManual] = useState(false); const [cancel, setCancel] = useState<string | null>(null);
  const dates = useQuery({ queryKey: ['own-dates'], enabled: manual, queryFn: async () => { const { data, error } = await supabase.from('tour_dates').select('id,start_date,tours!inner(title,status,agency_id)').eq('active', true).eq('tours.status', 'published').eq('tours.agency_id', agency!.id).gte('start_date', new Date().toISOString().slice(0, 10)).order('start_date'); if (error) throw error; return data as unknown as { id: string; start_date: string; tours: { title: string } }[]; } });
  const [m, setM] = useState({ date: '', name: '', email: '', pax: 1 }); const [errs, setErrs] = useState<Record<string, string>>({});
  const rows = (q.data ?? []).filter((r) => !status || r.status === status);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['agency-bookings'] }); qc.invalidateQueries({ queryKey: ['unread'] }); };
  async function change(id: string, s: 'confirmed' | 'cancelled' | 'completed') { const { error } = await supabase.rpc('change_booking_status', { p_booking_id: id, p_new_status: s }); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); refresh(); } }
  async function addManual(e: React.FormEvent) {
    e.preventDefault(); const r = z.object({ date: z.string().min(1, t('pick_date')), name: z.string().trim().min(2, t('v_name')), email: z.string().trim().email(t('v_email')), pax: z.number().int().min(1).max(30) }).safeParse(m);
    if (!r.success) return setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); setErrs({});
    const { error } = await supabase.rpc('manual_booking', { p_date_id: r.data.date, p_guest_name: r.data.name, p_guest_email: r.data.email, p_participants: r.data.pax });
    if (error) return toast.err(errMsg(error)); toast.ok(t('manual_ok')); setManual(false); setM({ date: '', name: '', email: '', pax: 1 }); refresh();
  }
  function exportCsv() {
    downloadText(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.map((r) => ({ reference: r.booking_id.slice(0, 8), created: r.created_at.slice(0, 10), tour: r.tour_title, start_date: r.start_date, participants: r.participants_count, total_kzt: r.total_kzt, status: r.status, payment_demo: r.payment_status, source: r.source, customer: r.customer_name, email: r.customer_email }))));
  }
  return (<div><PageHeader title={t('ag_bookings')} right={<div className="flex gap-2"><button className="btn btn-ghost" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" />CSV</button><button className="btn btn-primary" onClick={() => setManual(true)}><Plus className="h-4 w-4" />{t('manual_booking')}</button></div>} />
    <select className="input mb-4 !w-auto" aria-label={t('status')} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t('status')}: {t('any')}</option>{['pending', 'confirmed', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{t('st_' + s)}</option>)}</select>
    {q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !rows.length ? <Empty title={t('empty_bookings')} /> :
      <div className="card overflow-x-auto"><table className="w-full"><thead><tr>{['ref', 'customer', 'tour', 'date', 'pax', 'total', 'status', 'payment', ''].map((h) => <th key={h} className="th">{h && t('col_' + h)}</th>)}</tr></thead><tbody>
        {rows.map((r) => <tr key={r.booking_id} className="border-t border-sand"><td className="td font-mono text-xs">{r.booking_id.slice(0, 8)}{r.source === 'manual' && <span className="chip ml-1">{t('manual')}</span>}</td><td className="td">{r.customer_name}<br /><span className="text-xs text-mute">{r.customer_email}</span></td><td className="td">{r.tour_title}</td><td className="td">{fmtDate(r.start_date, i18n.language)}</td><td className="td">{r.participants_count}</td><td className="td">{kzt(r.total_kzt, i18n.language)}</td><td className="td"><StatusBadge s={r.status} /></td><td className="td">{r.payment_status && <StatusBadge s={r.payment_status} />}</td>
          <td className="td"><div className="flex flex-wrap gap-1">{r.status === 'pending' && <button className="btn btn-forest !px-3 !py-1" onClick={() => change(r.booking_id, 'confirmed')}>{t('confirm')}</button>}{r.status === 'confirmed' && <button className="btn btn-ghost !px-3 !py-1" onClick={() => change(r.booking_id, 'completed')}>{t('st_completed')}</button>}{(r.status === 'pending' || r.status === 'confirmed') && <button className="btn btn-danger !px-3 !py-1" onClick={() => setCancel(r.booking_id)}>{t('cancel_booking')}</button>}</div></td></tr>)}</tbody></table></div>}
    <Confirm open={!!cancel} title={t('cancel_booking')} text={t('cancel_text_agency')} onNo={() => setCancel(null)} onYes={() => { change(cancel!, 'cancelled'); setCancel(null); }} />
    <Modal open={manual} onClose={() => setManual(false)} title={t('manual_booking')}><form onSubmit={addManual} className="space-y-3" noValidate><p className="text-sm text-mute">{t('manual_hint')}</p>
      <Field label={t('select_date')} error={errs.date}><select className="input" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })}><option value="">—</option>{dates.data?.map((d) => <option key={d.id} value={d.id}>{d.tours.title} · {fmtDate(d.start_date, i18n.language)}</option>)}</select></Field>
      <Field label={t('guest_name')} error={errs.name}><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field><Field label={t('email')} error={errs.email}><input className="input" type="email" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} /></Field>
      <Field label={t('participants')}><input className="input" type="number" min={1} max={30} value={m.pax} onChange={(e) => setM({ ...m, pax: +e.target.value })} /></Field><button className="btn btn-primary w-full">{t('save')}</button></form></Modal></div>);
}
