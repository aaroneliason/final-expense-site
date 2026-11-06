import { agent, brand, licenses, phone } from '../config/site';

/** JSON-LD helpers. Structured data buys clarity about WHO the site is, not visual extras. */

export const orgId = (site: URL) => new URL('/#agency', site).href;

export function agencyLd(site: URL) {
  return {
    '@type': 'InsuranceAgency',
    '@id': orgId(site),
    name: brand.name,
    url: site.href,
    logo: new URL('/logo-512.png', site).href,
    image: new URL('/og/olive-tree-1200x630.png', site).href,
    telephone: phone.tel,
    knowsLanguage: ['en', 'es'],
    areaServed: licenses.map((l) => ({ '@type': 'State', name: l.name })),
    // Credentials shown for verification (Site voice: no personal name).
    hasCredential: [
      ...(brand.agencyLicenseNumber.startsWith('TODO')
        ? []
        : [{ '@type': 'EducationalOccupationalCredential', name: 'Florida insurance agency license', credentialCategory: 'license', identifier: brand.agencyLicenseNumber, recognizedBy: { '@type': 'GovernmentOrganization', name: 'Florida Department of Financial Services' } }]),
      { '@type': 'EducationalOccupationalCredential', name: 'Florida resident life insurance agent license (agent in charge)', credentialCategory: 'license', identifier: agent.flLicense, recognizedBy: { '@type': 'GovernmentOrganization', name: 'Florida Department of Financial Services' } },
    ],
  };
}

export function websiteLd(site: URL) {
  return { '@type': 'WebSite', '@id': new URL('/#website', site).href, name: brand.name, url: site.href, inLanguage: 'en-US' };
}

export function breadcrumbLd(site: URL, items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: new URL(it.path, site).href,
    })),
  };
}

export function articleLd(
  site: URL,
  a: { path: string; headline: string; description: string; datePublished: string; dateModified: string },
) {
  return {
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    mainEntityOfPage: new URL(a.path, site).href,
    image: new URL('/og/olive-tree-1200x630.png', site).href,
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    author: { '@id': orgId(site) },
    reviewedBy: { '@id': orgId(site) },
    publisher: { '@id': orgId(site) },
    inLanguage: 'en-US',
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
