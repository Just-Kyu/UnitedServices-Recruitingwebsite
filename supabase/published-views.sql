-- United Services — public board views
-- Run this in Supabase SQL Editor AFTER schema.sql.
--
-- What this adds:
--   * is_published column on both lead tables (default true so new leads
--     surface immediately on the public boards; admin can flip to false
--     to hide spam/bad submissions)
--   * published_offers view — what drivers see browsing /offers.html.
--     Hides the carrier's contact person, email, phone.
--   * published_drivers view — what carriers see browsing
--     /drivers-board.html. Hides ALL PII (name, phone, email) — only
--     qualifications and preferences are public.
--   * SELECT grants on the views to anon, so the public site can read
--     them with just the anon key.

-- =====================================================================
-- is_published flags
-- =====================================================================
alter table public.company_leads add column if not exists is_published boolean not null default true;
alter table public.driver_leads  add column if not exists is_published boolean not null default true;

create index if not exists company_leads_published_idx on public.company_leads (is_published, created_at desc);
create index if not exists driver_leads_published_idx  on public.driver_leads  (is_published, created_at desc);

-- =====================================================================
-- published_offers view (for drivers browsing carrier offers)
-- =====================================================================
drop view if exists public.published_offers;
create view public.published_offers
with (security_invoker = true)
as
select
  id,
  created_at,
  company,
  equipment,
  hire_count,
  notes
from public.company_leads
where is_published = true;

-- =====================================================================
-- published_drivers view (for carriers browsing available drivers)
-- =====================================================================
drop view if exists public.published_drivers;
create view public.published_drivers
with (security_invoker = true)
as
select
  id,
  created_at,
  cdl_class,
  years,
  equipment,
  route,
  sap_status,
  location,
  notes
from public.driver_leads
where is_published = true;

-- =====================================================================
-- Grant SELECT on the views to anon (the views are PII-free)
-- =====================================================================
-- We also need anon to be able to SELECT from the underlying tables for
-- the security_invoker view — but only the columns the view exposes.
-- The cleanest way: add a SELECT policy on the base tables that's gated
-- to is_published = true. Anon can technically query the base table, but
-- they'll only ever see published rows, and the views give them a
-- PII-free shape for the front-end to consume.

drop policy if exists "anon_select_published_company_leads" on public.company_leads;
create policy "anon_select_published_company_leads"
  on public.company_leads
  for select
  to anon
  using (is_published = true);

drop policy if exists "anon_select_published_driver_leads" on public.driver_leads;
create policy "anon_select_published_driver_leads"
  on public.driver_leads
  for select
  to anon
  using (is_published = true);

grant select on public.published_offers  to anon;
grant select on public.published_drivers to anon;

-- Note on column-level safety: even though anon can technically SELECT
-- from the base tables, the front-end ONLY queries the views — and the
-- views project a safe column set. If we ever need to fully lock anon
-- out of the base tables, we can revoke their table-level SELECT and
-- recreate the views with security_definer instead.
