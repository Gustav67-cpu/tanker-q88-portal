-- =========================================================================
-- Tanker Q88 Portal — Supabase schema, RLS policies, triggers, storage rules
-- Paste this entire file into Supabase SQL Editor and Run.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS where it matters.
-- =========================================================================

-- ---------- Extensions ---------------------------------------------------
create extension if not exists "pgcrypto";  -- for gen_random_uuid()

-- ---------- Enums --------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'owner', 'charterer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vessel_status as enum ('Open', 'Fixed', 'Hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fixture_status as enum (
    'New request',
    'Under broker review',
    'Sent to Owner',
    'Owner countered',
    'Sent to Charterer',
    'Charterer countered',
    'Subjects',
    'Fixed',
    'Failed',
    'Cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_type as enum ('charterer_broker', 'broker_owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sender_role as enum ('charterer', 'broker', 'owner');
exception when duplicate_object then null; end $$;

-- ---------- profiles -----------------------------------------------------
-- One row per authenticated user. Mirrors auth.users via trigger below.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  role            user_role not null default 'charterer',
  company_name    text,
  contact_person  text,
  whatsapp_number text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- vessels ------------------------------------------------------
create table if not exists public.vessels (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  vessel_name         text not null,
  imo_number          text,
  dwt                 numeric,
  year_built          int,
  flag                text,
  class_society       text,
  loa                 numeric,
  beam                numeric,
  max_draft           numeric,
  cargo_capacity_cbm  numeric,
  number_of_tanks     int,
  tank_coating        text,
  pumps               text,
  heating_coils       boolean,
  imo_class           text,
  sire_status         text,
  cdi_status          text,
  last_3_cargoes      text,
  trading_area        text,
  opening_port        text,
  opening_date        date,
  status              vessel_status not null default 'Open',
  remarks             text,
  q88_file_url        text,
  public_share_token  uuid not null default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists vessels_owner_idx          on public.vessels(owner_id);
create index if not exists vessels_status_idx         on public.vessels(status);
create index if not exists vessels_share_token_idx    on public.vessels(public_share_token);

-- ---------- fixture_requests --------------------------------------------
create table if not exists public.fixture_requests (
  id                            uuid primary key default gen_random_uuid(),
  vessel_id                     uuid not null references public.vessels(id) on delete cascade,
  charterer_id                  uuid not null references public.profiles(id) on delete cascade,
  owner_id                      uuid not null references public.profiles(id) on delete cascade,
  broker_id                     uuid references public.profiles(id) on delete set null,
  cargo                         text,
  quantity                      text,
  load_port                     text,
  discharge_port                text,
  laycan_from                   date,
  laycan_to                     date,
  freight_idea                  text,
  demurrage_idea                text,
  charter_party_form            text,
  special_requirements          text,
  status                        fixture_status not null default 'New request',
  broker_commission_percentage  numeric not null default 2.5,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create index if not exists fixture_vessel_idx     on public.fixture_requests(vessel_id);
create index if not exists fixture_charterer_idx  on public.fixture_requests(charterer_id);
create index if not exists fixture_owner_idx      on public.fixture_requests(owner_id);
create index if not exists fixture_status_idx     on public.fixture_requests(status);

-- ---------- offers_counters ---------------------------------------------
create table if not exists public.offers_counters (
  id                  uuid primary key default gen_random_uuid(),
  fixture_request_id  uuid not null references public.fixture_requests(id) on delete cascade,
  sender_role         sender_role not null,
  sent_to_role        sender_role not null,
  freight             text,
  demurrage           text,
  laycan_from         date,
  laycan_to           date,
  load_port           text,
  discharge_port      text,
  subjects            text,
  remarks             text,
  created_at          timestamptz not null default now()
);

create index if not exists offers_fixture_idx on public.offers_counters(fixture_request_id);

-- ---------- chat_messages ------------------------------------------------
create table if not exists public.chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  fixture_request_id  uuid not null references public.fixture_requests(id) on delete cascade,
  chat_type           chat_type not null,
  sender_id           uuid not null references public.profiles(id) on delete cascade,
  message             text not null,
  created_at          timestamptz not null default now()
);

create index if not exists chat_fixture_idx       on public.chat_messages(fixture_request_id);
create index if not exists chat_fixture_type_idx  on public.chat_messages(fixture_request_id, chat_type);

-- ---------- updated_at triggers -----------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists vessels_touch on public.vessels;
create trigger vessels_touch before update on public.vessels
  for each row execute function public.touch_updated_at();

drop trigger if exists fixture_touch on public.fixture_requests;
create trigger fixture_touch before update on public.fixture_requests
  for each row execute function public.touch_updated_at();

-- ---------- auto-create profile on signup -------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'charterer')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- helper: is_admin --------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- =========================================================================
-- Row-Level Security
-- =========================================================================

alter table public.profiles          enable row level security;
alter table public.vessels           enable row level security;
alter table public.fixture_requests  enable row level security;
alter table public.offers_counters   enable row level security;
alter table public.chat_messages     enable row level security;

-- ---------- profiles policies -------------------------------------------
drop policy if exists profiles_self_read     on public.profiles;
drop policy if exists profiles_self_update   on public.profiles;
drop policy if exists profiles_admin_all     on public.profiles;
drop policy if exists profiles_counterparty_read on public.profiles;

-- Users read & update their own profile
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid());

