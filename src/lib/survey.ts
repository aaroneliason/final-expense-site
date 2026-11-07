/** Helpers for the Florida funeral-cost survey (src/data/funeral-survey.json): ranges, middle prices, sources. */
import survey from '../data/funeral-survey.json';

export type Metro = (typeof survey.metros)[number];
export type PriceRow = (typeof survey.prices)[number];
export type Service = 'direct cremation' | 'cremation with memorial service' | 'direct burial' | 'traditional funeral with burial' | 'traditional funeral with cremation';

export const metros = survey.metros as Metro[];
export const metroBySlug = (slug: string) => metros.find((m) => m.slug === slug)!;
export const rowsFor = (slug: string, service: Service) => (survey.prices as PriceRow[]).filter((p) => p.metro === slug && p.service === service);

export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Low, high and (with 5+ prices) the middle price. With fewer than 5, a "middle" would mislead, so it's left out. */
export function stats(values: number[]) {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const median = n >= 5 ? (n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2)) : null;
  return { n, low: v[0], high: v[n - 1], median };
}

/** One entry per provider, with the source pages its prices came from. */
export function providersFor(slug: string) {
  const map = new Map<string, { provider: string; city: string; sources: string[] }>();
  for (const p of survey.prices as PriceRow[]) {
    if (p.metro !== slug) continue;
    const e = map.get(p.provider) ?? { provider: p.provider, city: p.city, sources: [] };
    if (!e.sources.includes(p.source)) e.sources.push(p.source);
    map.set(p.provider, e);
  }
  return [...map.values()];
}

export const checkedOn = survey.checkedOn;
export const nfda = survey.nfda;
export const statewide = survey.statewide;
/** "November 2026" */
export const checkedMonth = new Date(survey.checkedOn + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
