import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../lib/supabase';
import { Field } from '../components/ui';
import { useToast } from '../lib/toast';

export function Login() {
  const { t } = useTranslation(); const nav = useNavigate(); const loc = useLocation(); const toast = useToast();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!z.string().email().safeParse(email).success || password.length < 1) { setError(t('v_credentials')); return; }
    setBusy(true);
    const { error: er } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (er) { setError(er.message); return; }
    toast.ok(t('welcome_back')); nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true });
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="card space-y-4 p-8" noValidate>
        <h1 className="text-4xl">{t('login')}</h1>
        <Field label={t('email')}><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t('password')}><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="text-sm text-terra" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : t('login')}</button>
        <p className="text-center text-sm text-mute">{t('no_account')} <Link className="underline" to="/signup">{t('signup')}</Link></p>
      </form>
    </div>
  );
}
export function Signup() {
  const { t } = useTranslation(); const nav = useNavigate(); const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', password: '' }); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const schema = z.object({ name: z.string().trim().min(2, t('v_name')).max(80), email: z.string().trim().email(t('v_email')), password: z.string().min(8, t('v_password')) });
    const r = schema.safeParse(f);
    if (!r.success) { setErrs(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrs({}); setBusy(true);
    // The role is NOT sent from the client: the DB trigger always creates a tourist.
    const { data, error } = await supabase.auth.signUp({ email: r.data.email, password: r.data.password, options: { data: { full_name: r.data.name } } });
    setBusy(false);
    if (error) { toast.err(errMsg(error)); return; }
    if (data.session) { toast.ok(t('account_created')); nav('/'); } else setSent(true);
  }
  if (sent) return <div className="mx-auto max-w-md px-4 py-16"><div className="card p-8 text-center"><h1 className="text-4xl">{t('check_email')}</h1><p className="mt-2 text-mute">{t('check_email_text')}</p></div></div>;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={submit} className="card space-y-4 p-8" noValidate>
        <h1 className="text-4xl">{t('signup')}</h1>
        <Field label={t('full_name')} error={errs.name}><input className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label={t('email')} error={errs.email}><input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label={t('password')} error={errs.password}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? '…' : t('signup')}</button>
        <p className="text-center text-sm text-mute">{t('have_account')} <Link className="underline" to="/login">{t('login')}</Link></p>
      </form>
    </div>
  );
}
