import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Map, CalendarDays, ClipboardList, Users, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export function AgencyShell() {
  const { t } = useTranslation();
  const items = [['/agency/dashboard', LayoutDashboard, 'ag_dashboard'], ['/agency/tours', Map, 'ag_tours'], ['/agency/calendar', CalendarDays, 'ag_calendar'], ['/agency/bookings', ClipboardList, 'ag_bookings'], ['/agency/customers', Users, 'ag_customers'], ['/agency/analytics', BarChart3, 'ag_analytics']] as const;
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[14rem_1fr]">
      <nav className="card flex gap-1 overflow-x-auto p-2 lg:h-fit lg:flex-col" aria-label="Agency">{items.map(([to, I, k]) => <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-forest text-cream' : 'hover:bg-sand'}`}><I className="h-4 w-4" />{t(k)}</NavLink>)}</nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
