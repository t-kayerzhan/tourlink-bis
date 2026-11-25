import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { Spinner } from './ui';

export function Denied() {
  const { t } = useTranslation();
  return (<div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="font-serif text-7xl text-terra">403</p><h1 className="mt-2 text-4xl">{t('denied_title')}</h1><p className="mt-2 text-mute">{t('denied_text')}</p><Link to="/" className="btn btn-primary mt-6">{t('go_home')}</Link></div>);
}
export function NotFound() {
  const { t } = useTranslation();
  return (<div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="font-serif text-7xl text-terra">404</p><h1 className="mt-2 text-4xl">{t('nf_title')}</h1><p className="mt-2 text-mute">{t('nf_text')}</p><Link to="/" className="btn btn-primary mt-6">{t('go_home')}</Link></div>);
}
// UX-only guard. Real enforcement is RLS + RPC checks in the database.
export function Require({ kind, children }: { kind: 'auth' | 'agency' | 'admin'; children: ReactNode }) {
  const { session, role, agency, loading } = useAuth(); const loc = useLocation();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (kind === 'admin' && role !== 'admin') return <Denied />;
  if (kind === 'agency' && !(agency?.status === 'approved') && role !== 'admin') return <Denied />;
  return <>{children}</>;
}
