/**
 * Consent language shown next to the submit button, in the language of the page. Names ONE seller
 * (the agency) — never shared or sold. Each language has its own version: bump it on ANY wording change.
 * The lead API rebuilds and stores the exact text the visitor saw (version + language).
 * Have NBG compliance or a lawyer approve both languages before launch (Florida FTSA, Fla. Stat. 501.059).
 */
export const CONSENT_VERSIONS = { en: '2026-11-06.v2', es: '2026-11-06.es1' } as const;
export type ConsentLang = keyof typeof CONSENT_VERSIONS;
export const CONSENT_VERSION = CONSENT_VERSIONS.en;

export function consentText(brandName: string, lang: ConsentLang = 'en') {
  if (lang === 'es') {
    const plain =
      `Al marcar esta casilla y hacer clic en «Recibir mi cotización», acepto que ${brandName}, una agencia de seguros con licencia, ` +
      `me contacte sobre seguros de vida al número de teléfono y al correo electrónico que proporcioné, ` +
      `incluso mediante llamadas y mensajes de texto que pueden usar tecnología automatizada o una voz pregrabada o artificial. ` +
      `El consentimiento no es una condición para comprar nada. Pueden aplicarse tarifas de mensajes y datos; la frecuencia de los mensajes varía. ` +
      `Responda STOP para cancelar o HELP para recibir ayuda. Mi información va solo a ${brandName} y nunca se vende ni se comparte ` +
      `con otros agentes. Vea la Política de privacidad y los Términos (en inglés).`;
    const html = plain
      .replace('Política de privacidad', '<a href="/es/privacidad/">Política de privacidad</a>')
      .replace('Términos (en inglés)', '<a href="/terms/" hreflang="en">Términos (en inglés)</a>');
    return { plain, html };
  }
  const plain =
    `By checking this box and clicking "Get my quote," I agree that ${brandName}, a licensed insurance agency, ` +
    `may contact me about life insurance at the phone number and email I provided, ` +
    `including by calls and text messages that may use automated technology or a prerecorded or artificial voice. ` +
    `Consent is not a condition of buying anything. Message and data rates may apply; message frequency varies. ` +
    `Reply STOP to opt out or HELP for help. My information goes only to ${brandName} and is never sold or shared ` +
    `with other agents. See the Privacy Policy and Terms.`;
  const html = plain
    .replace('Privacy Policy', '<a href="/privacy/">Privacy Policy</a>')
    .replace('Terms.', '<a href="/terms/">Terms</a>.');
  return { plain, html };
}
