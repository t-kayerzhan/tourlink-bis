-- TourLink BIS | 03_fixes_and_extensions.sql
-- Run AFTER 01_schema.sql and 02_seed.sql, once, in the Supabase SQL Editor.

-- ===== A. BUG FIX: anonymous browsing =====
-- RLS policies on tours/dates/images/itinerary/reviews/agencies call is_admin()/owns_agency()/manages_tour().
-- 01 revoked EXECUTE from anon, so every public (logged-out) query would fail with "permission denied for function".
-- These helpers return false when auth.uid() is null, so granting them to anon is safe.
grant execute on function public.is_admin(), public.owns_agency(uuid), public.manages_tour(uuid), public.can_manage_booking(uuid) to anon;

-- ===== B. BUG FIX: leak of dates/images/itinerary of suspended or unapproved agencies =====
create function public.tour_is_public(p_tour_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tours t join public.agencies a on a.id=t.agency_id
   where t.id=p_tour_id and t.status='published' and a.status='approved');
$$;
revoke execute on function public.tour_is_public(uuid) from public;
grant execute on function public.tour_is_public(uuid) to anon, authenticated;

drop policy dates_read on public.tour_dates;
drop policy images_read on public.tour_images;
drop policy itinerary_read on public.itinerary_steps;
create policy dates_read on public.tour_dates for select to anon,authenticated
 using(public.tour_is_public(tour_id) or public.manages_tour(tour_id) or public.is_admin());
create policy images_read on public.tour_images for select to anon,authenticated
 using(public.tour_is_public(tour_id) or public.manages_tour(tour_id) or public.is_admin());
create policy itinerary_read on public.itinerary_steps for select to anon,authenticated
 using(public.tour_is_public(tour_id) or public.manages_tour(tour_id) or public.is_admin());

-- ===== C. Schema additions =====
alter table public.profiles add column is_suspended boolean not null default false;
alter table public.notifications add column title_key text, add column params jsonb not null default '{}'::jsonb;
alter table public.bookings
  add column discount_kzt numeric(12,2) not null default 0 check(discount_kzt>=0),
  add column promo_code_id uuid references public.promo_codes(id) on delete set null;
create unique index promo_code_upper on public.promo_codes(upper(code));
alter table public.tours add constraint tours_title_len check(char_length(title) between 3 and 120),
  add constraint tours_desc_len check(char_length(description)<=5000);
alter table public.reviews add constraint reviews_comment_len check(char_length(comment)<=2000);
create policy tour_images_update on public.tour_images for update to authenticated
 using(public.manages_tour(tour_id) or public.is_admin()) with check(public.manages_tour(tour_id) or public.is_admin());

-- Image metadata must point inside the tour's own agency folder (<agency_uuid>/file).
create function public.validate_tour_image() returns trigger language plpgsql security definer set search_path='' as $$
declare v_agency uuid;
begin
 select agency_id into v_agency from public.tours where id=new.tour_id;
 if split_part(new.storage_path,'/',1) is distinct from v_agency::text then
   raise exception 'Image path must start with the tour agency id';
 end if;
 return new;
end $$;
create trigger validate_image before insert or update on public.tour_images for each row execute function public.validate_tour_image();
revoke execute on function public.validate_tour_image() from public,anon,authenticated;

