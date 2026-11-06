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
  // A trade name needs a Florida insurance AGENCY license (626.112(7)(a), 626.172) + DFS name approval (626.602)
  // + Sunbiz fictitious-name registration. Only Aaron's own name is exempt.
  agencyLicense: 'TODO-not-applied' as 'TODO-not-applied' | 'applied' | 'approved' | 'not-needed-own-name',
};

export const agent = {
  name: 'Aaron Eliason', // exactly as it appears on the license
  title: 'Licensed life insurance agent',
  residentState: 'Florida',
  city: 'Apopka, Florida',
  flLicense: 'G246242',
  npn: '21620314',
  licensedSince: 'June 2025',
  languages: ['English', 'Español'],
  photo: null as string | null, // e.g. '/images/aaron.jpg' — real photo, not stock
  verified: false, // flip to true after checking DFS + NIPR on launch day
};

export const phone = {
  // Site-only Google Voice number (decided 2026-11-06) so every call on it is an SEO call.
  display: 'TODO (000) 000-0000',
  tel: '+10000000000',
  hours: 'Mon–Sat, 9 AM–7 PM Eastern',
  hoursEs: 'lun.–sáb., 9 a. m.–7 p. m. (hora del Este)',
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

export type Carrier = {
  legalName: string;
  shortName: string;
  amBest?: string; // rating + date checked, e.g. 'A- (checked 2026-11-20)'
  adApproval: 'not-submitted' | 'submitted' | 'approved';
  approvalRef?: string;
  approvalExpires?: string;
};

// Carriers Aaron writes today. Names may appear on the site only after written ad approval.
// Florida DFS (checked 2026-11-06): active FL appointments = Fidelity Life, American General, United of Omaha.
// A carrier must be appointed in a state before it is advertised or sold there (626.112(2)).
export const carriers: Carrier[] = [
  { legalName: 'American Home Life Insurance Company', shortName: 'American Home Life', adApproval: 'not-submitted' },
  { legalName: 'Fidelity Life Association', shortName: 'Fidelity Life', adApproval: 'not-submitted' }, // FL appointed 10/27/2026
  { legalName: 'Americo Financial Life and Annuity Insurance Company', shortName: 'Americo', adApproval: 'not-submitted' },
];

export const links = {
  dfsLookup: 'https://licenseesearch.fldfs.com/',
  nipr: 'https://nipr.com/help/look-up-a-license',
  ssaDeath: 'https://www.ssa.gov/benefits/survivors/',
  vaBurial: 'https://www.va.gov/burials-memorials/',
  valife: 'https://www.benefits.va.gov/insurance/valife.asp',
};

export const lastReviewed = '2026-11-06';
