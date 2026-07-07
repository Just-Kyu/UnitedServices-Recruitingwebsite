-- United Services — SECURITY FIX (run this in the Supabase SQL Editor NOW,
-- even if you already ran published-views.sql — this supersedes part of it).
--
-- Problem: published-views.sql granted the anon role SELECT on the BASE
-- tables (gated only by is_published). The public boards were meant to read
-- the PII-free views, but nothing stopped a direct PostgREST query like
--   /rest/v1/driver_leads?select=name,phone,email
-- from returning contact info for every published lead. That's a PII leak.
--
-- Fix: drop the base-table SELECT policies entirely and switch the views to
-- definer semantics (the view owner bypasses RLS; anon can only see the
-- columns the view exposes). The anon key can then:
--   * INSERT leads (the forms)            — unchanged
--   * SELECT from published_offers        — no contact info in the view
--   * SELECT from published_drivers      — no PII in the view
--   * read the base tables               — DENIED

-- 1. Remove the leaky policies
drop policy if exists "anon_select_published_company_leads" on public.company_leads;
drop policy if exists "anon_select_published_driver_leads"  on public.driver_leads;

-- 2. Recreate the views with definer semantics (security_invoker = false)
drop view if exists public.published_offers;
create view public.published_offers
with (security_invoker = false)
as
select id, created_at, company, equipment, hire_count, notes
from public.company_leads
where is_published = true;

drop view if exists public.published_drivers;
create view public.published_drivers
with (security_invoker = false)
as
select id, created_at, cdl_class, years, equipment, route,
       sap_status, location, notes
from public.driver_leads
where is_published = true;

-- 3. Grants: anon + authenticated may read the views only
grant select on public.published_offers  to anon, authenticated;
grant select on public.published_drivers to anon, authenticated;

-- 4. Belt and suspenders: make sure anon has no direct table privileges
revoke select, update, delete on public.driver_leads  from anon;
revoke select, update, delete on public.company_leads from anon;
-- (INSERT stays allowed via the existing anon_insert_* policies + default
-- table grant; if inserts stop working, run:
--   grant insert on public.driver_leads, public.company_leads to anon; )

-- 5. Verify (should error with permission denied):
--   set role anon; select name from public.driver_leads limit 1;
