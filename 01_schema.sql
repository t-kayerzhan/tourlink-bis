-- TourLink BIS | PostgreSQL/Supabase schema | 2026-11-24
-- Run on a NEW Supabase project in SQL Editor, before 02_seed.sql.
-- SECURITY: no real card number, CVV, or expiry fields exist anywhere.
create extension if not exists pgcrypto;

create type public.app_role as enum ('tourist','agency','admin');
create type public.agency_status as enum ('pending','approved','rejected','suspended');
create type public.tour_status as enum ('draft','published','archived');
create type public.booking_status as enum ('pending','confirmed','cancelled','completed');
create type public.payment_status as enum ('unpaid','paid_demo','refunded_demo');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 preferred_language text not null default 'en' check (preferred_language in ('en','ru')),
 theme text not null default 'light' check(theme in ('light','dark')),
 created_at timestamptz not null default now()
);
-- Separated from profiles so clients cannot promote themselves.
create table public.user_roles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 role public.app_role not null default 'tourist'
);
create table public.agencies (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid unique references public.profiles(id),
 name text not null,
 description text not null default '',
 contact_email text,
 status public.agency_status not null default 'pending',
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.destinations (
 id uuid primary key default gen_random_uuid(),
 country text not null,
 city text not null,
 region text not null default '',
 latitude numeric(9,6) check(latitude between -90 and 90),
 longitude numeric(9,6) check(longitude between -180 and 180),
 unique(country,city,region)
);
create table public.tours (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id) on delete restrict,
 destination_id uuid not null references public.destinations(id) on delete restrict,
 title text not null,
 description text not null default '',
 category text not null check(category in ('nature','adventure','culture','family','relaxation','city')),
 duration_days int not null check(duration_days between 1 and 90),
 price_kzt numeric(12,2) not null check(price_kzt >= 0),
 status public.tour_status not null default 'draft',
 meeting_point text,
 latitude numeric(9,6) check(latitude between -90 and 90),
 longitude numeric(9,6) check(longitude between -180 and 180),
 included text not null default '',
 excluded text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.tour_images (
 id uuid primary key default gen_random_uuid(),
 tour_id uuid not null references public.tours(id) on delete cascade,
 storage_path text not null,
 alt_text text not null default '',
 position int not null default 0 check(position >= 0),
 unique(tour_id,storage_path)
);
create table public.tour_dates (
 id uuid primary key default gen_random_uuid(),
 tour_id uuid not null references public.tours(id) on delete cascade,
 start_date date not null,
 end_date date not null,
 capacity int not null check(capacity > 0),
 active boolean not null default true,
 check(end_date >= start_date),
 unique(tour_id,start_date)
);
create table public.itinerary_steps (
 id uuid primary key default gen_random_uuid(),
 tour_id uuid not null references public.tours(id) on delete cascade,
 day_number int not null default 1 check(day_number >= 1),
 step_order int not null default 1 check(step_order >= 1),
 start_time time,
 title text not null,
 details text not null default '',
 latitude numeric(9,6), longitude numeric(9,6),
 unique(tour_id,day_number,step_order)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(),
 tour_date_id uuid not null references public.tour_dates(id) on delete restrict,
 tourist_id uuid references public.profiles(id) on delete set null,
 created_by_agency_id uuid references public.agencies(id),
 guest_name text,
 guest_email text,
 participants_count int not null check(participants_count between 1 and 30),
 total_kzt numeric(12,2) not null check(total_kzt >= 0),
 status public.booking_status not null default 'pending',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(tourist_id is not null or (guest_name is not null and guest_email is not null))
);
create table public.booking_participants (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 full_name text not null,
 contact_phone text,
 unique(booking_id,full_name)
);
create table public.demo_payments (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null unique references public.bookings(id) on delete cascade,
 amount_kzt numeric(12,2) not null check(amount_kzt >= 0),
 status public.payment_status not null default 'unpaid',
 method_label text not null default 'Simulation',
 processed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.favorites (
 user_id uuid not null references public.profiles(id) on delete cascade,
 tour_id uuid not null references public.tours(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,tour_id)
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 tour_id uuid not null references public.tours(id) on delete cascade,
 rating int not null check(rating between 1 and 5),
 comment text not null default '',
 is_visible boolean not null default true,
 created_at timestamptz not null default now(),
 unique(user_id,tour_id)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null, message text not null,
 is_read boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigserial primary key,
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.ai_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.ai_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
 sender text not null check(sender in ('user','assistant')),
 content text not null,
 created_at timestamptz not null default now()
);
create table public.promo_codes (
 id uuid primary key default gen_random_uuid(),
 agency_id uuid not null references public.agencies(id) on delete cascade,
 code text not null unique,
 discount_percent int not null check(discount_percent between 1 and 80),
 expires_on date,
 active boolean not null default true
);

create index tours_search on public.tours(destination_id,category,status,price_kzt);
create index tours_agency on public.tours(agency_id);
create index tour_dates_lookup on public.tour_dates(tour_id,start_date);
create index bookings_by_date on public.bookings(tour_date_id,status);
create index bookings_by_tourist on public.bookings(tourist_id,created_at desc);
create index reviews_by_tour on public.reviews(tour_id,is_visible);
create index notifications_by_user on public.notifications(user_id,created_at desc);

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin');
$$;
create function public.owns_agency(p_agency_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.agencies a where a.id=p_agency_id and a.owner_id=(select auth.uid()) and a.status='approved');
$$;
create function public.manages_tour(p_tour_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tours t join public.agencies a on a.id=t.agency_id
 where t.id=p_tour_id and a.owner_id=(select auth.uid()) and a.status='approved');
$$;
create function public.can_manage_booking(p_booking_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bookings b join public.tour_dates d on d.id=b.tour_date_id
 join public.tours t on t.id=d.tour_id join public.agencies a on a.id=t.agency_id
 where b.id=p_booking_id and a.owner_id=(select auth.uid()) and a.status='approved');
$$;

-- New accounts receive a profile and the tourist role. Admin promotion is NEVER taken from user metadata.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
 insert into public.user_roles(user_id,role) values(new.id,'tourist');
 return new;
end $$;
create trigger new_user_profile after insert on auth.users for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger touch_tour before update on public.tours for each row execute function public.touch_updated_at();
create trigger touch_booking before update on public.bookings for each row execute function public.touch_updated_at();

-- Immutable ownership: no agency can change a tour's owner; no user can edit role via profiles.
create function public.prevent_tour_reassignment() returns trigger language plpgsql set search_path='' as $$
begin
 if new.agency_id<>old.agency_id then raise exception 'Tour agency cannot be changed'; end if;
 return new;
end $$;
create trigger tour_fixed_agency before update on public.tours for each row execute function public.prevent_tour_reassignment();

-- Booking capacity is a database rule, not a client-side number.
-- PENDING and CONFIRMED reservations consume seats; cancelled ones release seats.
create function public.available_seats(p_date_id uuid) returns integer language sql stable security definer set search_path='' as $$
 select greatest(0,d.capacity - coalesce((select sum(b.participants_count)::int from public.bookings b
 where b.tour_date_id=d.id and b.status in ('pending','confirmed','completed')),0))
 from public.tour_dates d where d.id=p_date_id;
$$;
create function public.create_booking(p_date_id uuid,p_participants int) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_tour record; v_id uuid; v_free int;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if p_participants < 1 or p_participants > 30 then raise exception 'Invalid participants'; end if;
 select d.id, d.active, d.start_date, t.price_kzt, t.status into v_tour
 from public.tour_dates d join public.tours t on t.id=d.tour_id
 join public.agencies a on a.id=t.agency_id
 where d.id=p_date_id and a.status='approved' for update of d;
 if not found or not v_tour.active or v_tour.status<>'published' or v_tour.start_date<current_date
 then raise exception 'Tour date unavailable'; end if;
 select public.available_seats(p_date_id) into v_free;
 if v_free < p_participants then raise exception 'Not enough available seats'; end if;
 insert into public.bookings(tour_date_id,tourist_id,participants_count,total_kzt)
 values(p_date_id,auth.uid(),p_participants,v_tour.price_kzt*p_participants) returning id into v_id;
 insert into public.demo_payments(booking_id,amount_kzt) values(v_id,v_tour.price_kzt*p_participants);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id)
 values(auth.uid(),'booking.created','booking',v_id);
 return v_id;
end $$;

create function public.manual_booking(p_date_id uuid,p_guest_name text,p_guest_email text,p_participants int)
 returns uuid language plpgsql security definer set search_path='' as $$
declare v_agency uuid; v_price numeric; v_id uuid; v_capacity int; v_start date; v_active boolean; v_status public.tour_status;
begin
 if p_participants not between 1 and 30 or length(trim(coalesce(p_guest_name,'')))=0
 or position('@' in coalesce(p_guest_email,''))=0 then raise exception 'Invalid guest information'; end if;
 select t.agency_id,t.price_kzt,d.capacity,d.start_date,d.active,t.status
 into v_agency,v_price,v_capacity,v_start,v_active,v_status
 from public.tour_dates d join public.tours t on t.id=d.tour_id
 where d.id=p_date_id for update of d;
 if not found or not public.owns_agency(v_agency) or v_start<current_date or not v_active or v_status<>'published'
 then raise exception 'Not permitted or tour unavailable'; end if;
 if public.available_seats(p_date_id)<p_participants then raise exception 'Not enough seats'; end if;
 insert into public.bookings(tour_date_id,created_by_agency_id,guest_name,guest_email,participants_count,total_kzt)
 values(p_date_id,v_agency,trim(p_guest_name),trim(p_guest_email),p_participants,v_price*p_participants) returning id into v_id;
 insert into public.demo_payments(booking_id,amount_kzt) values(v_id,v_price*p_participants);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'booking.manual','booking',v_id);
 return v_id;
