/**
 * One home for every fact the site prints about the business.
 * Anything marked `verified: false` or containing "TODO" blocks a production build (check-publish-ignore)
 * (see scripts/check-publish.mjs). Re-check licenses on NIPR + Florida DFS on launch day.
 */

// Safe in Node (build) and in Cloudflare Workers (functions), where `process` may not exist.
const env: Record<string, string | undefined> = (globalThis as any).process?.env ?? {};
export const SITE_MODE: 'preview' | 'production' = env.SITE_MODE === 'production' ? 'production' : 'preview';

export const brand = {
  // Chosen by Aaron 2026-11-06. Must be cleared + licensed before launch: DFS agency license (626.172),
  // DFS name approval (626.602), Sunbiz fictitious-name filing, and a domain.
  name: 'Olive Tree Insurance Agency',
  shortName: 'Olive Tree',
  tagline: 'Honest final expense insurance, explained by a licensed agent',
  email: 'TODO@example.com',
  region: 'Central Florida',
  // A trade name needs a Florida insurance AGENCY license (626.112(7)(a), 626.172) + DFS name approval (626.602)
  // + Sunbiz fictitious-name registration. Only Aaron's own name is exempt.
  agencyLicense: 'TODO-not-applied' as 'TODO-not-applied' | 'applied' | 'approved' | 'not-needed-own-name',
  agencyLicenseNumber: 'TODO', // Florida DFS agency license number, once issued
};

// SITE VOICE (Aaron, 2026-11-06): the agency speaks as "we". Never print the agent's personal name in page copy;
// show license numbers so anyone can verify. Say "a licensed agent" (singular) and never imply a team size or
// headcount we don't have (Fla. Stat. 626.9541(1)(b) false advertising). agent.name appears only in the legal owner line on /terms/; team names live in src/data/team.json (full names, Aaron 2026-11-06).

export const agent = {
  name: 'Aaron Eliason', // exactly as it appears on the license
  title: 'Licensed life insurance agent',
  residentState: 'Florida',
  city: 'Apopka, Florida',
  flLicense: 'G246242',
  npn: '21620314',
  licensedSince: 'June 2025',
  languages: ['English', 'Español'],
  verified: false, // flip to true after checking DFS + NIPR on launch day
};

export const phone = {
  // Site-only Google Voice number (decided 2026-11-06) so every call on it is an SEO call.
  display: 'TODO (000) 000-0000',
  tel: '+10000000000',
  hours: 'Mon–Sat, 9 AM–7 PM Eastern',
  hoursEs: 'lun.–sáb., 9 a. m.–7 p. m. (hora del Este)',
  // Same hours as data, for the live "Open now" status (0 = Sunday). Keep in sync with `hours`.
  open: { tz: 'America/New_York', days: [1, 2, 3, 4, 5, 6], start: 9, end: 19 },
};

export type StateLicense = {
  code: string;
  name: string;
  resident?: boolean;
  expires?: string; // ISO date
  verified: boolean;
};

// From Aaron's records (Sept + Nov 2026). Pull the live list from NIPR before launch.
export const licenses: StateLicense[] = [
  { code: 'FL', name: 'Florida', resident: true, verified: false },
  { code: 'LA', name: 'Louisiana', expires: '2027-01-31', verified: false },
  { code: 'MD', name: 'Maryland', verified: false },
  { code: 'MN', name: 'Minnesota', expires: '2027-01-31', verified: false },
  { code: 'MO', name: 'Missouri', verified: false },
  { code: 'MS', name: 'Mississippi', expires: '2027-01-31', verified: false },
  { code: 'SC', name: 'South Carolina', verified: false },
  { code: 'VA', name: 'Virginia', expires: '2027-01-31', verified: false },
  { code: 'WA', name: 'Washington', verified: false },
  { code: 'WI', name: 'Wisconsin', verified: false },
];

import carrierData from '../data/carriers.json';

export type Carrier = {
  legalName: string;
  shortName: string;
  amBest?: string; // rating + date checked, e.g. 'A- (checked 2026-11-20)'
  appointedIn: string[]; // states with an ACTIVE appointment (FL: DFS licensee search; others: NIPR)
  writable: boolean; // Aaron confirmed the contract is live and he can submit business
  adApproval: 'not-submitted' | 'submitted' | 'approved';
  approvalRef?: string;
  approvalExpires?: string;
};

// Facts live in src/data/carriers.json (also read by scripts/check-publish.mjs).
export const carriers = carrierData.carriers as Carrier[];
export const appointmentsCheckedOn = carrierData.checkedOn;
/** Insurers Aaron can actually quote in a state. Backs "several insurers" claims; names are not shown. */
export const writableIn = (state: string) => carriers.filter((c) => c.writable && c.appointedIn.includes(state));
/** Insurers that may be NAMED on a state's pages: appointed there, writable, and ad-approved (Fla. Stat. 626.112(2)). */
export const nameableIn = (state: string) => writableIn(state).filter((c) => c.adApproval === 'approved');

export const links = {
  dfsLookup: 'https://licenseesearch.fldfs.com/',
  nipr: 'https://nipr.com/help/look-up-a-license',
  ssaDeath: 'https://www.ssa.gov/benefits/survivors/',
  vaBurial: 'https://www.va.gov/burials-memorials/',
  valife: 'https://www.benefits.va.gov/insurance/valife.asp',
  ftcFuneralRule: 'https://consumer.ftc.gov/articles/ftc-funeral-rule',
  // Florida's cancel-for-a-full-refund rule for life insurance (buyer's guide or at least 14 days)
  flRefundStatute: 'https://www.flsenate.gov/Laws/Statutes/2026/626.99',
};

export const lastReviewed = '2026-11-06';

// Spanish pages (/es/…, src/i18n/ui.ts, the Spanish consent text). Aaron reads every line, fixes anything that
// doesn't sound natural, and flips this to true. scripts/check-publish.mjs blocks launch until then.
export const spanish = {
  reviewed: false,
};

// Cloudflare Turnstile (bot check on the quote form). The site key is public by design and only works on the
// widget's hostnames (olive-tree-insurance.pages.dev; add the real domain at launch). The secret lives in
// Cloudflare Pages as TURNSTILE_SECRET. Override with PUBLIC_TURNSTILE_SITE_KEY if needed.
export const turnstile = {
  siteKey: env.PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAF1oJpPHqmHC8Raw',
};