-- Storage policies: reject non-UUID folders cleanly instead of raising a cast error.
drop policy tour_images_upload on storage.objects;
drop policy tour_images_owner_delete on storage.objects;
drop policy tour_images_owner_update on storage.objects;
create function public.storage_folder_owned(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select case when split_part(p_name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   then public.owns_agency(split_part(p_name,'/',1)::uuid) else false end;
$$;
revoke execute on function public.storage_folder_owned(text) from public,anon;
grant execute on function public.storage_folder_owned(text) to authenticated;
create policy tour_images_upload on storage.objects for insert to authenticated
 with check(bucket_id='tour-images' and public.storage_folder_owned(name));
create policy tour_images_owner_delete on storage.objects for delete to authenticated
 using(bucket_id='tour-images' and public.storage_folder_owned(name));
create policy tour_images_owner_update on storage.objects for update to authenticated
 using(bucket_id='tour-images' and public.storage_folder_owned(name))
 with check(bucket_id='tour-images' and public.storage_folder_owned(name));

-- ===== D. Notifications helper (internal only) =====
create function public.notify_user(p_user uuid,p_key text,p_params jsonb,p_title text,p_message text) returns void
 language sql security definer set search_path='' as $$
 insert into public.notifications(user_id,title,message,title_key,params)
 select p_user,p_title,p_message,p_key,coalesce(p_params,'{}'::jsonb) where p_user is not null;
$$;
revoke execute on function public.notify_user(uuid,text,jsonb,text,text) from public,anon,authenticated;

-- ===== E. Agency lifecycle: apply / approve / reject / suspend =====
create or replace function public.apply_agency(p_name text,p_description text,p_email text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_status public.agency_status;
begin
 if auth.uid() is null or length(trim(coalesce(p_name,'')))<2 or char_length(p_name)>120 then raise exception 'Invalid application'; end if;
 if position('@' in coalesce(p_email,''))=0 then raise exception 'Valid contact email required'; end if;
 if exists(select 1 from public.profiles where id=auth.uid() and is_suspended) then raise exception 'Account suspended'; end if;
 select id,status into v_id,v_status from public.agencies where owner_id=auth.uid();
 if found then
   if v_status<>'rejected' then raise exception 'Agency already exists'; end if;
   update public.agencies set name=trim(p_name),description=coalesce(p_description,''),contact_email=trim(p_email),status='pending' where id=v_id;
 else
   insert into public.agencies(owner_id,name,description,contact_email,status)
   values(auth.uid(),trim(p_name),coalesce(p_description,''),trim(p_email),'pending') returning id into v_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'agency.applied','agency',v_id);
 perform public.notify_user(r.user_id,'agency_application',jsonb_build_object('name',trim(p_name)),'New agency application',trim(p_name)||' applied for an agency account')
   from public.user_roles r where r.role='admin';
 return v_id;
end $$;

create function public.set_agency_status(p_agency_id uuid,p_status public.agency_status) returns void
 language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_old public.agency_status;
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 if p_status='pending' then raise exception 'Unsupported status'; end if;
 select owner_id,status into v_owner,v_old from public.agencies where id=p_agency_id for update;
 if not found then raise exception 'Agency not found'; end if;
 update public.agencies set status=p_status,verified_at=case when p_status='approved' then now() else null end where id=p_agency_id;
 if v_owner is not null then
   update public.user_roles set role=case when p_status='approved' then 'agency'::public.app_role else 'tourist'::public.app_role end
   where user_id=v_owner and role<>'admin';
   perform public.notify_user(v_owner,'agency_status',jsonb_build_object('status',p_status),'Agency status updated','Your agency status is now '||p_status::text);
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'agency.'||p_status::text,'agency',p_agency_id,jsonb_build_object('from',v_old,'to',p_status));
end $$;

-- Backwards-compatible wrapper for 01.
create or replace function public.review_agency(p_agency_id uuid,p_approve boolean) returns void
 language plpgsql security definer set search_path='' as $$
begin
 perform public.set_agency_status(p_agency_id,case when p_approve then 'approved'::public.agency_status else 'rejected'::public.agency_status end);
end $$;

create function public.update_my_agency(p_name text,p_description text,p_email text) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if length(trim(coalesce(p_name,'')))<2 or char_length(p_name)>120 or position('@' in coalesce(p_email,''))=0 then raise exception 'Invalid agency data'; end if;
 update public.agencies set name=trim(p_name),description=left(coalesce(p_description,''),2000),contact_email=trim(p_email)
 where owner_id=auth.uid() and status in ('pending','approved');
 if not found then raise exception 'No editable agency'; end if;
end $$;

-- ===== F. Admin user management =====
create function public.admin_list_users() returns table(user_id uuid,email text,full_name text,role public.app_role,is_suspended boolean,created_at timestamptz)
 language plpgsql stable security definer set search_path='' as $$
#variable_conflict use_column
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 return query select p.id,u.email::text,p.full_name,r.role,p.is_suspended,p.created_at
  from public.profiles p join auth.users u on u.id=p.id join public.user_roles r on r.user_id=p.id order by p.created_at desc;
end $$;
create function public.admin_set_user_suspended(p_user uuid,p_suspended boolean) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin only'; end if;
 if p_user=auth.uid() then raise exception 'You cannot suspend yourself'; end if;
 if exists(select 1 from public.user_roles where user_id=p_user and role='admin') then raise exception 'Cannot suspend an admin'; end if;
 update public.profiles set is_suspended=p_suspended where id=p_user;
 if not found then raise exception 'User not found'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),case when p_suspended then 'user.suspended' else 'user.unsuspended' end,'profile',p_user,'{}'::jsonb);
