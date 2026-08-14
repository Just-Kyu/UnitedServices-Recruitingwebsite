/* United Services Recruiting — SINGLE SOURCE OF TRUTH.
 *
 * The matcher and the board both import from here. Neither keeps its own
 * copy — that is what let them show contradictory inventory before.
 *
 * Live rows come from Supabase — the same tables the admin portal writes to —
 * over its PostgREST API with plain fetch. No supabase-js: the anon key can
 * only do what Row Level Security allows (read published rows, insert leads),
 * and a fetch keeps the whole site's JS a tenth the size of the client lib.
 *
 * If the fetch fails or a table is empty we fall back to EXAMPLES, which are
 * flagged `isExample` and rendered WITHOUT an apply button and with a visible
 * "example" label — a placeholder must never pass as a live opening.
 */

/* Anon key: public by design, constrained by RLS. */
const SB_URL = 'https://murjqizyaphgizgbkhlm.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmpxaXp5YXBoZ2l6Z2JraGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTAxNzgsImV4cCI6MjA5Nzg4NjE3OH0.a7E1T5xgTx5dPg3VqIMotdOPIdF4A-w1CxzkLM3y1Ow';

function timeoutSignal(ms) {
  if ('timeout' in AbortSignal) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function rest(path, opts = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      ...(opts.body ? { 'Content-Type': 'application/json', Prefer: 'return=minimal' } : {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: timeoutSignal(8000)
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return opts.body ? null : res.json();
}

export const CONTACT = {
  phone: '+14402968338',
  phoneDisplay: '(440) 296-8338',
  sms: '+14402968338',
  email: 'recruiting@us-unitedservices.com',
  site: 'us-unitedservices.com'
  // NOTE: no physical address, USDOT or MC number is published until a real
  // one is supplied. Never borrow a carrier's numbers for the agency.
};

export const EQUIPMENT = ['Dry Van', 'Flatbed', 'Reefer', 'Step Deck', 'Tanker', 'Power Only', 'Car Hauler'];
export const ROUTES = ['OTR', 'Regional', 'Local', 'Dedicated', 'Team'];

/* Filter chips. `test` runs against a normalised offer. */
export const CHIPS = [
  { key: 'dryvan',  label: 'Dry van',        test: o => o.equipment === 'Dry Van' },
  { key: 'flatbed', label: 'Flatbed',        test: o => o.equipment === 'Flatbed' },
  { key: 'reefer',  label: 'Reefer',         test: o => o.equipment === 'Reefer' },
  { key: 'stepdeck',label: 'Step deck',      test: o => o.equipment === 'Step Deck' },
  { key: 'tanker',  label: 'Tanker',         test: o => o.equipment === 'Tanker' },
  { key: 'power',   label: 'Power only',     test: o => o.equipment === 'Power Only' },
  { key: 'carhauler',label:'Car hauler',     test: o => o.equipment === 'Car Hauler' },
  { key: 'otr',     label: 'OTR',            test: o => o.route === 'OTR' },
  { key: 'regional',label: 'Regional',       test: o => o.route === 'Regional' },
  { key: 'local',   label: 'Local',          test: o => o.route === 'Local' },
  { key: 'team',    label: 'Team',           test: o => o.route === 'Team' },
  { key: 'owner',   label: 'Owner-operator', test: o => /owner|lease/i.test(o.requires) },
  { key: 'under1',  label: 'Under 1 yr',     test: o => /no experience|under 1|0-|recent grad/i.test(o.requires) },
  { key: 'sap',     label: 'SAP driver',     test: o => /sap/i.test(o.requires) }
];

/* Shown only when there is no live inventory. Deliberately unbranded — these
   describe role SHAPES we recruit for, not openings that exist today. */
const EXAMPLES = [
  { equipment: 'Dry Van',    route: 'OTR',      requires: 'CDL-A' },
  { equipment: 'Flatbed',    route: 'Regional', requires: 'CDL-A · 1 yr' },
  { equipment: 'Reefer',     route: 'OTR',      requires: 'CDL-A' },
  { equipment: 'Dry Van',    route: 'Regional', requires: 'CDL-A · SAP considered' },
  { equipment: 'Dry Van',    route: 'OTR',      requires: 'No experience · training route' },
  { equipment: 'Power Only', route: 'OTR',      requires: 'Owner-operator' }
].map((e, i) => ({
  id: 'example-' + i,
  carrier: 'Role we recruit for',
  city: '—',
  equipment: e.equipment,
  route: e.route,
  pay: { primary: 'Ask a recruiter', alt: null },
  homeTime: '—',
  requires: e.requires,
  isExample: true
}));

/* CDL-A has exactly one spelling. Anything else is a data-entry error and we
   want to hear about it in development rather than ship it. */
function assertSpelling(offer) {
  const bad = /\bCDL\s?[-–—]?\s?A\b/i.exec(offer.requires || '');
  if (bad && bad[0] !== 'CDL-A') {
    const msg = `Offer ${offer.id}: "${bad[0]}" — spell it CDL-A.`;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') throw new Error(msg);
    console.warn(msg);
  }
}

/* The only place that knows the Supabase column names. */
function normalise(row) {
  const pay = (row.pay || '').trim();
  const offer = {
    id: row.id != null ? String(row.id) : 'row',
    carrier: (row.company || '').trim() || 'Carrier on file',
    city: (row.location || '').trim() || '—',
    equipment: (row.equipment || '').trim(),
    route: (row.route || '').trim(),
    // One comparable figure up front; anything extra drops to a second line.
    pay: { primary: pay || 'Ask a recruiter', alt: (row.notes || '').trim() || null },
    homeTime: (row.badge || '').trim() || '—',
    requires: Array.isArray(row.tags) && row.tags.length ? row.tags.join(' · ') : 'CDL-A',
    isExample: false
  };
  assertSpelling(offer);
  return offer;
}

let offerCache = null;

export async function getOffers() {
  if (offerCache) return offerCache;
  try {
    const data = await rest('offers?select=id,company,location,route,equipment,pay,tags,badge,notes&is_published=eq.true&order=created_at.desc');
    if (data && data.length) {
      offerCache = data.map(normalise);
      return offerCache;
    }
  } catch (err) {
    console.warn('[data] live board unavailable, showing examples:', err && err.message);
  }
  offerCache = EXAMPLES;
  return offerCache;
}

/* ── driver pool (For Carriers page) ─────────────────────────────── */

const DRIVER_EXAMPLES = [
  { cdl: 'CDL-A', years: '5+ yrs', equipment: 'Dry Van',  route: 'OTR',      clearance: 'Clean record' },
  { cdl: 'CDL-A', years: '3 yrs',  equipment: 'Flatbed',  route: 'Regional', clearance: 'Clean record' },
  { cdl: 'CDL-A', years: '2 yrs',  equipment: 'Reefer',   route: 'OTR',      clearance: 'SAP-cleared' },
  { cdl: 'CDL-A', years: 'New',    equipment: 'Dry Van',  route: 'OTR',      clearance: 'Clean record' }
].map((d, i) => ({
  id: 'example-' + i,
  handle: 'Profile shape we place',
  location: '—',
  cdl: d.cdl, years: d.years, equipment: d.equipment, route: d.route, clearance: d.clearance,
  isExample: true
}));

let driverCache = null;

export async function getDrivers() {
  if (driverCache) return driverCache;
  try {
    const data = await rest('drivers?select=id,handle,location,cdl_class,years,equipment,route,clearance&is_published=eq.true&order=created_at.desc');
    if (data && data.length) {
      driverCache = data.map(r => ({
        id: String(r.id),
        handle: (r.handle || '').trim() || 'Driver on file',
        location: (r.location || '').trim() || '—',
        cdl: (r.cdl_class || 'CDL-A').trim(),
        years: (r.years || '—').trim(),
        equipment: (r.equipment || '—').trim(),
        route: (r.route || '—').trim(),
        clearance: (r.clearance || 'Clean record').trim(),
        isExample: false
      }));
      return driverCache;
    }
  } catch (err) {
    console.warn('[data] driver pool unavailable, showing examples:', err && err.message);
  }
  driverCache = DRIVER_EXAMPLES;
  return driverCache;
}

/* Same columns the old form wrote and the admin portal reads. Throws on
   failure so the form can show an honest error with the phone number. */
export async function submitCompanyLead(lead) {
  await rest('company_leads', {
    method: 'POST',
    body: {
      ref: 'USP-' + Math.floor(100000 + Math.random() * 899999),
      company: lead.company,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      equipment: lead.equipment || null,
      hire_count: lead.hireCount || null,
      notes: lead.notes || null,
      source: 'companies-form',
      user_agent: navigator.userAgent || null
    }
  });
}

/* True when nothing on screen is a real row — the UI uses this to say so
   out loud instead of implying inventory it does not have. */
export function isExampleSet(rows) {
  return rows.length > 0 && rows.every(r => r.isExample);
}

export function matches(offer, selection) {
  if (!selection.length) return true;
  // A driver picking "Flatbed" and "OTR" means flatbed AND otr. Chips within
  // the same dimension (two equipment types) are OR'd, across dimensions AND'd.
  const chosen = CHIPS.filter(c => selection.includes(c.key));
  const groups = { equipment: [], route: [], other: [] };
  for (const c of chosen) {
    if (['dryvan','flatbed','reefer','stepdeck','tanker','power','carhauler'].includes(c.key)) groups.equipment.push(c);
    else if (['otr','regional','local','team'].includes(c.key)) groups.route.push(c);
    else groups.other.push(c);
  }
  const ok = g => !g.length || g.some(c => c.test(offer));
  return ok(groups.equipment) && ok(groups.route) && ok(groups.other);
}
