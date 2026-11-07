/**
 * Permission text on the review form (/share-your-experience/, /es/comparta-su-experiencia/). The review API
 * stores the exact text the person agreed to, with its version. Bump the version on ANY wording change.
 * Rules it carries: the review is the person's own honest opinion (NAIC Model 570 §5Q, FTC 16 CFR 255 and 465),
 * nothing was given for it, and they can ask to have it removed.
 */
export const REVIEW_CONSENT_VERSIONS = { en: '2026-11-07.r1', es: '2026-11-07.r1-es' } as const;

export function reviewConsentText(brandName: string, lang: 'en' | 'es' = 'en') {
  return lang === 'es'
    ? `Esta es mi opinión honesta y nadie me pagó ni me dio nada a cambio. ${brandName} puede mostrarla, con mi nombre, la inicial de mi apellido y mi ciudad tal como los escribí, en su sitio web y en su publicidad. Puedo pedir que la quiten en cualquier momento.`
    : `This is my own honest opinion, and I wasn't paid or given anything for it. ${brandName} may show it, with my first name, last initial and city as I wrote them, on its website and in its marketing. I can ask to have it removed at any time.`;
}