end $$;

-- ===== G. Bookings: promo codes, duplicate guard, notifications, participants =====
drop function public.create_booking(uuid,int);
create function public.create_booking(p_date_id uuid,p_participants int,p_promo_code text default null) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v record; v_id uuid; v_free int; v_promo uuid; v_pct int:=0; v_gross numeric; v_disc numeric; v_total numeric;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 if exists(select 1 from public.profiles where id=auth.uid() and is_suspended) then raise exception 'Account suspended'; end if;
 if p_participants is null or p_participants<1 or p_participants>30 then raise exception 'Invalid participants'; end if;
 select d.id,d.active,d.start_date,t.id as tour_id,t.title,t.price_kzt,t.status,t.agency_id,a.owner_id into v
 from public.tour_dates d join public.tours t on t.id=d.tour_id join public.agencies a on a.id=t.agency_id
 where d.id=p_date_id and a.status='approved' for update of d;
 if not found or not v.active or v.status<>'published' or v.start_date<current_date then raise exception 'Tour date unavailable'; end if;
 if exists(select 1 from public.bookings where tour_date_id=p_date_id and tourist_id=auth.uid() and status in ('pending','confirmed')) then
   raise exception 'You already have an active booking for this date'; end if;
 select public.available_seats(p_date_id) into v_free;
 if v_free<p_participants then raise exception 'Not enough available seats'; end if;
 if length(trim(coalesce(p_promo_code,'')))>0 then
   select id,discount_percent into v_promo,v_pct from public.promo_codes
   where upper(code)=upper(trim(p_promo_code)) and agency_id=v.agency_id and active and (expires_on is null or expires_on>=current_date);
   if not found then raise exception 'Invalid promo code'; end if;
 end if;
 v_gross:=v.price_kzt*p_participants; v_disc:=round(v_gross*v_pct/100.0,2); v_total:=v_gross-v_disc;
 insert into public.bookings(tour_date_id,tourist_id,participants_count,total_kzt,discount_kzt,promo_code_id)
 values(p_date_id,auth.uid(),p_participants,v_total,v_disc,v_promo) returning id into v_id;
 insert into public.demo_payments(booking_id,amount_kzt) values(v_id,v_total);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'booking.created','booking',v_id,jsonb_build_object('participants',p_participants,'total',v_total));
 perform public.notify_user(v.owner_id,'booking_new',jsonb_build_object('tour',v.title,'participants',p_participants),'New booking',p_participants||' seat(s) booked for '||v.title);
 return v_id;
end $$;

create or replace function public.change_booking_status(p_booking_id uuid,p_new_status public.booking_status)
 returns void language plpgsql security definer set search_path='' as $$