-- Admin can do anything
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Owners and charterers can read the OTHER party's *non-private* fields
-- only when they share a fixture_request. We keep this narrow: same query
-- used by the dashboards; the broker still controls what they actually see
-- in the UI (you'll project only the safe columns client-side).
create policy profiles_counterparty_read on public.profiles
  for select using (
    exists (
      select 1 from public.fixture_requests fr
      where (fr.owner_id = profiles.id and fr.charterer_id = auth.uid())
         or (fr.charterer_id = profiles.id and fr.owner_id = auth.uid())
    )
  );

-- ---------- vessels policies --------------------------------------------
drop policy if exists vessels_owner_all      on public.vessels;
drop policy if exists vessels_charterer_read on public.vessels;
drop policy if exists vessels_admin_all      on public.vessels;

-- Owners: full CRUD on their own vessels
create policy vessels_owner_all on public.vessels
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Charterers: read-only, only Open vessels
create policy vessels_charterer_read on public.vessels
  for select using (
    status = 'Open'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'charterer'
    )
  );

-- Admin: everything
create policy vessels_admin_all on public.vessels
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- fixture_requests policies -----------------------------------
drop policy if exists fixture_charterer_own  on public.fixture_requests;
drop policy if exists fixture_owner_own      on public.fixture_requests;
drop policy if exists fixture_charterer_ins  on public.fixture_requests;
drop policy if exists fixture_admin_all      on public.fixture_requests;

-- Charterer: see only their own requests; insert with themselves as charterer
create policy fixture_charterer_own on public.fixture_requests
  for select using (charterer_id = auth.uid());

create policy fixture_charterer_ins on public.fixture_requests
  for insert with check (
    charterer_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'charterer')
  );

-- Owner: see requests for their vessels (read-only here; counters go via offers_counters)
create policy fixture_owner_own on public.fixture_requests
  for select using (owner_id = auth.uid());

-- Admin/broker: full access
create policy fixture_admin_all on public.fixture_requests
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- offers_counters policies ------------------------------------
-- Anyone party to the fixture can read counters relevant to their side.
-- Only admin can insert "broker -> X" rows; charterers and owners insert their own.
drop policy if exists offers_party_read    on public.offers_counters;
drop policy if exists offers_party_insert  on public.offers_counters;
drop policy if exists offers_admin_all     on public.offers_counters;

create policy offers_party_read on public.offers_counters
  for select using (
    exists (
      select 1 from public.fixture_requests fr
      where fr.id = offers_counters.fixture_request_id
        and (fr.charterer_id = auth.uid() or fr.owner_id = auth.uid())
    )
  );

create policy offers_party_insert on public.offers_counters
  for insert with check (
    exists (
      select 1 from public.fixture_requests fr
      join public.profiles me on me.id = auth.uid()
      where fr.id = offers_counters.fixture_request_id
        and (
          (sender_role = 'charterer' and fr.charterer_id = auth.uid() and me.role = 'charterer')
          or
          (sender_role = 'owner' and fr.owner_id = auth.uid() and me.role = 'owner')
        )
    )
  );

create policy offers_admin_all on public.offers_counters
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- chat_messages policies --------------------------------------
-- Charterer can read/write only charterer_broker thread for their fixture.
-- Owner can read/write only broker_owner thread for their fixture.
-- Admin sees and writes both.
drop policy if exists chat_charterer_rw  on public.chat_messages;
drop policy if exists chat_owner_rw      on public.chat_messages;
drop policy if exists chat_admin_all     on public.chat_messages;

create policy chat_charterer_rw on public.chat_messages
  for all using (
    chat_type = 'charterer_broker'
    and exists (
      select 1 from public.fixture_requests fr
      where fr.id = chat_messages.fixture_request_id
        and fr.charterer_id = auth.uid()
    )
  )
  with check (
    chat_type = 'charterer_broker'
    and sender_id = auth.uid()
    and exists (
      select 1 from public.fixture_requests fr
      where fr.id = chat_messages.fixture_request_id
        and fr.charterer_id = auth.uid()
    )
  );