end $$;

create function public.change_booking_status(p_booking_id uuid,p_new_status public.booking_status)
 returns void language plpgsql security definer set search_path='' as $$
declare v_book record; v_date uuid;
begin
 -- Lock associated date first so capacity changes/booking changes serialize.
 select tour_date_id into v_date from public.bookings where id=p_booking_id;
 if not found then raise exception 'Booking not found'; end if;
 perform 1 from public.tour_dates where id=v_date for update;
 select * into v_book from public.bookings where id=p_booking_id for update;
 if v_book.status in ('cancelled','completed') then raise exception 'Booking is final'; end if;
 if p_new_status='cancelled' then
   if v_book.tourist_id is distinct from auth.uid() and not public.can_manage_booking(p_booking_id) and not public.is_admin()
   then raise exception 'Permission denied'; end if;
 elsif p_new_status in ('confirmed','completed') then
   if not public.can_manage_booking(p_booking_id) and not public.is_admin() then raise exception 'Permission denied'; end if;
   if p_new_status='completed' and v_book.status<>'confirmed' then raise exception 'Confirm first'; end if;
 else raise exception 'Unsupported status transition'; end if;
 update public.bookings set status=p_new_status where id=p_booking_id;
 if p_new_status='cancelled' then
  update public.demo_payments set status='refunded_demo',method_label='DEMO refund - no real money',processed_at=now()
  where booking_id=p_booking_id and status='paid_demo';
 end if;
 if v_book.tourist_id is not null then
  insert into public.notifications(user_id,title,message)
  values(v_book.tourist_id,'Booking update','Your booking status is now '||p_new_status::text);
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'booking.status','booking',p_booking_id,jsonb_build_object('from',v_book.status,'to',p_new_status));
end $$;

