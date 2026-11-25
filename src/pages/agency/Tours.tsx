import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { kzt } from '../../lib/format';
import { Spinner, Empty, ErrorBox, PageHeader, StatusBadge, Confirm } from '../../components/ui';
import { useToast } from '../../lib/toast';

interface Row { id: string; title: string; status: string; price_kzt: number; category: string; destinations: { city: string; country: string } }
export default function AgencyTours() {
  const { t, i18n } = useTranslation(); const { agency } = useAuth(); const qc = useQueryClient(); const toast = useToast();
  const [ask, setAsk] = useState<{ id: string; kind: 'archive' | 'delete' } | null>(null);
  const q = useQuery({ queryKey: ['own-tours'], queryFn: async () => { const { data, error } = await supabase.from('tours').select('id,title,status,price_kzt,category,destinations(city,country)').eq('agency_id', agency!.id).order('created_at', { ascending: false }); if (error) throw error; return data as unknown as Row[]; } });
  const refresh = () => qc.invalidateQueries({ queryKey: ['own-tours'] });
  async function setStatus(id: string, status: string) { const { error } = await supabase.from('tours').update({ status }).eq('id', id); if (error) toast.err(errMsg(error)); else { toast.ok(t('updated')); refresh(); } }
  async function doAsk() { const a = ask!; setAsk(null); if (a.kind === 'archive') return setStatus(a.id, 'archived');
    const { error } = await supabase.from('tours').delete().eq('id', a.id); if (error) toast.err(error.code === '23503' ? t('delete_blocked') : errMsg(error)); else { toast.ok(t('deleted')); refresh(); } }
  return (<div><PageHeader title={t('ag_tours')} right={<Link to="/agency/tours/new" className="btn btn-primary"><Plus className="h-4 w-4" />{t('new_tour')}</Link>} />
    {q.isLoading ? <Spinner /> : q.error ? <ErrorBox message={errMsg(q.error)} /> : !q.data?.length ? <Empty title={t('empty_own_tours')} action={<Link to="/agency/tours/new" className="btn btn-primary">{t('new_tour')}</Link>} /> :
      <div className="card overflow-x-auto"><table className="w-full"><thead><tr>{['tour', 'destination', 'price', 'status', ''].map((h) => <th key={h} className="th">{h && t('col_' + h)}</th>)}</tr></thead><tbody>
        {q.data.map((r) => <tr key={r.id} className="border-t border-sand"><td className="td font-medium">{r.title}</td><td className="td">{r.destinations.city}, {r.destinations.country}</td><td className="td">{kzt(r.price_kzt, i18n.language)}</td><td className="td"><StatusBadge s={r.status} /></td>
          <td className="td"><div className="flex flex-wrap gap-1"><Link className="btn btn-ghost !px-3 !py-1" to={`/agency/tours/${r.id}/edit`}><Pencil className="h-3.5 w-3.5" />{t('edit')}</Link>
            {r.status === 'published' ? <button className="btn btn-ghost !px-3 !py-1" onClick={() => setStatus(r.id, 'draft')}><EyeOff className="h-3.5 w-3.5" />{t('unpublish')}</button> : r.status !== 'archived' ? <button className="btn btn-forest !px-3 !py-1" onClick={() => setStatus(r.id, 'published')}><Eye className="h-3.5 w-3.5" />{t('publish')}</button> : <button className="btn btn-ghost !px-3 !py-1" onClick={() => setStatus(r.id, 'draft')}>{t('restore')}</button>}
            {r.status !== 'archived' && <button className="btn btn-ghost !px-3 !py-1" onClick={() => setAsk({ id: r.id, kind: 'archive' })}><Archive className="h-3.5 w-3.5" />{t('archive')}</button>}<button className="btn btn-danger !px-3 !py-1" onClick={() => setAsk({ id: r.id, kind: 'delete' })}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>}
    <Confirm open={!!ask} title={ask?.kind === 'delete' ? t('delete') : t('archive')} text={ask?.kind === 'delete' ? t('delete_text') : t('archive_text')} onYes={doAsk} onNo={() => setAsk(null)} /></div>);
}
