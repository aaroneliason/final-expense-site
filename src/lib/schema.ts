import { agent, brand, licenses, phone } from '../config/site';

/** JSON-LD helpers. Structured data buys clarity about WHO the site is, not visual extras. */

export const personId = (site: URL) => new URL('/about/#aaron', site).href;
export const orgId = (site: URL) => new URL('/#agency', site).href;

export function personLd(site: URL) {
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: agent.name,
    jobTitle: agent.title,
    knowsLanguage: ['en', 'es'],
    worksFor: { '@id': orgId(site) },
    url: new URL('/about/', site).href,
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        name: 'Florida resident life insurance agent license',
        credentialCategory: 'license',
        identifier: agent.flLicense,
        recognizedBy: { '@type': 'GovernmentOrganization', name: 'Florida Department of Financial Services' },
      },
      {
        '@type': 'EducationalOccupationalCredential',
        name: 'National Producer Number (NPN)',
        credentialCategory: 'license',
        identifier: agent.npn,
        recognizedBy: { '@type': 'Organization', name: 'National Insurance Producer Registry (NIPR)' },
      },
    ],
  };
}

export function agencyLd(site: URL) {
  return {
    '@type': 'InsuranceAgency',
    '@id': orgId(site),
    name: brand.name,
    url: site.href,
    telephone: phone.tel,
    knowsLanguage: ['en', 'es'],
    areaServed: licenses.map((l) => ({ '@type': 'State', name: l.name })),
    founder: { '@id': personId(site) },
    employee: { '@id': personId(site) },
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
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    author: { '@id': personId(site) },
    reviewedBy: { '@id': personId(site) },
    publisher: { '@id': orgId(site) },
    inLanguage: 'en-US',
  };
}

export function graph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
