import { createClient } from '@supabase/supabase-js';
const url = 'https://ydmfqsyozgvjlziajblf.supabase.co';
const key = 'sb_publishable_h7k0JGv-JMuuOXKQogHuOQ_glW0pDxG';
export const isConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'));
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
});
export const imageUrl = (path?: string | null) =>
  path ? supabase.storage.from('tour-images').getPublicUrl(path).data.publicUrl : null;
export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
