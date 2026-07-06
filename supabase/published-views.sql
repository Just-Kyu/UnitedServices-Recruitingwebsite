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
with (security_invoker = false)
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
with (security_invoker = false)
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
-- Grants: anon reads the PII-free views ONLY — never the base tables
-- =====================================================================
-- The views run with definer semantics (security_invoker = false), so the
-- view owner bypasses RLS and anon sees exactly the columns projected above.
-- Do NOT add SELECT policies on the base tables for anon: that would let a
-- direct PostgREST query (e.g. ?select=name,phone,email) read contact info.

grant select on public.published_offers  to anon, authenticated;
grant select on public.published_drivers to anon, authenticated;

revoke select, update, delete on public.driver_leads  from anon;
revoke select, update, delete on public.company_leads from anon;
