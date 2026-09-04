-- United Services — richer carrier offers + driver names
--
-- Run this ONCE in the Supabase SQL Editor (after admin-schema.sql).
-- Everything here is additive: existing rows keep working and the new columns
-- are simply empty until the admin fills them in. The admin form also drops
-- any column this file has not created yet rather than losing the offer, so
-- running it is what turns those fields on.

-- ============================ offers ============================
alter table public.offers add column if not exists logo_url   text;    -- carrier logo (data URL or storage URL)
alter table public.offers add column if not exists home_time  text;    -- "3-4 weeks out" | "Home weekends"
alter table public.offers add column if not exists escrow     text;    -- "$1,500 refundable" | "No escrow"
alter table public.offers add column if not exists avg_miles  integer; -- typical weekly miles, seeds the calculator

-- Hiring as a company driver or as an owner operator. The gross columns are
-- the weekly company gross an owner operator can expect, and are left null
-- for company-driver offers.
alter table public.offers add column if not exists offer_type text not null default 'company';
alter table public.offers add column if not exists gross_min  numeric;
alter table public.offers add column if not exists gross_max  numeric;

-- Rate per mile is quoted as a band, not a single number.
alter table public.offers add column if not exists rpm_min    numeric;
alter table public.offers add column if not exists rpm_max    numeric;

-- One offer usually covers several trailer types and several route types.
-- The original single-value columns stay and are kept in step with the first
-- pick, so anything still reading offers.equipment / offers.route works.
alter table public.offers add column if not exists equipment_list text[];
alter table public.offers add column if not exists route_list     text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offers_offer_type_chk') then
    alter table public.offers add constraint offers_offer_type_chk
      check (offer_type in ('company', 'owner_operator'));
  end if;
end $$;

-- Backfill the lists from whatever single values are already stored, so the
-- board filters keep matching rows created before this migration.
update public.offers set equipment_list = array[equipment]
  where equipment_list is null and equipment is not null;
update public.offers set route_list = array[route]
  where route_list is null and route is not null;

-- If an older rpm column exists, fold it into the new range and drop it.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'offers' and column_name = 'rpm') then
    execute 'update public.offers set rpm_min = coalesce(rpm_min, rpm), rpm_max = coalesce(rpm_max, rpm)';
    execute 'alter table public.offers drop column rpm';
  end if;
end $$;

-- sign_on and insurance were dropped from the admin form; remove the columns
-- so nothing writes to them by accident.
alter table public.offers drop column if exists sign_on;
alter table public.offers drop column if exists insurance;

-- The board filters on equipment and route.
create index if not exists offers_equipment_list_idx on public.offers using gin (equipment_list);
create index if not exists offers_route_list_idx     on public.offers using gin (route_list);

-- ============================ drivers ============================
-- The board leads with the driver's NAME now; the old handle ("Driver #1042")
-- stays as the secondary reference id.
alter table public.drivers add column if not exists name text;

-- The public views (published-views.sql) select explicit column lists, so
-- refresh them if you use them; the site reads the tables directly by default.
