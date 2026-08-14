/* United Services Recruiting — SINGLE SOURCE OF TRUTH.
 *
 * The matcher and the board both import from here. Neither keeps its own
 * copy — that is what let them show contradictory inventory before.
 *
 * Live rows come from Supabase (the same `offers` table the admin portal
 * writes to). If that fetch fails or the table is empty we fall back to
 * EXAMPLES, which are flagged `isExample` and rendered WITHOUT an apply
 * button and with a visible "example" label — a placeholder must never be
 * able to pass as a live opening.
 */

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

/* Equipment marquee. Each trailer writes its own chip key into the shared
   selection, so the row is a funnel entry rather than decoration. */
export const RIGS = [
  { type: 'dry-van',    name: 'Dry Van',    sub: 'No-touch freight',  chip: 'dryvan' },
  { type: 'flatbed',    name: 'Flatbed',    sub: 'Tarp pay',          chip: 'flatbed' },
  { type: 'reefer',     name: 'Reefer',     sub: 'Temp-controlled',   chip: 'reefer' },
  { type: 'step-deck',  name: 'Step Deck',  sub: 'Oversize lanes',    chip: 'stepdeck' },
  { type: 'tanker',     name: 'Tanker',     sub: 'Endorsement req',   chip: 'tanker' },
  { type: 'power-only', name: 'Power Only', sub: 'Bring the tractor', chip: 'power' },
  { type: 'car-hauler', name: 'Car Hauler', sub: 'Load and secure',   chip: 'carhauler' }
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

let cache = null;

export async function getOffers() {
  if (cache) return cache;
  try {
    const sb = window.usrSupabase;
    if (!sb) throw new Error('supabase unavailable');
    const { data, error } = await sb
      .from('offers')
      .select('id,company,location,route,equipment,pay,tags,badge,notes')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data && data.length) {
      cache = data.map(normalise);
      return cache;
    }
  } catch (err) {
    console.warn('[data] live board unavailable, showing examples:', err && err.message);
  }
  cache = EXAMPLES;
  return cache;
}

/* True when nothing on screen is a real opening — the UI uses this to say so
   out loud instead of implying inventory it does not have. */
export function isExampleSet(offers) {
  return offers.length > 0 && offers.every(o => o.isExample);
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
