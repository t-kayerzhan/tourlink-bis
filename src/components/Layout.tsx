import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Sun, X, Mountain, LogOut, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { supabase, isConfigured } from '../lib/supabase';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { session, role, agency, signOut, profile } = useAuth();
  const { dark, toggle } = useTheme(); const nav = useNavigate(); const [open, setOpen] = useState(false);
  const unread = useQuery({ queryKey: ['unread', session?.user.id], enabled: !!session, refetchInterval: 30000, queryFn: async () => {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false); return count ?? 0; } });
  const setLang = async (l: 'en' | 'ru') => { await i18n.changeLanguage(l); localStorage.setItem('tl_lang', l); if (session) await supabase.from('profiles').update({ preferred_language: l }).eq('id', session.user.id); };
  const link = 'rounded-full px-3 py-1.5 text-sm transition hover:bg-sand';
  const cls = ({ isActive }: { isActive: boolean }) => `${link} ${isActive ? 'bg-sand font-semibold' : ''}`;
  const items = [
    <NavLink key="t" to="/tours" className={cls} onClick={() => setOpen(false)}>{t('nav_tours')}</NavLink>,
    <NavLink key="m" to="/explore-map" className={cls} onClick={() => setOpen(false)}>{t('nav_map')}</NavLink>,
    <NavLink key="d" to="/destinations" className={cls} onClick={() => setOpen(false)}>{t('nav_destinations')}</NavLink>,
    <NavLink key="q" to="/quiz" className={cls} onClick={() => setOpen(false)}>{t('nav_quiz')}</NavLink>,
    <NavLink key="a" to="/about" className={cls} onClick={() => setOpen(false)}>{t('nav_about')}</NavLink>,
  ];
  return (
    <div className="flex min-h-screen flex-col">
      {!isConfigured && <div className="bg-terra px-4 py-2 text-center text-sm text-white">{t('not_configured')}</div>}
      <header className="sticky top-0 z-[1500] border-b border-sand bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-forest dark:text-cream"><Mountain className="h-6 w-6 text-terra" />TourLink</Link>
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">{items}</nav>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="btn btn-ghost !px-3" onClick={() => setLang(i18n.language === 'ru' ? 'en' : 'ru')} aria-label="Language"><Languages className="h-4 w-4" />{i18n.language === 'ru' ? 'RU' : 'EN'}</button>
            <button className="btn btn-ghost !px-3" onClick={toggle} aria-label={t('theme')}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            {session && <Link to="/notifications" className="btn btn-ghost relative !px-3" aria-label={t('nav_notifications')}><Bell className="h-4 w-4" />{!!unread.data && <span className="absolute -right-1 -top-1 rounded-full bg-terra px-1.5 text-[10px] text-white">{unread.data}</span>}</Link>}
            {session ? (
              <div className="hidden items-center gap-1 lg:flex">
                {role === 'admin' && <Link className="btn btn-forest" to="/admin">{t('nav_admin')}</Link>}
                {agency?.status === 'approved' && <Link className="btn btn-forest" to="/agency/dashboard">{t('nav_agency')}</Link>}
                {role !== 'admin' && !agency && <Link className="btn btn-ghost" to="/agency/apply">{t('nav_apply')}</Link>}
                {agency && agency.status !== 'approved' && <Link className="btn btn-ghost" to="/agency/apply">{t('nav_apply')}</Link>}
                <Link className="btn btn-ghost" to="/my-bookings">{t('nav_bookings')}</Link>
                <Link className="btn btn-ghost" to="/profile">{profile?.full_name || t('nav_profile')}</Link>
                <button className="btn btn-ghost !px-3" onClick={async () => { await signOut(); nav('/'); }} aria-label={t('logout')}><LogOut className="h-4 w-4" /></button>
              </div>
            ) : (<div className="hidden gap-1 lg:flex"><Link className="btn btn-ghost" to="/login">{t('login')}</Link><Link className="btn btn-primary" to="/signup">{t('signup')}</Link></div>)}
            <button className="btn btn-ghost !px-3 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        {open && (
          <div className="flex flex-col gap-1 border-t border-sand px-4 py-3 lg:hidden">
            {items}
            {session ? (<>
              <NavLink className={cls} to="/my-bookings" onClick={() => setOpen(false)}>{t('nav_bookings')}</NavLink>
              <NavLink className={cls} to="/favorites" onClick={() => setOpen(false)}>{t('nav_favorites')}</NavLink>
              <NavLink className={cls} to="/profile" onClick={() => setOpen(false)}>{t('nav_profile')}</NavLink>
              {agency?.status === 'approved' && <NavLink className={cls} to="/agency/dashboard" onClick={() => setOpen(false)}>{t('nav_agency')}</NavLink>}
              {role === 'admin' && <NavLink className={cls} to="/admin" onClick={() => setOpen(false)}>{t('nav_admin')}</NavLink>}
              {role !== 'admin' && agency?.status !== 'approved' && <NavLink className={cls} to="/agency/apply" onClick={() => setOpen(false)}>{t('nav_apply')}</NavLink>}
              <button className={`${link} text-left`} onClick={async () => { await signOut(); setOpen(false); nav('/'); }}>{t('logout')}</button>
            </>) : (<><NavLink className={cls} to="/login" onClick={() => setOpen(false)}>{t('login')}</NavLink><NavLink className={cls} to="/signup" onClick={() => setOpen(false)}>{t('signup')}</NavLink></>)}
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="section-dark mt-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-3">
          <div><p className="font-serif text-3xl">TourLink</p><p className="mt-2 text-sm opacity-80">{t('footer_tag')}</p></div>
          <div className="text-sm opacity-90"><Link className="block py-0.5 hover:underline" to="/tours">{t('nav_tours')}</Link><Link className="block py-0.5 hover:underline" to="/explore-map">{t('nav_map')}</Link><Link className="block py-0.5 hover:underline" to="/about">{t('nav_about')}</Link></div>
          <p className="text-xs opacity-70">{t('footer_demo')}</p>
        </div>
      </footer>
    </div>
  );
}
