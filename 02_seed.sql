-- TourLink demonstration dataset. Fake agencies and sample prices; NOT live offers.
-- Run after 01_schema.sql. Dates are in 2027 for the 2026-27 exam period.
insert into public.destinations(id,country,city,region,latitude,longitude) values
('10000000-0000-4000-8000-000000000001','Kazakhstan','Almaty','Almaty Region',43.222000,76.851200),
('10000000-0000-4000-8000-000000000002','Kazakhstan','Charyn Canyon','Almaty Region',43.350000,79.080000),
('10000000-0000-4000-8000-000000000003','Kazakhstan','Kolsai Lakes','Almaty Region',42.940000,78.330000),
('10000000-0000-4000-8000-000000000004','Kazakhstan','Astana','Astana',51.169400,71.449100),
('10000000-0000-4000-8000-000000000005','Kazakhstan','Turkistan','Turkistan Region',43.297300,68.251800),
('10000000-0000-4000-8000-000000000006','Türkiye','Göreme','Nevşehir',38.643100,34.828000),
('10000000-0000-4000-8000-000000000007','Türkiye','Istanbul','Istanbul',41.008200,28.978400),
('10000000-0000-4000-8000-000000000008','United Arab Emirates','Dubai','Dubai',25.204800,55.270800),
('10000000-0000-4000-8000-000000000009','Georgia','Tbilisi','Tbilisi',41.715100,44.827100),
('10000000-0000-4000-8000-000000000010','Kyrgyzstan','Bishkek','Chuy',42.874600,74.569800),
('10000000-0000-4000-8000-000000000011','Kazakhstan','Burabay','Akmola Region',53.083300,70.300000),
('10000000-0000-4000-8000-000000000012','Kazakhstan','Aktau','Mangystau Region',43.652500,51.157500)
on conflict(id) do nothing;

insert into public.agencies(id,name,description,contact_email,status,verified_at) values
('20000000-0000-4000-8000-000000000001','Nomad Trails Demo','Sample agency for Kazakhstan nature trips','nomad@example.com','approved',now()),
('20000000-0000-4000-8000-000000000002','Silk Road Trips Demo','Sample cultural tour provider','silkroad@example.com','approved',now()),
('20000000-0000-4000-8000-000000000003','World Escape Demo','Sample international travel agency','escape@example.com','approved',now()),
('20000000-0000-4000-8000-000000000004','Steppe Explorer Demo','Sample mountain and outdoor tours','steppe@example.com','approved',now()),
('20000000-0000-4000-8000-000000000005','City Stories Demo','Sample city experiences','cities@example.com','approved',now())
on conflict(id) do nothing;

insert into public.tours(id,agency_id,destination_id,title,description,category,duration_days,price_kzt,status,meeting_point,latitude,longitude,included) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Kolsai Lakes Escape','Discover alpine lakes and mountain views. Sample tour.','nature',1,25000,'published','Almaty city center',42.940000,78.330000,'Transport, guide'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Charyn Canyon Day Trip','Walk among the canyon formations. Sample tour.','adventure',1,18000,'published','Almaty city center',43.350000,79.080000,'Transport, guide'),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','Almaty Mountain Weekend','Enjoy a weekend near the city. Sample tour.','nature',2,49000,'published','Almaty downtown',43.222000,76.851200,'Transport, guide'),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000005','Turkistan Heritage','Explore the history and architecture of Turkistan. Sample tour.','culture',2,57000,'published','Turkistan center',43.297300,68.251800,'Guide'),
('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000004','Astana Highlights','Discover major landmarks in Astana. Sample tour.','city',1,16000,'published','Central Astana',51.169400,71.449100,'Guide'),
('30000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000006','Cappadocia Adventure','See volcanic landscapes and historic valleys. Sample tour.','adventure',3,195000,'published','Göreme center',38.643100,34.828000,'Accommodation, guide'),
('30000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000007','Istanbul Culture Walk','Markets, history and city streets. Sample tour.','culture',2,85000,'published','Sultanahmet',41.008200,28.978400,'Local guide'),
('30000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000008','Dubai City Discovery','An introduction to modern Dubai. Sample tour.','city',2,105000,'published','Downtown Dubai',25.204800,55.270800,'Guide, transport'),
('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000009','Tbilisi Food & Culture','Explore Georgian food and old streets. Sample tour.','culture',2,72000,'published','Freedom Square',41.715100,44.827100,'Guide'),
('30000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000010','Bishkek Outdoor Escape','Nearby nature and city highlights. Sample tour.','nature',2,64000,'published','Bishkek center',42.874600,74.569800,'Transport, guide'),
('30000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000011','Burabay Family Break','Lakes and forest walks. Sample tour.','family',2,42000,'published','Burabay visitor center',53.083300,70.300000,'Guide'),
('30000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000012','Aktau Coast Getaway','Relax by the Caspian Sea. Sample tour.','relaxation',3,98000,'published','Aktau city center',43.652500,51.157500,'Guide');

insert into public.tour_dates(tour_id,start_date,end_date,capacity)
select t.id, date '2027-01-16'+(n*21), date '2027-01-16'+(n*21)+(t.duration_days-1), 10+((row_number() over (order by t.id))::int % 9)
from public.tours t cross join generate_series(0,2) n
where t.id::text like '30000000-%'
on conflict(tour_id,start_date) do nothing;

insert into public.itinerary_steps(tour_id,day_number,step_order,start_time,title,details)
select id,1,1,'08:00','Departure','Meet the group and begin the journey.' from public.tours where id::text like '30000000-%'
on conflict(tour_id,day_number,step_order) do nothing;
insert into public.itinerary_steps(tour_id,day_number,step_order,start_time,title,details)
select id,1,2,'12:00','Main experience','Explore the destination with the guide.' from public.tours where id::text like '30000000-%'
on conflict(tour_id,day_number,step_order) do nothing;
insert into public.itinerary_steps(tour_id,day_number,step_order,start_time,title,details)
select id,1,3,'17:00','Finish the day','End of the daily activities.' from public.tours where id::text like '30000000-%'
on conflict(tour_id,day_number,step_order) do nothing;
-- No fake user accounts/passwords, live bookings, payments or reviews are seeded.
-- Sample agencies have no owner_id; to operate as one, apply + approve a real agency account.
