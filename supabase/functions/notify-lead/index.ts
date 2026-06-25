/*
 * United Services — notify-lead Edge Function
 *
 * Receives a Supabase Database Webhook payload when a new row lands in
 * driver_leads or company_leads, formats a short email, and sends it
 * via Resend. The result: a notification in the admin inbox the moment
 * someone applies or posts an offer.
 *
 * Deploy via the Supabase dashboard:
 *   Project → Edge Functions → "Deploy a new function"
 *   Name: notify-lead
 *   Paste this entire file as the function body.
 *
 * Required env vars (Project → Edge Functions → notify-lead → Settings):
 *   RESEND_API_KEY  — from resend.com/api-keys
 *   NOTIFY_TO       — your inbox, e.g. ismoilovquvonchbek02052004@gmail.com
 *   NOTIFY_FROM     — verified Resend sender, e.g. "United Services <onboarding@resend.dev>"
 *                     (use onboarding@resend.dev while testing; verify a real
 *                     domain in Resend before going national)
 *
 * Wire the webhook (Project → Database → Webhooks → Create a new webhook):
 *   - Name: notify-driver-lead   Table: driver_leads   Events: Insert
 *     Type: HTTP request → Method: POST
 *     URL: https://<project-ref>.supabase.co/functions/v1/notify-lead
 *     HTTP Headers: Authorization: Bearer <your service_role key>
 *   - Repeat for company_leads as notify-company-lead.
 */

// @ts-ignore — Supabase Edge runtime resolves this at deploy time.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

interface WebhookPayload {
  type: string;            // "INSERT" | "UPDATE" | "DELETE"
  table: string;           // "driver_leads" | "company_leads"
  schema: string;          // "public"
  record: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
}

function envOrThrow(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function summarize(table: string, rec: Record<string, unknown>): { subject: string; html: string; text: string } {
  if (table === "driver_leads") {
    const eq = Array.isArray(rec.equipment) ? (rec.equipment as string[]).join(", ") : (rec.equipment ?? "—");
    const subject = `New driver lead — ${rec.name ?? "(no name)"} · ${rec.cdl_class ?? "—"} · ${rec.years ?? "—"}`;
    const lines: [string, unknown][] = [
      ["Ref", rec.ref],
      ["Name", rec.name],
      ["Phone", rec.phone],
      ["Email", rec.email],
      ["CDL class", rec.cdl_class],
      ["Experience", rec.years],
      ["Equipment", eq],
      ["Route", rec.route],
      ["SAP status", rec.sap_status],
      ["Location", rec.location],
      ["Notes", rec.notes],
    ];
    return renderEmail(subject, "Driver application", lines);
  }
  if (table === "company_leads") {
    const subject = `New carrier offer — ${rec.company ?? "(no company)"} · ${rec.equipment ?? "—"}`;
    const lines: [string, unknown][] = [
      ["Ref", rec.ref],
      ["Company", rec.company],
      ["Contact name", rec.name],
      ["Email", rec.email],
      ["Phone", rec.phone],
      ["Equipment", rec.equipment],
      ["Hiring", rec.hire_count],
      ["Notes", rec.notes],
    ];
    return renderEmail(subject, "Carrier partner request", lines);
  }
  return renderEmail(`New ${table} row`, table, Object.entries(rec));
}

function renderEmail(subject: string, header: string, lines: [string, unknown][]) {
  const rows = lines
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) =>
      `<tr><td style="padding:6px 14px 6px 0;color:#6e7a8a;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:6px 0;color:#0b1320;font-size:14px;">${escapeHtml(v)}</td></tr>`
    )
    .join("");
  const text = lines
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0b1320;">
<div style="max-width:580px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6eaf0;">
  <div style="padding:22px 28px;background:linear-gradient(135deg,#0e1a2e,#1a2a44);color:#fff;">
    <div style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.7;">United Services · Recruiting</div>
    <div style="font-size:20px;font-weight:700;margin-top:8px;">${escapeHtml(header)}</div>
  </div>
  <div style="padding:24px 28px;">
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="margin-top:24px;color:#6e7a8a;font-size:12px;line-height:1.6;">Reach out via the contact info above, or open the lead in Supabase (Table Editor) to mark it contacted/placed.</p>
  </div>
</div>
</body></html>`;
  return { subject, html, text };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (payload.type !== "INSERT" || !payload.record) {
    return new Response("Ignored (not an insert)", { status: 200 });
  }

  let RESEND_API_KEY: string, NOTIFY_TO: string, NOTIFY_FROM: string;
  try {
    RESEND_API_KEY = envOrThrow("RESEND_API_KEY");
    NOTIFY_TO      = envOrThrow("NOTIFY_TO");
    NOTIFY_FROM    = envOrThrow("NOTIFY_FROM");
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }

  const { subject, html, text } = summarize(payload.table, payload.record);

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      subject,
      html,
      text,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error("Resend failed:", resp.status, body);
    return new Response(`Resend error ${resp.status}`, { status: 502 });
  }
  return new Response("ok", { status: 200 });
});
