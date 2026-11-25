import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Agency, Profile, Role } from './types';
import i18n from '../i18n';

interface Ctx { session: Session | null; profile: Profile | null; role: Role | null; agency: Agency | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(s: Session | null) {
    if (!s) { setProfile(null); setRole(null); setAgency(null); return; }
    const [p, r, a] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', s.user.id).maybeSingle(),
      supabase.from('agencies').select('*').eq('owner_id', s.user.id).maybeSingle(),
    ]);
    setProfile(p.data as Profile | null); setRole((r.data?.role as Role) ?? 'tourist'); setAgency(a.data as Agency | null);
    if (p.data?.preferred_language && !localStorage.getItem('tl_lang')) i18n.changeLanguage(p.data.preferred_language);
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setTimeout(() => load(s), 0); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <AuthCtx.Provider value={{ session, profile, role, agency, loading, refresh: () => load(session), signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </AuthCtx.Provider>
  );
}
