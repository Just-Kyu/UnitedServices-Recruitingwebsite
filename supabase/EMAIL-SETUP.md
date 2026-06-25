# Email Notification Setup

Quick guide to wiring `notify-lead` so every new driver / carrier submission emails you within a few seconds.

## 1. Resend account (~3 min)

1. Go to **resend.com** → sign up (Google sign-in is fine).
2. **API Keys** in the sidebar → **Create API Key** → name it `united-services` → permissions: **Sending access** → **Create**.
3. Copy the key (starts with `re_…`). It's shown once — save it now.

**Sender domain:** For testing you can send from `onboarding@resend.dev` immediately, no setup required. For production you should add and verify `unitedservices.com` (or whatever domain you use) under Resend → Domains.

## 2. Deploy the Edge Function

In Supabase:

1. Sidebar → **Edge Functions** → **Deploy a new function**.
2. **Function name:** `notify-lead`
3. Paste the contents of `supabase/functions/notify-lead/index.ts` into the editor.
4. Click **Deploy function**.

## 3. Add the secrets

Still on the `notify-lead` function page:

1. Click the **Secrets** tab (or "Add secret").
2. Add these three:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the `re_…` key from step 1 |
| `NOTIFY_TO` | your inbox, e.g. `ismoilovquvonchbek02052004@gmail.com` |
| `NOTIFY_FROM` | `United Services <onboarding@resend.dev>` (until you verify a domain) |

## 4. Wire the database webhooks

Sidebar → **Database** → **Webhooks** → **Create a new webhook**.

**Driver-lead webhook:**
- Name: `notify-driver-lead`
- Table: `driver_leads`
- Events: ✅ Insert only
- Type: **HTTP Request**
- Method: `POST`
- URL: `https://murjqizyaphgizgbkhlm.supabase.co/functions/v1/notify-lead`
- HTTP Headers:
  - `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>` (from Settings → API Keys, the `service_role` one)
  - `Content-Type`: `application/json`
- Click **Create webhook**.

**Carrier-lead webhook:** same as above but:
- Name: `notify-company-lead`
- Table: `company_leads`

## 5. Test

1. Open the live site → Apply form → submit a test driver lead.
2. Within ~10 seconds, check your inbox — you should see "New driver lead — …" with all the details.
3. Repeat with the For-Companies form to confirm `company_leads` is wired.

If nothing arrives:
- **Edge Functions → notify-lead → Logs** in Supabase shows the function's stdout/stderr.
- **Resend → Logs** shows whether the email was accepted by Resend and the delivery status.

## What this does NOT yet do

- Doesn't send a confirmation email to the applicant (could be added — just another Resend call).
- Doesn't notify by SMS (Twilio integration is a Phase 2 add-on).
- Doesn't dedupe — if you set up multiple webhooks pointing at the same function you'll get duplicate emails.
- Doesn't include rate limiting — the anon form on the public site has no per-IP throttle yet. Adding Cloudflare Turnstile to the forms is the right Phase 2 fix.
