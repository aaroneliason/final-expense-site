/**
 * Consent language shown next to the submit button. Names ONE seller (Aaron) — never shared
 * or sold. Bump CONSENT_VERSION on ANY wording change; the lead API stores the exact text shown.
 * Have NBG compliance or a lawyer approve before launch (Florida FTSA, Fla. Stat. 501.059).
 */
export const CONSENT_VERSION = '2026-11-06.v1';

export function consentText(agentName: string, brandName: string) {
  const plain =
    `By checking this box and clicking "Get my quote," I agree that ${agentName}, a licensed insurance agent ` +
    `doing business as ${brandName}, may contact me about life insurance at the phone number and email I provided, ` +
    `including by calls and text messages that may use automated technology or a prerecorded or artificial voice. ` +
    `Consent is not a condition of buying anything. Message and data rates may apply; message frequency varies. ` +
    `Reply STOP to opt out or HELP for help. My information goes only to ${agentName} and is never sold or shared ` +
    `with other agents. See the Privacy Policy and Terms.`;
  const html = plain
    .replace('Privacy Policy', '<a href="/privacy/">Privacy Policy</a>')
    .replace('Terms.', '<a href="/terms/">Terms</a>.');
  return { plain, html };
}
