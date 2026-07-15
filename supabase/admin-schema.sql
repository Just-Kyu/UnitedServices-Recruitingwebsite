-- United Services — admin-managed marketplace tables
-- Run this ONCE in the Supabase SQL Editor (after schema.sql).
--
-- Two tables the admin curates from the /admin portal, and that the public
-- boards read from:
--   * offers  — carrier job offers shown to drivers (offers.html + homepage)
--   * drivers — available-driver cards shown to carriers (for-companies.html)
--
-- Security model:
--   * anon (the public site) can SELECT only rows where is_published = true.
--   * authenticated (the logged-in admin) can do EVERYTHING (add/edit/delete/
--     unpublish). So a random visitor with the public key can read the live
--     board but cannot create or tamper with listings.
--   * To log in, create one Supabase Auth user (see supabase/ADMIN-SETUP.md):
--       email: admin@unitedservices.app   password: sean0102

-- ============================ offers ============================
create table if not exists public.offers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  company       text not null,
  location      text,                 -- "Columbus, OH"
  route         text,                 -- OTR | Regional | Local | Dedicated
  equipment     text,                 -- Dry Van | Reefer | Flatbed | ...
  pay           text,                 -- "$0.62/mi" | "$1,500/wk" | "$26/hr"
  tags          text[],               -- ["CDL-A","2+ yrs","No-touch"]
  badge         text default 'Hiring now',
  notes         text,
  is_published  boolean not null default true
);
create index if not exists offers_pub_idx on public.offers (is_published, created_at desc);

-- ============================ drivers ============================
create table if not exists public.drivers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  handle        text,                 -- shown as "Driver #1042" or an alias
  location      text,                 -- "Dallas, TX"
  cdl_class     text default 'CDL-A',
  years         text,                 -- "3 yrs" | "New"
  exp_level     text,                 -- no | mid | sr  (drives the board filter)
  equipment     text,                 -- Dry Van | Reefer | ...
  route         text,                 -- OTR | Regional | Local | Dedicated
  clearance     text default 'Clean record',  -- "SAP-cleared" | "Clean record"
  notes         text,
  is_published  boolean not null default true
);
create index if not exists drivers_pub_idx on public.drivers (is_published, created_at desc);

-- ============================ RLS ============================
alter table public.offers  enable row level security;
alter table public.drivers enable row level security;

drop policy if exists offers_public_read  on public.offers;
create policy offers_public_read  on public.offers  for select to anon           using (is_published = true);
drop policy if exists offers_admin_all     on public.offers;
create policy offers_admin_all     on public.offers  for all    to authenticated  using (true) with check (true);

drop policy if exists drivers_public_read on public.drivers;
create policy drivers_public_read on public.drivers for select to anon           using (is_published = true);
drop policy if exists drivers_admin_all    on public.drivers;
create policy drivers_admin_all    on public.drivers for all    to authenticated  using (true) with check (true);

grant select on public.offers,  public.drivers to anon;
grant all    on public.offers,  public.drivers to authenticated;

-- Let the admin also read/manage the inbound lead tables from the portal.
drop policy if exists driver_leads_admin_all  on public.driver_leads;
create policy driver_leads_admin_all  on public.driver_leads  for all to authenticated using (true) with check (true);
drop policy if exists company_leads_admin_all on public.company_leads;
create policy company_leads_admin_all on public.company_leads for all to authenticated using (true) with check (true);
grant select, update, delete on public.driver_leads, public.company_leads to authenticated;

-- ============================ seed ============================
-- A few starter listings so the boards aren't empty before you add your own.
insert into public.offers (company, location, route, equipment, pay, tags, badge) values
  ('Cardinal Freightways', 'Columbus, OH', 'OTR',      'Dry Van', '$0.62/mi', array['CDL-A','2+ yrs','No-touch'],   'Hiring now'),
  ('Ironwood Carriers',    'Dallas, TX',   'Regional',  'Flatbed', '$1,500/wk', array['CDL-A','Home weekends'],       'Hiring now'),
  ('Summit Hauling Co.',   'Phoenix, AZ',  'OTR',       'Dry Van', 'Paid CDL',  array['No experience','Training'],    'Paid CDL'),
  ('Polar Line Logistics', 'Chicago, IL',  'OTR',       'Reefer',  '$0.64/mi',  array['CDL-A','$5k sign-on'],         'Hiring now'),
  ('Meridian Transport',   'Atlanta, GA',  'Regional',  'Dry Van', '$1,450/wk', array['CDL-A','SAP friendly'],        'Hiring now'),
  ('Crossroads Express',   'Newark, NJ',   'Local',     'Dry Van', '$26/hr',    array['CDL-A','Home daily'],          'Hiring now')
on conflict do nothing;

insert into public.drivers (handle, location, cdl_class, years, exp_level, equipment, route, clearance) values
  ('Driver #1042', 'Dallas, TX',     'CDL-A', '3 yrs',  'mid', 'Flatbed', 'OTR',      'SAP-cleared'),
  ('Driver #1058', 'Columbus, OH',   'CDL-A', '7 yrs',  'sr',  'Reefer',  'Regional', 'Clean record'),
  ('Driver #1071', 'Newark, NJ',     'CDL-A', '2 yrs',  'mid', 'Dry Van', 'Local',    'SAP-cleared'),
  ('Driver #1085', 'Houston, TX',    'CDL-A', '11 yrs', 'sr',  'Tanker',  'OTR',      'Clean record'),
  ('Driver #1104', 'Chicago, IL',    'CDL-A', '1 yr',   'mid', 'Reefer',  'OTR',      'SAP-cleared'),
  ('Driver #1118', 'Charlotte, NC',  'CDL-A', 'New',    'no',  'Dry Van', 'Regional', 'Clean record')
on conflict do nothing;
