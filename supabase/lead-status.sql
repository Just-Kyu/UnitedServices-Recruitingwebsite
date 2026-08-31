-- United Services — follow-up status on inbound leads
--
-- Run this ONCE in the Supabase SQL Editor. It is optional: the admin leads
-- page works without it and simply hides the status control. With it, every
-- lead can be moved through new → contacted → placed → closed so nobody gets
-- called twice and nobody gets forgotten.

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