-- DEMO ONLY: no charge is made; NEVER accept card number, CVC or expiry as RPC input.
create function public.simulate_payment(p_booking_id uuid) returns void
 language plpgsql security definer set search_path='' as $$
declare v_b record;
begin
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or v_b.tourist_id is distinct from auth.uid() or v_b.status='cancelled'
 then raise exception 'Payment not allowed'; end if;
 update public.demo_payments set status='paid_demo',processed_at=now(),method_label='DEMO ONLY - no real charge'
 where booking_id=p_booking_id and status='unpaid';
 if not found then raise exception 'Already processed or missing payment'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id)
 values(auth.uid(),'payment.simulated','booking',p_booking_id);
end $$;

create function public.apply_agency(p_name text,p_description text,p_email text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or length(trim(coalesce(p_name,'')))<2 then raise exception 'Invalid application'; end if;
 if exists(select 1 from public.agencies where owner_id=auth.uid()) then raise exception 'Agency already exists'; end if;
 insert into public.agencies(owner_id,name,description,contact_email,status)
 values(auth.uid(),trim(p_name),coalesce(p_description,''),p_email,'pending') returning id into v_id;
 return v_id;
end $$;
create function public.review_agency(p_agency_id uuid,p_approve boolean) returns void
 language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 select owner_id into v_owner from public.agencies where id=p_agency_id for update;
 if not found then raise exception 'Agency not found'; end if;
 update public.agencies set status=case when p_approve then 'approved'::public.agency_status else 'rejected'::public.agency_status end,
 verified_at=case when p_approve then now() else null end where id=p_agency_id;
 if p_approve and v_owner is not null then
  update public.user_roles set role='agency' where user_id=v_owner and role<>'admin';
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id)
 values(auth.uid(),case when p_approve then 'agency.approved' else 'agency.rejected' end,'agency',p_agency_id);
end $$;

