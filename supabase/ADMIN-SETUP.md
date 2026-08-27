# Admin Portal — one-time setup

The admin portal lives at **`/admin`** (there's an **Admin** link in the navbar).
From it you add and manage the **offers** and **drivers** that show on the public
site, and view everyone who submitted the Apply / Partner forms.

It's genuinely gated — only the logged-in admin can write. The public site can
only *read* published listings. Two quick steps to turn it on:

## 1. Run the SQL
Supabase → **SQL Editor** → New query → paste **`supabase/admin-schema.sql`** → **Run**.
This creates the `offers` and `drivers` tables, the security rules, and seeds a
few starter listings so the boards aren't empty.

## 2. Create the admin login
Supabase → **Authentication** → **Users** → **Add user** → **Create new user**:

- **Email:** `<your admin email>`
- **Password:** `<in the team password manager>`
- ✅ **Auto Confirm User** (so it works without an email round-trip)

That's it. Go to **`/admin`**, sign in with username **`admin`** and password
**`<in the team password manager>`** (the portal maps `admin` → `<your admin email>` for you).

> Want different credentials? Create the auth user with any email + password,
> then log in with that email (the username box accepts a full email too).

## What you can do
- **Offers** — add carrier job offers (company, location, route, equipment, pay,
  tags, badge). They appear on the homepage "offers today" strip and the
  **Available offers** board. Toggle **Live/Draft** to show/hide, or delete.
- **Drivers** — add available-driver cards (shown to carriers on **For Companies**).
- **Inbound leads** — read-only list of everyone who submitted the Apply or
  Partner forms, with their contact details (visible to you only, never public).

## Security notes
- Writes require the Supabase **auth session** — the anon key the public site
  uses can't create or change listings, only read published ones. So exposing
  the `/admin` link is safe.
- Change the password anytime in Supabase → Authentication → Users.
- The login is one shared admin account. If you later want per-person logins or
  roles, add more Supabase users — the same policies apply to all authenticated
  users.

> **Never commit the password.** It was previously written into this file and
> into `admin-schema.sql`, so it still exists in this repository's git history.
> Rotating it in Supabase → Authentication → Users is what actually protects
> the account — editing these files does not.

## Moving the admin account to an address you control

The original account was `admin@unitedservices.app` — a domain nobody on the
team owns. That matters: Supabase sends password-recovery mail to the
account's address, so whoever controls that domain can take the account over.

1. **Supabase → Authentication → Users → Add user → Create new user.**
   Use an email you actually receive mail at, set a long random password, and
   tick **Auto Confirm User** so no verification email is needed.
2. **Sign in at `/admin`** with that full email address to confirm it works.
   The login field accepts either a full email or a bare username (a username
   gets `@us-unitedservices.com` appended — see `ADMIN_DOMAIN` in
   `js/admin.js`).
3. **Delete the old `admin@unitedservices.app` user** from the same screen.

There is no need for access to the old mailbox to do any of this — creating
and deleting users from the dashboard doesn't send mail when Auto Confirm is
on.
