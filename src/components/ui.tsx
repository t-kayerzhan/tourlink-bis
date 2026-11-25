import { useEffect, type ReactNode } from 'react';
import { Loader2, X, AlertTriangle, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BookingStatus, PaymentStatus } from '../lib/types';

export const Spinner = ({ label }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-mute" role="status"><Loader2 className="h-5 w-5 animate-spin" /> {label}</div>
);
export const Empty = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center"><SearchX className="h-10 w-10 text-sage" /><p className="font-serif text-2xl">{title}</p>{hint && <p className="max-w-md text-sm text-mute">{hint}</p>}{action}</div>
);
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => {
  const { t } = useTranslation();
  return (<div className="card flex items-start gap-3 border-terra/50 p-4" role="alert"><AlertTriangle className="h-5 w-5 shrink-0 text-terra" /><div className="text-sm"><p>{message}</p>{onRetry && <button className="mt-2 underline" onClick={onRetry}>{t('retry')}</button>}</div></div>);
};
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (<div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-4xl md:text-5xl">{title}</h1>{sub && <p className="mt-1 text-mute">{sub}</p>}</div>{right}</div>);
}
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="card max-h-[90vh] w-full max-w-lg overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4"><h2 className="text-2xl">{title}</h2><button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}
export function Confirm({ open, title, text, onYes, onNo, danger = true }: { open: boolean; title: string; text: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  const { t } = useTranslation();
  return (<Modal open={open} onClose={onNo} title={title}><p className="mb-5 text-sm text-mute">{text}</p><div className="flex justify-end gap-2"><button className="btn btn-ghost" onClick={onNo}>{t('cancel')}</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onYes}>{t('confirm')}</button></div></Modal>);
}
export const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="block"><span className="label">{label}</span>{children}{error && <span className="mt-1 block text-xs text-terra" role="alert">{error}</span>}</label>
);
const tone: Record<string, string> = {
  pending: 'bg-[#f1deb5] text-[#6b4b0a]', confirmed: 'bg-sage/40 text-forest dark:text-cream', completed: 'bg-forest text-cream', cancelled: 'bg-terra/20 text-terra',
  unpaid: 'bg-sand text-mute', paid_demo: 'bg-sage/40 text-forest dark:text-cream', refunded_demo: 'bg-terra/20 text-terra',
  approved: 'bg-sage/40 text-forest dark:text-cream', rejected: 'bg-terra/20 text-terra', suspended: 'bg-terra/20 text-terra',
  published: 'bg-sage/40 text-forest dark:text-cream', draft: 'bg-sand text-mute', archived: 'bg-sand text-mute',
};
export function StatusBadge({ s }: { s: BookingStatus | PaymentStatus | string }) {
  const { t } = useTranslation();
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[s] ?? 'bg-sand'}`}>{t('st_' + s)}</span>;
}
export function Pager({ page, setPage, hasNext }: { page: number; setPage: (n: number) => void; hasNext: boolean }) {
  const { t } = useTranslation();
  return (<div className="mt-4 flex items-center justify-end gap-2 text-sm"><button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('prev')}</button><span>{page + 1}</span><button className="btn btn-ghost" disabled={!hasNext} onClick={() => setPage(page + 1)}>{t('next')}</button></div>);
}