create policy chat_owner_rw on public.chat_messages
  for all using (
    chat_type = 'broker_owner'
    and exists (
      select 1 from public.fixture_requests fr
      where fr.id = chat_messages.fixture_request_id
        and fr.owner_id = auth.uid()
    )
  )
  with check (
    chat_type = 'broker_owner'
    and sender_id = auth.uid()
    and exists (
      select 1 from public.fixture_requests fr
      where fr.id = chat_messages.fixture_request_id
        and fr.owner_id = auth.uid()
    )
  );

create policy chat_admin_all on public.chat_messages
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =========================================================================
-- Storage policies for the q88-files bucket
-- (Bucket itself must be created in the Storage UI first, named "q88-files",
-- set Private. Then this section will work.)
-- =========================================================================

-- Owners may upload/read/update/delete files only under their own folder:
--   q88-files/<owner_uuid>/<filename>
-- This is enforced by checking the first path segment equals auth.uid().

drop policy if exists q88_owner_select on storage.objects;
drop policy if exists q88_owner_insert on storage.objects;
drop policy if exists q88_owner_update on storage.objects;
drop policy if exists q88_owner_delete on storage.objects;
drop policy if exists q88_admin_all    on storage.objects;

create policy q88_owner_select on storage.objects
  for select using (
    bucket_id = 'q88-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy q88_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'q88-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy q88_owner_update on storage.objects
  for update using (
    bucket_id = 'q88-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy q88_owner_delete on storage.objects
  for delete using (
    bucket_id = 'q88-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy q88_admin_all on storage.objects
  for all using (
    bucket_id = 'q88-files'
    and public.is_admin(auth.uid())
  )
  with check (
    bucket_id = 'q88-files'
    and public.is_admin(auth.uid())
  );

-- =========================================================================
-- Public share endpoint
-- The charterer-facing public link does NOT use auth.uid(). Instead, expose
-- a security-definer function that returns one vessel's commercial fields
-- by share token. The app calls it via supabase.rpc('public_vessel_by_token').
-- =========================================================================

create or replace function public.public_vessel_by_token(token uuid)
returns table (
  vessel_name        text,
  imo_number         text,
  dwt                numeric,
  year_built         int,
  flag               text,
  class_society      text,
  loa                numeric,
  beam               numeric,
  max_draft          numeric,
  cargo_capacity_cbm numeric,
  number_of_tanks    int,
  tank_coating       text,
  pumps              text,
  heating_coils      boolean,
  imo_class          text,
  sire_status        text,
  cdi_status         text,
  last_3_cargoes     text,
  trading_area       text,
  opening_port       text,
  opening_date       date,
  remarks            text
)
language sql stable security definer set search_path = public as $$
  select
    v.vessel_name, v.imo_number, v.dwt, v.year_built, v.flag, v.class_society,
    v.loa, v.beam, v.max_draft, v.cargo_capacity_cbm, v.number_of_tanks,
    v.tank_coating, v.pumps, v.heating_coils, v.imo_class, v.sire_status,
    v.cdi_status, v.last_3_cargoes, v.trading_area, v.opening_port,
    v.opening_date, v.remarks
  from public.vessels v
  where v.public_share_token = token
    and v.status = 'Open';
$$;

revoke all on function public.public_vessel_by_token(uuid) from public;
grant execute on function public.public_vessel_by_token(uuid) to anon, authenticated;

-- =========================================================================
-- OPTIONAL: sample data for testing.
-- Uncomment AFTER signing up at least one owner via the app, then replace
-- '00000000-0000-0000-0000-000000000000' with that owner's UUID from
-- public.profiles.
-- =========================================================================

-- insert into public.vessels
--   (owner_id, vessel_name, imo_number, dwt, year_built, flag, class_society,
--    loa, beam, max_draft, cargo_capacity_cbm, number_of_tanks, tank_coating,
--    pumps, heating_coils, imo_class, sire_status, cdi_status, last_3_cargoes,
--    trading_area, opening_port, opening_date, status, remarks)
-- values
--   ('00000000-0000-0000-0000-000000000000', 'MT Aegean Pioneer', '9876543',
--    49999, 2018, 'Marshall Islands', 'LR', 183.0, 32.2, 13.2, 55000, 12,
--    'Epoxy', '3 x 600 m3/h', true, 'II/III', 'Valid', 'Valid',
--    'ULSD / Jet A1 / Naphtha', 'Worldwide', 'Fujairah', current_date + 7,
--    'Open', 'Last DD 03/2025'),
--   ('00000000-0000-0000-0000-000000000000', 'MT Black Sea Star', '9123456',
--    37000, 2014, 'Liberia', 'DNV', 175.0, 30.0, 12.5, 41000, 10,
--    'Marineline', '3 x 500 m3/h', true, 'II', 'Valid', 'Valid',
--    'Gasoil / VGO / Naphtha', 'Med / Black Sea', 'Tuapse', current_date + 12,
--    'Open', null);

-- =========================================================================
-- End of schema.
-- =========================================================================
