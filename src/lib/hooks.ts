import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { CatalogTour } from './types';

export function useFavorites() {
  const { session } = useAuth(); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['favorites', session?.user.id], enabled: !!session, queryFn: async () => {
    const { data, error } = await supabase.from('favorites').select('tour_id'); if (error) throw error; return (data ?? []).map((r) => r.tour_id as string); } });
  const toggle = useCallback(async (id: string) => {
    if (!session) return false;
    const has = q.data?.includes(id);
    const { error } = has ? await supabase.from('favorites').delete().eq('tour_id', id).eq('user_id', session.user.id)
      : await supabase.from('favorites').insert({ tour_id: id, user_id: session.user.id });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['favorites'] }); return true;
  }, [session, q.data, qc]);
  return { ids: q.data ?? [], toggle };
}
const KEY = 'tl_compare';
export function useCompare() {
  const [ids, setIds] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; } });
  useEffect(() => { sessionStorage.setItem(KEY, JSON.stringify(ids)); }, [ids]);
  return { ids, toggle: (id: string) => setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? c : [...c, id])), clear: () => setIds([]) };
}
export interface Filters { q: string; country: string; city: string; agency: string; category: string; minPrice: string; maxPrice: string; minDays: string; maxDays: string; from: string; to: string; seats: string; rating: string; sort: string }
export const emptyFilters: Filters = { q: '', country: '', city: '', agency: '', category: '', minPrice: '', maxPrice: '', minDays: '', maxDays: '', from: '', to: '', seats: '', rating: '', sort: '' };
const n = (s: string) => (s === '' ? null : Number(s)); const e = (s: string) => (s === '' ? null : s);
export async function searchTours(f: Filters, limit = 60, offset = 0): Promise<CatalogTour[]> {
  const { data, error } = await supabase.rpc('search_tours', {
    p_q: e(f.q), p_country: e(f.country), p_city: e(f.city), p_agency: e(f.agency), p_category: e(f.category),
    p_min_price: n(f.minPrice), p_max_price: n(f.maxPrice), p_min_days: n(f.minDays), p_max_days: n(f.maxDays),
    p_from: e(f.from), p_to: e(f.to), p_min_seats: n(f.seats), p_min_rating: n(f.rating), p_sort: e(f.sort), p_limit: limit, p_offset: offset,
  });
  if (error) throw error; return (data ?? []) as CatalogTour[];
}
export const filtersFromParams = (p: URLSearchParams): Filters => ({ ...emptyFilters, ...Object.fromEntries([...p.entries()].filter(([k]) => k in emptyFilters)) });
