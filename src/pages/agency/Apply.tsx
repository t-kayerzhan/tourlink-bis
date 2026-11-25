import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Field, StatusBadge } from '../../components/ui';
import { useToast } from '../../lib/toast';

export default function Apply() {
  const { t } = useTranslation(); const { agency, session, refresh, role } = useAuth(); const nav = useNavigate(); const toast = useToast();
  const [f, setF] = useState({ name: '', description: '', email: session?.user.email ?? '' }); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  if (!session) { nav('/login', { state: { from: '/agency/apply' } }); return null; }
  if (role === 'admin') return <div className="mx-auto max-w-xl px-4 py-16 text-center text-mute">{t('admin_no_agency')}</div>;
  if (agency && agency.status !== 'rejected') return (
    <div className="mx-auto max-w-xl px-4 py-16"><div className="card space-y-3 p-8 text-center"><h1 className="text-4xl">{agency.name}</h1><StatusBadge s={agency.status} />
      <p className="text-mute">{t('apply_status_' + agency.status)}</p>{agency.status === 'approved' && <button className="btn btn-primary" onClick={() => nav('/agency/dashboard')}>{t('ag_dashboard')}</button>}</div></div>);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = z.object({ name: z.string().trim().min(2, t('v_name')).max(120), description: z.string().max(2000), email: z.string().trim().email(t('v_email')) }).safeParse(f);
    if (!r.success) { setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrs({}); setBusy(true);
    const { error } = await supabase.rpc('apply_agency', { p_name: r.data.name, p_description: r.data.description, p_email: r.data.email });
    setBusy(false); if (error) { toast.err(errMsg(error)); return; }
    toast.ok(t('applied_ok')); await refresh();
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-12"><form onSubmit={submit} className="card space-y-4 p-8" noValidate><h1 className="text-4xl">{t('nav_apply')}</h1><p className="text-sm text-mute">{agency?.status === 'rejected' ? t('apply_status_rejected') : t('apply_intro')}</p>
      <Field label={t('agency_name')} error={errs.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label={t('description')} error={errs.description}><textarea className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label={t('contact_email')} error={errs.email}><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <button className="btn btn-primary w-full" disabled={busy}>{t('submit')}</button></form></div>
  );
}
