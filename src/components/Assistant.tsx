import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';

interface Msg { role: 'user' | 'assistant'; text: string }
/** Calls the `ai-assistant` Edge Function. The provider key lives only in Supabase secrets. */
export function AssistantWidget({ tourId }: { tourId?: string }) {
  const { t, i18n } = useTranslation(); const { session } = useAuth(); const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const end = useRef<HTMLDivElement>(null);
  const status = useQuery({ queryKey: ['ai-status'], enabled: open && !!session, staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { action: 'status' } }); if (error) return { configured: false, reason: 'unreachable' }; return data as { configured: boolean; reason?: string }; } });
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
  async function send(e: React.FormEvent) {
    e.preventDefault(); const m = text.trim(); if (!m || busy) return;
    setMsgs((x) => [...x, { role: 'user', text: m }]); setText(''); setBusy(true); setError('');
    const { data, error: er } = await supabase.functions.invoke('ai-assistant', { body: { action: 'chat', message: m, tourId, lang: i18n.language, history: msgs.slice(-6) } });
    setBusy(false);
    if (er || !data?.reply) { setError(data?.error || t('ai_error')); return; }
    setMsgs((x) => [...x, { role: 'assistant', text: String(data.reply) }]);
  }
  return (
    <>
      <button className="fixed bottom-4 right-4 z-[1400] flex items-center gap-2 rounded-full bg-forest px-4 py-3 text-cream shadow-soft transition hover:-translate-y-0.5" onClick={() => setOpen(!open)} aria-label={t('ai_title')}><Bot className="h-5 w-5" />{t('ai_title')}</button>
      {open && (
        <section className="card fixed bottom-20 right-4 z-[1400] flex h-[30rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden" aria-label={t('ai_title')}>
          <header className="section-dark flex items-center justify-between px-4 py-3"><div><p className="font-serif text-xl">{t('ai_title')}</p><p className="text-xs opacity-75">{t('ai_sub')}</p></div><button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></header>
          {!session ? <div className="p-5 text-sm"><p>{t('ai_login')}</p><Link className="btn btn-primary mt-3" to="/login">{t('login')}</Link></div>
            : status.isLoading ? <p className="p-5 text-sm text-mute">…</p>
            : !status.data?.configured ? <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm"><AlertCircle className="h-8 w-8 text-terra" /><p className="font-semibold">{t('ai_unavailable')}</p><p className="text-mute">{t('ai_unavailable_t')}</p></div>
            : (<>
              <div className="flex-1 space-y-2 overflow-auto p-3 text-sm">
                {!msgs.length && <p className="text-mute">{tourId ? t('ai_hint_tour') : t('ai_hint')}</p>}
                {msgs.map((m, i) => <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-terra text-white' : 'bg-sand'}`}>{m.text}</p>)}
                {busy && <p className="text-mute">…</p>}{error && <p className="text-terra" role="alert">{error}</p>}<div ref={end} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-sand p-2"><input className="input" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={t('ai_ph')} /><button className="btn btn-primary !px-3" disabled={busy} aria-label={t('send')}><Send className="h-4 w-4" /></button></form>
              <p className="px-3 pb-2 text-[11px] text-mute">{t('ai_disclaimer')}</p></>)}
        </section>
      )}
    </>
  );
}
