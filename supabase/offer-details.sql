-- United Services — richer offer details + driver names
--
-- Run this ONCE in the Supabase SQL Editor (after admin-schema.sql).
-- Everything here is additive: existing rows keep working, the new columns
-- are simply empty until the admin fills them in.

-- ============================ offers ============================
alter table public.offers add column if not exists logo_url   text;    -- carrier logo (data URL or storage URL)
alter table public.offers add column if not exists home_time  text;    -- "Every 2-3 weeks" | "Home weekends"
alter table public.offers add column if not exists escrow     text;    -- "$1,500 · refundable" | "None"
alter table public.offers add column if not exists sign_on    text;    -- "$5,000 sign-on"
alter table public.offers add column if not exists insurance  text;    -- "Health + dental after 60 days"
alter table public.offers add column if not exists rpm        numeric; -- base rate per mile, drives the pay calculator
alter table public.offers add column if not exists avg_miles  integer; -- typical weekly miles, seeds the calculator

-- ============================ drivers ============================
-- The board leads with the driver's NAME now; the old handle ("Driver #1042")
-- stays as the secondary reference id.
alter table public.drivers add column if not exists name text;

-- The public views (published-views.sql) select explicit column lists, so
-- refresh them if you use them; the site reads the tables directly by default.
