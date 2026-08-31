-- United Services — extra columns on the inbound lead tables
--
-- Run this ONCE in the Supabase SQL Editor. Both parts are optional and the
-- site keeps working without them:
--
--   status        follow-up tracking in the admin. Without the column the
--                 status control is simply hidden.
--   weekly_miles  the "miles you can run per week" answer on the apply form.
--                 Without the column the form drops that one field and still
--                 saves the application.
--
-- ===================== follow-up status =====================

alter table public.driver_leads
  add column if not exists status text not null default 'new';
alter table public.company_leads
  add column if not exists status text not null default 'new';

-- Keep the values to the four the admin UI offers.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'driver_leads_status_chk') then
    alter table public.driver_leads add constraint driver_leads_status_chk
      check (status in ('new', 'contacted', 'placed', 'closed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'company_leads_status_chk') then
    alter table public.company_leads add constraint company_leads_status_chk
      check (status in ('new', 'contacted', 'placed', 'closed'));
  end if;
end $$;

-- The admin list filters and sorts on status + recency.
create index if not exists driver_leads_status_idx  on public.driver_leads  (status, created_at desc);
create index if not exists company_leads_status_idx on public.company_leads (status, created_at desc);

-- The signed-in admin already holds update rights from admin-schema.sql; this
-- is here so a fresh project that skipped that file still works.
grant select, update, delete on public.driver_leads, public.company_leads to authenticated;

-- ===================== weekly miles =====================
-- The apply form asks how many miles a driver can run in a week, as a band
-- ('2,500–3,000'). Text, not a number, because a range is the honest answer.
alter table public.driver_leads
  add column if not exists weekly_miles text;
