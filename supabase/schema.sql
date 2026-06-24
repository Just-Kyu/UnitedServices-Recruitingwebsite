-- United Services — initial schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
--
-- What this creates:
--   * driver_leads   — every driver who submits the Apply form
--   * company_leads  — every carrier who submits the For-Companies form
--   * RLS policies   — public can INSERT (so the forms work from the browser
--                       using only the anon key) but cannot SELECT anyone's
--                       data. Only the service_role (you, signed in to the
--                       dashboard) can read leads.

-- =====================================================================
-- driver_leads
-- =====================================================================
create table if not exists public.driver_leads (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,
  created_at    timestamptz not null default now(),

  -- contact
  name          text not null,
  phone         text not null,
  email         text not null,

  -- experience
  cdl_class     text,                  -- 'CDL-A' | 'CDL-B' | 'CDL-C' | 'No CDL yet'
  years         text,                  -- e.g. '2–3 years'
  equipment     text[],                -- multi-select: ['Dry Van','Reefer',...]
  route         text,                  -- 'OTR' | 'Regional' | 'Local' | 'Dedicated'

  -- details
  sap_status    text,                  -- 'Yes — SAP' | 'No'
  location      text,                  -- free text: city + preferred states
  notes         text,

  -- metadata
  source        text default 'apply-form',
  user_agent    text
);

create index if not exists driver_leads_created_at_idx on public.driver_leads (created_at desc);
create index if not exists driver_leads_cdl_class_idx  on public.driver_leads (cdl_class);
create index if not exists driver_leads_route_idx      on public.driver_leads (route);

-- =====================================================================
-- company_leads
-- =====================================================================
create table if not exists public.company_leads (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique,
  created_at    timestamptz not null default now(),

  -- contact
  company       text not null,
  name          text not null,         -- contact person at the carrier
  email         text not null,
  phone         text,

  -- offer details
  equipment     text,                  -- single select: 'Dry Van' | 'Mixed fleet' | ...
  hire_count    text,                  -- '1–5' | '6–15' | '16–50' | '50+'
  notes         text,                  -- lanes, home-time, pay range, clearance

  -- metadata
  source        text default 'companies-form',
  user_agent    text
);

create index if not exists company_leads_created_at_idx on public.company_leads (created_at desc);

-- =====================================================================
-- Row Level Security
-- =====================================================================
-- Enable RLS so the anon key cannot read or modify anything by default.
alter table public.driver_leads  enable row level security;
alter table public.company_leads enable row level security;

-- Allow anyone (anon key) to submit a lead. No SELECT/UPDATE/DELETE policy is
-- added for anon, so the public can't read other people's submissions.
drop policy if exists "anon_insert_driver_leads" on public.driver_leads;
create policy "anon_insert_driver_leads"
  on public.driver_leads
  for insert
  to anon
  with check (true);

drop policy if exists "anon_insert_company_leads" on public.company_leads;
create policy "anon_insert_company_leads"
  on public.company_leads
  for insert
  to anon
  with check (true);

-- Note: when you view the tables in the Supabase dashboard, you're using the
-- service_role key, which bypasses RLS entirely — you'll see every row.
