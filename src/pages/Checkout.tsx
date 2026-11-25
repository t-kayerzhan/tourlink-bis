import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, ShieldAlert, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, errMsg } from '../lib/supabase';
import { payOf, type Booking } from '../lib/types';
import { kzt, fmtDate } from '../lib/format';
import { checkCard, formatCard, formatExpiry, type CardError } from '../lib/card';
import { Spinner, ErrorBox, Field } from '../components/ui';

const BOOKING_SELECT = '*, tour_dates(start_date,end_date,tour_id,tours(id,title,price_kzt,agencies(name))), demo_payments(status,processed_at,method_label,amount_kzt)';
export default function Checkout() {
  const { id = '' } = useParams(); const { t, i18n } = useTranslation(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['booking', id], queryFn: async () => { const { data, error } = await supabase.from('bookings').select(BOOKING_SELECT).eq('id', id).maybeSingle(); if (error) throw error; return data as Booking | null; } });
  // Card fields live ONLY in this component's state and are never sent anywhere.
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [err, setErr] = useState<CardError | null>(null); const [busy, setBusy] = useState(false); const [serverErr, setServerErr] = useState('');
  const [receipt, setReceipt] = useState(false);
  const clear = () => setCard({ name: '', number: '', expiry: '', cvv: '' });

  async function pay(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; // duplicate-click guard (server also rejects a second payment)
    setServerErr(''); const problem = checkCard(card); setErr(problem);
    if (problem) { if (problem === 'declined') clear(); return; }
    setBusy(true);
    const { error } = await supabase.rpc('simulate_payment', { p_booking_id: id }); // ONLY the booking id
    setBusy(false); clear();
    if (error) { setServerErr(errMsg(error)); await qc.invalidateQueries({ queryKey: ['booking', id] }); return; }
    setReceipt(true); await qc.invalidateQueries({ queryKey: ['booking', id] }); qc.invalidateQueries({ queryKey: ['my-bookings'] });
  }
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBox message={errMsg(q.error)} />;
  const b = q.data; if (!b) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-mute">{t('booking_nf')}</p></div>;
  const p = payOf(b); const paid = p?.status === 'paid_demo'; const tour = b.tour_dates.tours;
  const errText: Record<CardError, string> = { name: t('pay_e_name'), number: t('pay_e_number'), expiry: t('pay_e_expiry'), cvv: t('pay_e_cvv'), declined: t('pay_declined') };
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-dashed border-terra bg-terra/10 px-4 py-3 font-semibold text-terra" role="note"><ShieldAlert className="h-6 w-6 shrink-0" />{t('demo_banner')}</div>
      <div className="grid gap-6 md:grid-cols-[1fr_22rem]">
        {paid || receipt ? (
          <div className="card space-y-3 p-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-sage" /><h1 className="text-4xl">{t('pay_success')}</h1>
            <div className="mx-auto max-w-sm rounded-xl bg-sand p-4 text-left text-sm"><p className="mb-2 text-center font-semibold uppercase tracking-widest text-terra">{t('receipt_demo')}</p>
              <p>{t('ref')}: <code>{b.id.slice(0, 8).toUpperCase()}</code></p><p>{tour.title}</p><p>{fmtDate(b.tour_dates.start_date, i18n.language)}</p><p>{t('total')}: {kzt(b.total_kzt, i18n.language)}</p><p>{p?.method_label}</p><p>{fmtDate(p?.processed_at, i18n.language)}</p></div>
            <p className="text-xs text-mute">{t('demo_banner')}</p>
            <div className="flex justify-center gap-2"><Link className="btn btn-primary" to="/my-bookings">{t('nav_bookings')}</Link><Link className="btn btn-ghost" to="/tours">{t('nav_tours')}</Link></div></div>
        ) : b.status === 'cancelled' ? (
          <div className="card p-8 text-center"><XCircle className="mx-auto h-12 w-12 text-terra" /><p className="mt-2">{t('booking_cancelled_msg')}</p></div>
        ) : (
          <form onSubmit={pay} className="card space-y-4 p-6" noValidate autoComplete="off">
            <h1 className="flex items-center gap-2 text-4xl"><CreditCard className="h-7 w-7 text-terra" />{t('checkout')}</h1>
            <div className="rounded-xl bg-sage/25 p-3 text-sm"><p className="font-semibold">{t('test_cards')}</p><p><code>4242 4242 4242 4242</code> — {t('test_ok')} · <code>4000 0000 0000 0002</code> — {t('test_fail')}</p><p className="text-xs text-mute">{t('test_hint')}</p></div>
            <Field label={t('card_name')}><input className="input" autoComplete="off" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="TEST USER" /></Field>
            <Field label={t('card_number')}><input className="input" inputMode="numeric" autoComplete="off" value={card.number} onChange={(e) => setCard({ ...card, number: formatCard(e.target.value) })} placeholder="4242 4242 4242 4242" /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label={t('card_expiry')}><input className="input" inputMode="numeric" autoComplete="off" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })} placeholder="MM/YY" /></Field>
              <Field label="CVV"><input className="input" inputMode="numeric" autoComplete="off" type="password" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '') })} placeholder="123" /></Field></div>
            {err && <p className="flex items-center gap-2 rounded-xl bg-terra/10 p-3 text-sm text-terra" role="alert"><XCircle className="h-4 w-4" />{errText[err]}</p>}
            {serverErr && <p className="rounded-xl bg-terra/10 p-3 text-sm text-terra" role="alert">{serverErr}</p>}
            <button className="btn btn-primary w-full" disabled={busy}><Lock className="h-4 w-4" />{busy ? t('processing') : `${t('pay')} ${kzt(b.total_kzt, i18n.language)}`}</button>
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-terra">{t('demo_banner')}</p>
            <p className="text-center text-xs text-mute">{t('no_card_stored')}</p>
          </form>
        )}
        <aside className="card h-fit space-y-2 p-5 text-sm"><h2 className="text-2xl">{t('summary')}</h2><p className="font-medium">{tour.title}</p><p className="text-mute">{tour.agencies.name}</p><p>{fmtDate(b.tour_dates.start_date, i18n.language)}</p>
          <div className="space-y-1 border-t border-sand pt-2"><div className="flex justify-between"><span>{kzt(tour.price_kzt, i18n.language)} × {b.participants_count}</span><span>{kzt(Number(b.total_kzt) + Number(b.discount_kzt), i18n.language)}</span></div>
            {Number(b.discount_kzt) > 0 && <div className="flex justify-between text-sage"><span>{t('discount')}</span><span>−{kzt(b.discount_kzt, i18n.language)}</span></div>}
            <div className="flex justify-between font-serif text-2xl"><span>{t('total')}</span><span>{kzt(b.total_kzt, i18n.language)}</span></div></div></aside>
      </div>
    </div>
  );
}
