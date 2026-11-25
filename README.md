# TourLink — Smart Tour Booking & Agency Management (BIS project)

React + TypeScript + Vite · Tailwind · Supabase (Postgres, Auth, Storage, RLS) · React Router · TanStack Query · i18next (EN/RU) · Leaflet · Recharts · Zod

## 1. Setup
1. Create a Supabase project. In **SQL Editor** run, in order, each once: `supabase/migrations/01_schema.sql`, `02_seed.sql`, `03_fixes_and_extensions.sql`.
2. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/publishable key only — never `service_role`).
3. Supabase → Authentication → Providers → Email: for a classroom demo you may disable "Confirm email" so sign-up logs in immediately.
4. `npm install && npm run dev` (open the printed URL). Checks: `npm run typecheck`, `npm test`, `npm run build`.

## 2. First admin (secure, SQL only)
Register normally in the app, then in the SQL Editor:
```sql
update public.user_roles set role = 'admin' where user_id = (select id from auth.users where email = 'you@example.com');
```
The sign-up form and user metadata can never set a role.

## 3. AI assistant (server-side key)
The browser only calls the Edge Function `ai-assistant`; the key stays in Supabase secrets.
```
supabase login && supabase link --project-ref <ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # optional: AI_MODEL=<model id>
supabase functions deploy ai-assistant
```
Without the secret, the chat shows "AI assistant is not available" (no fake answers). The function reads published tours/dates/itineraries with the caller's JWT (RLS), rate-limits to 10 messages/min/user, and never touches bookings, payments or customer data.

## 4. Demo walkthrough (live DB writes)
1. Sign up as `agency@demo` → *Become an agency* → submit application (row appears in `agencies`, status `pending`).
2. Sign in as admin → Admin → Agencies → Approve (audit log + notification written).
3. As agency: My tours → New tour (destination, price, coordinates, photos, itinerary) → Save → add departure dates & capacity → Publish.
4. Sign up as tourist → search "almaty" (tours + destinations + agencies) → filters/sort → tour page → pick date, 2 participants → Book now.
5. Demo checkout (`4242 4242 4242 4242`, any name, future expiry, any CVV) → receipt. `4000 0000 0000 0002` shows a declined state with no DB write.
6. Agency: Bookings → Confirm (tourist gets a notification), manual booking, CSV export, Analytics. Tourist: cancel → seats freed, payment becomes demo-refund.
7. Admin: Reviews (hide), Users (suspend), Audit log.

## 5. Payment safety
Card fields live only in `Checkout.tsx` component state, are validated client-side and cleared after use. The only thing sent is `simulate_payment(p_booking_id)`. A unit test asserts that. Receipts and refunds are labelled DEMO. No PCI claims.

## 6. Implemented / tested status
| Area | Status |
|---|---|
| SQL 01+02+03 applied on PostgreSQL 16 with stubbed Supabase auth/storage; RLS, capacity, cancellation, duplicate booking, promo, notifications, audit, search verified by `test_db_flow.sql` | Tested |
| TypeScript compile, production build, 14 unit tests (EN/RU key parity & plural forms, card validation, CSV injection guard, quiz, analytics math, payment payload) | Tested |
| Auth, profile, catalog (3-entity search, 13 filters, 5 sorts), tour detail, booking, checkout, my bookings/cancel/participants, favorites, compare, quiz, notifications, map (country→city→tour), reviews | Implemented, **not browser-tested against a live Supabase project** |
| Agency: apply, dashboard, tour CRUD + photos + itinerary + dates, bookings (confirm/cancel/complete/manual), customers, calendar, analytics, CSV | Implemented, not browser-tested |
| Admin: overview, agencies (approve/reject/suspend), users (suspend), tours, destinations CRUD, bookings, reviews moderation, audit | Implemented, not browser-tested |
| AI Edge Function | Written, **never run against a real provider** |

## 7. Known limitations
- Destination photos are illustrated placeholders until agencies upload images (no third-party photos are bundled).
- No agency UI for creating promo codes yet (insert into `promo_codes` via SQL: `agency_id, code, discount_percent`); the server applies them.
- Agencies cannot yet view participant name lists (tourists can enter them; RPC allows managers, UI missing).
- Admin edits tour status only; full tour editing is agency-side.
- Itinerary save is delete-then-insert (not one transaction).
- True concurrent double-booking was not load-tested; the DB locks the `tour_dates` row.
- JS bundle is ~1.2 MB (no code-splitting). Reviewer names are not shown (profiles are private).
- Not included: presentation text (aim, objectives, competitors, SWOT), use-case/ERD sources, 5–7 min exam script.