declare v_book record; v_date uuid; v_owner uuid; v_title text; v_start date; v_is_tourist boolean;
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 select tour_date_id into v_date from public.bookings where id=p_booking_id;
 if not found then raise exception 'Booking not found'; end if;
 perform 1 from public.tour_dates where id=v_date for update;
 select * into v_book from public.bookings where id=p_booking_id for update;
 if v_book.status in ('cancelled','completed') then raise exception 'Booking is final'; end if;
 select a.owner_id,t.title,d.start_date into v_owner,v_title,v_start
 from public.tour_dates d join public.tours t on t.id=d.tour_id join public.agencies a on a.id=t.agency_id where d.id=v_date;
 v_is_tourist:=v_book.tourist_id is not distinct from auth.uid();
 if p_new_status='cancelled' then
   if not v_is_tourist and not public.can_manage_booking(p_booking_id) and not public.is_admin() then raise exception 'Permission denied'; end if;
 elsif p_new_status in ('confirmed','completed') then
   if not public.can_manage_booking(p_booking_id) and not public.is_admin() then raise exception 'Permission denied'; end if;
   if p_new_status='confirmed' and v_book.status<>'pending' then raise exception 'Only pending bookings can be confirmed'; end if;
   if p_new_status='completed' and v_book.status<>'confirmed' then raise exception 'Confirm first'; end if;
   if p_new_status='completed' and v_start>current_date then raise exception 'Tour has not started yet'; end if;
 else raise exception 'Unsupported status transition'; end if;
 update public.bookings set status=p_new_status where id=p_booking_id;
 if p_new_status='cancelled' then
   update public.demo_payments set status='refunded_demo',method_label='DEMO refund - no real money',processed_at=now()
   where booking_id=p_booking_id and status='paid_demo';
 end if;
 if v_book.tourist_id is not null and not v_is_tourist then
   perform public.notify_user(v_book.tourist_id,'booking_status',jsonb_build_object('status',p_new_status,'tour',v_title),'Booking update','Your booking for '||v_title||' is now '||p_new_status::text);
 end if;
 if v_is_tourist and p_new_status='cancelled' then
   perform public.notify_user(v_owner,'booking_cancelled',jsonb_build_object('tour',v_title),'Booking cancelled','A tourist cancelled a booking for '||v_title);
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'booking.status','booking',p_booking_id,jsonb_build_object('from',v_book.status,'to',p_new_status));
end $$;

create function public.set_booking_participants(p_booking_id uuid,p_participants jsonb) returns void
 language plpgsql security definer set search_path='' as $$
declare v_b record; v_n int;
begin
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or not (v_b.tourist_id is not distinct from auth.uid() or public.can_manage_booking(p_booking_id)) then raise exception 'Permission denied'; end if;
 if v_b.status in ('cancelled','completed') then raise exception 'Booking is final'; end if;
 if coalesce(jsonb_typeof(p_participants),'')<>'array' then raise exception 'Participants must be a JSON array'; end if;
 v_n:=jsonb_array_length(p_participants);
 if v_n<1 or v_n>v_b.participants_count then raise exception 'Participant list must have between 1 and % entries',v_b.participants_count; end if;
 delete from public.booking_participants where booking_id=p_booking_id;
 insert into public.booking_participants(booking_id,full_name,contact_phone)
 select p_booking_id,left(trim(e->>'full_name'),120),nullif(left(trim(coalesce(e->>'contact_phone','')),32),'')
 from jsonb_array_elements(p_participants) e where length(trim(coalesce(e->>'full_name','')))>0;
end $$;

-- Agency-scoped booking list incl. customer contact (only own agency; admin sees all). Used by bookings, customers, CSV, analytics.
create function public.agency_bookings() returns table(booking_id uuid,created_at timestamptz,status public.booking_status,tour_id uuid,tour_title text,
 tour_date_id uuid,start_date date,participants_count int,total_kzt numeric,discount_kzt numeric,payment_status public.payment_status,
 customer_name text,customer_email text,source text)
 language plpgsql stable security definer set search_path='' as $$
#variable_conflict use_column
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 return query
 select b.id,b.created_at,b.status,t.id,t.title,b.tour_date_id,d.start_date,b.participants_count,b.total_kzt,b.discount_kzt,p.status,
   coalesce(b.guest_name,pr.full_name,''),coalesce(b.guest_email,u.email::text),case when b.tourist_id is null then 'manual' else 'online' end
 from public.bookings b join public.tour_dates d on d.id=b.tour_date_id join public.tours t on t.id=d.tour_id
 join public.agencies a on a.id=t.agency_id left join public.demo_payments p on p.booking_id=b.id
 left join public.profiles pr on pr.id=b.tourist_id left join auth.users u on u.id=b.tourist_id
 where (a.owner_id=auth.uid() and a.status='approved') or public.is_admin()
 order by b.created_at desc;
