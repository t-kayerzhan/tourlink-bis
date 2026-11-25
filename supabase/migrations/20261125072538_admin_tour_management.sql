/*
# Admin tour photo management in Storage

## Purpose
Administrators can already edit any tour's DB rows (RLS policies on tours, tour_images,
itinerary_steps, and tour_dates all include `is_admin()`). However the Storage object
policies for the `tour-images` bucket delegate authorization to `storage_folder_owned()`,
which only checked `owns_agency()`. That blocked admins from uploading, deleting, or
replacing photo files — including for seeded demo agencies whose `owner_id` is null.

## Changes
1. Replace `storage_folder_owned(text)` so it returns true when the folder UUID belongs
   to an agency the caller owns OR the caller is an admin. This is a strict superset of
   the previous behavior — agencies are unaffected, admins gain access.
2. The three Storage policies (`tour_images_upload`, `tour_images_owner_delete`,
   `tour_images_owner_update`) already call `storage_folder_owned(name)`, so no policy
   changes are needed; they pick up the new function definition automatically.

## Security
- RLS remains enabled everywhere. No policies are dropped or weakened for non-admins.
- `is_admin()` is a SECURITY DEFINER function that checks `user_roles` for role='admin'.
- Admin Storage access is scoped to the `tour-images` bucket only (existing policies).
- Demo agencies with null owner_id remain unowned by any user; only admins can manage
  their tours and now their photos.
*/

create or replace function public.storage_folder_owned(p_name text) returns boolean
 language sql stable security definer set search_path='' as $$
 select case when split_part(p_name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   then public.owns_agency(split_part(p_name,'/',1)::uuid) or public.is_admin() else false end;
$$;