-- Enforce database-level access. Note: admin access to profiles is read-only from browser.
do $$ declare r record; begin
 for r in select tablename from pg_tables where schemaname='public' and tablename in (
 'profiles','user_roles','agencies','destinations','tours','tour_images','tour_dates','itinerary_steps',
 'bookings','booking_participants','demo_payments','favorites','reviews','notifications','audit_logs',
 'ai_conversations','ai_messages','promo_codes') loop
 execute format('alter table public.%I enable row level security',r.tablename);
 end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy agencies_read on public.agencies for select to anon,authenticated using(status='approved' or owner_id=(select auth.uid()) or public.is_admin());
create policy agencies_admin_update on public.agencies for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy destinations_read on public.destinations for select to anon,authenticated using(true);
create policy destinations_admin_insert on public.destinations for insert to authenticated with check(public.is_admin());
create policy destinations_admin_update on public.destinations for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy destinations_admin_delete on public.destinations for delete to authenticated using(public.is_admin());
create policy tours_read on public.tours for select to anon,authenticated using((status='published' and exists(select 1 from public.agencies a where a.id=agency_id and a.status='approved')) or public.owns_agency(agency_id) or public.is_admin());
create policy tours_insert on public.tours for insert to authenticated with check(public.owns_agency(agency_id) or public.is_admin());
create policy tours_update on public.tours for update to authenticated using(public.owns_agency(agency_id) or public.is_admin()) with check(public.owns_agency(agency_id) or public.is_admin());
create policy tours_delete on public.tours for delete to authenticated using(public.owns_agency(agency_id) or public.is_admin());
create policy dates_read on public.tour_dates for select to anon,authenticated using(exists(select 1 from public.tours t where t.id=tour_id and (t.status='published' or public.manages_tour(t.id) or public.is_admin())));
create policy dates_insert on public.tour_dates for insert to authenticated with check(public.manages_tour(tour_id) or public.is_admin());
create policy dates_update on public.tour_dates for update to authenticated using(public.manages_tour(tour_id) or public.is_admin()) with check(public.manages_tour(tour_id) or public.is_admin());
create policy dates_delete on public.tour_dates for delete to authenticated using(public.manages_tour(tour_id) or public.is_admin());
create policy images_read on public.tour_images for select to anon,authenticated using(exists(select 1 from public.tours t where t.id=tour_id and (t.status='published' or public.manages_tour(t.id) or public.is_admin())));
create policy images_insert on public.tour_images for insert to authenticated with check(public.manages_tour(tour_id) or public.is_admin());
create policy images_delete on public.tour_images for delete to authenticated using(public.manages_tour(tour_id) or public.is_admin());
create policy itinerary_read on public.itinerary_steps for select to anon,authenticated using(exists(select 1 from public.tours t where t.id=tour_id and (t.status='published' or public.manages_tour(t.id) or public.is_admin())));
create policy itinerary_insert on public.itinerary_steps for insert to authenticated with check(public.manages_tour(tour_id) or public.is_admin());
create policy itinerary_update on public.itinerary_steps for update to authenticated using(public.manages_tour(tour_id) or public.is_admin()) with check(public.manages_tour(tour_id) or public.is_admin());
create policy itinerary_delete on public.itinerary_steps for delete to authenticated using(public.manages_tour(tour_id) or public.is_admin());
create policy booking_read on public.bookings for select to authenticated using(tourist_id=(select auth.uid()) or public.can_manage_booking(id) or public.is_admin());
-- Bookings and payment statuses have no direct INSERT/UPDATE/DELETE policies: use checked RPCs only.
create policy participants_read on public.booking_participants for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.tourist_id=(select auth.uid()) or public.can_manage_booking(b.id) or public.is_admin())));
create policy payments_read on public.demo_payments for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.tourist_id=(select auth.uid()) or public.can_manage_booking(b.id) or public.is_admin())));
create policy favorites_read on public.favorites for select to authenticated using(user_id=(select auth.uid()));
create policy favorites_insert on public.favorites for insert to authenticated with check(user_id=(select auth.uid()));
create policy favorites_delete on public.favorites for delete to authenticated using(user_id=(select auth.uid()));
create policy reviews_read on public.reviews for select to anon,authenticated using(is_visible or user_id=(select auth.uid()) or public.is_admin());
create policy reviews_insert on public.reviews for insert to authenticated with check(user_id=(select auth.uid()) and is_visible and exists(select 1 from public.bookings b join public.tour_dates d on d.id=b.tour_date_id where b.tourist_id=(select auth.uid()) and d.tour_id=reviews.tour_id and b.status in ('confirmed','completed')));
create policy reviews_admin_update on public.reviews for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy audit_admin_read on public.audit_logs for select to authenticated using(public.is_admin());
create policy ai_conversations_read on public.ai_conversations for select to authenticated using(user_id=(select auth.uid()));
create policy ai_conversations_insert on public.ai_conversations for insert to authenticated with check(user_id=(select auth.uid()));
create policy ai_messages_read on public.ai_messages for select to authenticated using(exists(select 1 from public.ai_conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
-- AI message writing is via trusted server only, not client direct INSERT.
create policy promos_read on public.promo_codes for select to authenticated using(public.owns_agency(agency_id) or public.is_admin());
create policy promos_insert on public.promo_codes for insert to authenticated with check(public.owns_agency(agency_id) or public.is_admin());
create policy promos_update on public.promo_codes for update to authenticated using(public.owns_agency(agency_id) or public.is_admin()) with check(public.owns_agency(agency_id) or public.is_admin());

-- Protect sensitive columns even when own-row UPDATE policies allow edits.
revoke all on public.user_roles from anon,authenticated;
grant select on public.user_roles to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name,preferred_language,theme) on public.profiles to authenticated;
revoke update on public.notifications from authenticated;
grant update(is_read) on public.notifications to authenticated;
revoke all on public.agencies from anon,authenticated;
grant select on public.agencies to anon,authenticated;
-- Approval/status can be changed only through the guarded RPC.
revoke all on public.bookings,public.demo_payments,public.audit_logs from anon,authenticated;
grant select on public.bookings,public.demo_payments to authenticated;
revoke all on public.booking_participants from anon,authenticated;
grant select on public.booking_participants to authenticated;
revoke all on public.ai_messages from anon,authenticated;
grant select on public.ai_messages to authenticated;

-- By default PostgreSQL may permit EXECUTE on new functions to PUBLIC: restrict explicitly.
revoke execute on function public.is_admin(),public.owns_agency(uuid),public.manages_tour(uuid),public.can_manage_booking(uuid),public.available_seats(uuid),
 public.create_booking(uuid,int),public.manual_booking(uuid,text,text,int),public.change_booking_status(uuid,public.booking_status),
 public.simulate_payment(uuid),public.apply_agency(text,text,text),public.review_agency(uuid,boolean),
 public.handle_new_user(),public.touch_updated_at(),public.prevent_tour_reassignment() from public,anon;
grant execute on function public.is_admin(),public.owns_agency(uuid),public.manages_tour(uuid),public.can_manage_booking(uuid),
 public.available_seats(uuid),public.create_booking(uuid,int),public.manual_booking(uuid,text,text,int),
 public.change_booking_status(uuid,public.booking_status),public.simulate_payment(uuid),
 public.apply_agency(text,text,text),public.review_agency(uuid,boolean) to authenticated;
grant execute on function public.available_seats(uuid) to anon;

-- Optional storage: create bucket and object access rules for authenticated approved agencies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tour-images','tour-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- Upload path must be <agency_uuid>/<unique-file-name>.
create policy tour_images_upload on storage.objects for insert to authenticated
 with check(bucket_id='tour-images' and public.owns_agency((split_part(name,'/',1))::uuid));
create policy tour_images_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='tour-images' and public.owns_agency((split_part(name,'/',1))::uuid));
create policy tour_images_owner_update on storage.objects for update to authenticated
 using(bucket_id='tour-images' and public.owns_agency((split_part(name,'/',1))::uuid))
 with check(bucket_id='tour-images' and public.owns_agency((split_part(name,'/',1))::uuid));

-- The first admin is bootstrapped MANUALLY after sign-up in SQL Editor:
-- update public.user_roles set role='admin' where user_id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');
-- Never expose the service_role key to the browser.

-- Prevent moving dates to a different tour or reducing capacity below reservations.
create function public.validate_tour_date_update() returns trigger language plpgsql set search_path='' as $$
declare v_reserved int;
begin
 if new.tour_id<>old.tour_id then raise exception 'Cannot reassign a date to another tour'; end if;
 select coalesce(sum(participants_count),0)::int into v_reserved from public.bookings
 where tour_date_id=old.id and status in ('pending','confirmed','completed');
 if new.capacity<v_reserved then raise exception 'Capacity below reserved seats'; end if;
 return new;
end $$;
create trigger validate_date before update on public.tour_dates for each row execute function public.validate_tour_date_update();
revoke execute on function public.validate_tour_date_update() from public,anon;