end $$;

-- ===== H. Catalog view + search RPCs (server-side filtering, sorting, 3-entity search) =====
create view public.tour_catalog with (security_invoker=true) as
select t.id,t.title,t.description,t.category,t.duration_days,t.price_kzt,t.status,t.meeting_point,t.latitude,t.longitude,t.created_at,
 t.agency_id,a.name as agency_name,d.id as destination_id,d.country,d.city,
 (select i.storage_path from public.tour_images i where i.tour_id=t.id order by i.position,i.id limit 1) as cover_path,
 (select min(td.start_date) from public.tour_dates td where td.tour_id=t.id and td.active and td.start_date>=current_date) as next_date,
 coalesce((select sum(public.available_seats(td.id))::int from public.tour_dates td where td.tour_id=t.id and td.active and td.start_date>=current_date),0) as seats_left,
 (select round(avg(r.rating)::numeric,2) from public.reviews r where r.tour_id=t.id and r.is_visible) as avg_rating,
 (select count(*)::int from public.reviews r where r.tour_id=t.id and r.is_visible) as review_count
from public.tours t join public.agencies a on a.id=t.agency_id join public.destinations d on d.id=t.destination_id;

create function public.search_tours(p_q text default null,p_country text default null,p_city text default null,p_agency uuid default null,
 p_category text default null,p_min_price numeric default null,p_max_price numeric default null,p_min_days int default null,p_max_days int default null,
 p_from date default null,p_to date default null,p_min_seats int default null,p_min_rating numeric default null,p_sort text default null,
 p_limit int default 50,p_offset int default 0) returns setof public.tour_catalog
 language sql stable set search_path='' as $$
 with q as (select case when length(trim(coalesce(p_q,'')))=0 then null
   else '%'||replace(replace(replace(trim(p_q),'\','\\'),'%','\%'),'_','\_')||'%' end as pat)
 select c.* from public.tour_catalog c,q
 where c.status='published'
  and (q.pat is null or c.title ilike q.pat or c.city ilike q.pat or c.country ilike q.pat or c.agency_name ilike q.pat)
  and (p_country is null or c.country=p_country) and (p_city is null or c.city=p_city)
  and (p_agency is null or c.agency_id=p_agency) and (p_category is null or c.category=p_category)
  and (p_min_price is null or c.price_kzt>=p_min_price) and (p_max_price is null or c.price_kzt<=p_max_price)
  and (p_min_days is null or c.duration_days>=p_min_days) and (p_max_days is null or c.duration_days<=p_max_days)
  and (p_min_rating is null or coalesce(c.avg_rating,0)>=p_min_rating)
  and ((p_from is null and p_to is null and p_min_seats is null) or exists(
    select 1 from public.tour_dates td where td.tour_id=c.id and td.active
     and td.start_date>=greatest(current_date,coalesce(p_from,current_date)) and (p_to is null or td.start_date<=p_to)
     and public.available_seats(td.id)>=coalesce(p_min_seats,1)))
 order by case p_sort when 'price_asc' then c.price_kzt end asc nulls last,
  case p_sort when 'price_desc' then c.price_kzt end desc nulls last,
  case p_sort when 'duration_asc' then c.duration_days end asc nulls last,
  case p_sort when 'duration_desc' then c.duration_days end desc nulls last,
  case p_sort when 'date' then c.next_date end asc nulls last,
  case p_sort when 'rating' then c.avg_rating end desc nulls last,
  c.created_at desc
 limit least(coalesce(p_limit,50),200) offset greatest(coalesce(p_offset,0),0);
$$;

create function public.search_entities(p_q text) returns table(entity_type text,entity_id uuid,title text,subtitle text,tour_count int)
 language plpgsql stable set search_path='' as $$
#variable_conflict use_column
declare v_pat text;
begin
 if length(trim(coalesce(p_q,'')))<2 then return; end if;
 v_pat:='%'||replace(replace(replace(trim(p_q),'\','\\'),'%','\%'),'_','\_')||'%';
 return query (select 'tour'::text,c.id,c.title,c.city||', '||c.country||' · '||c.agency_name,1
   from public.tour_catalog c where c.status='published'
   and (c.title ilike v_pat or c.city ilike v_pat or c.country ilike v_pat or c.agency_name ilike v_pat) order by c.title limit 20);
 return query (select 'destination'::text,d.id,d.city,d.country||case when d.region<>'' then ' · '||d.region else '' end,
   (select count(*)::int from public.tours t where t.destination_id=d.id and t.status='published')
   from public.destinations d where d.city ilike v_pat or d.country ilike v_pat or d.region ilike v_pat order by d.city limit 20);
 return query (select 'agency'::text,a.id,a.name,left(a.description,120),
   (select count(*)::int from public.tours t where t.agency_id=a.id and t.status='published')
   from public.agencies a where a.status='approved' and (a.name ilike v_pat or a.description ilike v_pat) order by a.name limit 20);
end $$;

-- ===== I. Audit triggers for admin/agency management actions =====
create function public.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_det jsonb;
begin
 if tg_op='DELETE' then v_id:=old.id; v_det:=jsonb_build_object('op','delete');
 elsif tg_op='INSERT' then v_id:=new.id; v_det:=jsonb_build_object('op','insert');
 else v_id:=new.id; v_det:=jsonb_build_object('op','update','status_from',to_jsonb(old)->>'status','status_to',to_jsonb(new)->>'status',
   'visible_from',to_jsonb(old)->>'is_visible','visible_to',to_jsonb(new)->>'is_visible');
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),tg_table_name||'.'||lower(tg_op),tg_table_name,v_id,v_det);
 return coalesce(new,old);
end $$;
revoke execute on function public.audit_row() from public,anon,authenticated;
create trigger audit_tours after insert or update or delete on public.tours for each row execute function public.audit_row();
create trigger audit_destinations after insert or update or delete on public.destinations for each row execute function public.audit_row();
create trigger audit_reviews after update or delete on public.reviews for each row execute function public.audit_row();

-- ===== J. Grants for new objects =====
revoke execute on function public.apply_agency(text,text,text),public.set_agency_status(uuid,public.agency_status),public.review_agency(uuid,boolean),
 public.update_my_agency(text,text,text),public.admin_list_users(),public.admin_set_user_suspended(uuid,boolean),
 public.create_booking(uuid,int,text),public.change_booking_status(uuid,public.booking_status),public.set_booking_participants(uuid,jsonb),
 public.agency_bookings(),public.search_entities(text) from public,anon;
grant execute on function public.apply_agency(text,text,text),public.set_agency_status(uuid,public.agency_status),public.review_agency(uuid,boolean),
 public.update_my_agency(text,text,text),public.admin_list_users(),public.admin_set_user_suspended(uuid,boolean),
 public.create_booking(uuid,int,text),public.change_booking_status(uuid,public.booking_status),public.set_booking_participants(uuid,jsonb),
 public.agency_bookings() to authenticated;
revoke execute on function public.search_tours(text,text,text,uuid,text,numeric,numeric,int,int,date,date,int,numeric,text,int,int) from public;
grant execute on function public.search_tours(text,text,text,uuid,text,numeric,numeric,int,int,date,date,int,numeric,text,int,int) to anon,authenticated;
grant execute on function public.search_entities(text) to anon,authenticated;
grant select on public.tour_catalog to anon,authenticated;

-- ===== K. BUG FIX: admin could not read audit logs =====
-- 01 revoked ALL on audit_logs from authenticated and never re-granted SELECT, so the admin audit page would fail
-- with "permission denied". The audit_admin_read policy still limits rows to admins.
grant select on public.audit_logs to authenticated;
grant usage on sequence public.audit_logs_id_seq to authenticated;
