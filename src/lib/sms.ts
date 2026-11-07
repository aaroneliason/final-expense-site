/**
 * Confirmation text to a new lead from the site's OpenPhone number. Dormant until Aaron adds the Cloudflare
 * Pages secrets OPENPHONE_API_KEY and OPENPHONE_FROM (the site number, +1XXXXXXXXXX, or its OpenPhone id PN…).
 *
 * Rules it follows:
 * - Covered by the consent the visitor just gave (calls and automated texts from the agency, STOP to opt out).
 * - Sent only 9 AM–8 PM Eastern. That sits inside Florida's 8 AM–8 PM window for telephonic sales calls in
 *   both Florida time zones (Fla. Stat. 501.059(8)(a)); outside it, no text (the call still happens).
 * - One text per request, no links, no sales pitch. STOP replies are handled by OpenPhone and the carrier.
 * - The first name is used only if it looks like a name, so nobody can push their own words into the text.
 */
import { zonedNow } from './calltime';

export type SmsEnv = { OPENPHONE_API_KEY?: string; OPENPHONE_FROM?: string };
export type SmsStatus = 'sent' | 'after-hours' | 'not-configured' | 'bad-number' | `failed-${number}` | 'failed-network';

export function e164(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return '';
}

/** 9 AM–8 PM Eastern. */
export const inTextingHours = (now = new Date()) => {
  const h = zonedNow('America/New_York', now).hour;
  return h >= 9 && h < 20;
};

export function confirmationText(firstName: string, lang: 'en' | 'es') {
  const name = /^[\p{L}][\p{L}' -]{0,19}$/u.test(firstName.trim()) ? ` ${firstName.trim()}` : '';
  return lang === 'es'
    ? `Hola${name}, le escribe Olive Tree Insurance Agency. Recibimos su solicitud y un agente con licencia le llamará desde este número pronto. Responda STOP para no recibir más mensajes.`
    : `Hi${name}, this is Olive Tree Insurance Agency. We got your request, and a licensed agent will call you from this number soon. Reply STOP to opt out.`;
}

export async function sendConfirmation(env: SmsEnv, phone: string, firstName: string, lang: 'en' | 'es', now = new Date()): Promise<SmsStatus> {
  if (!env.OPENPHONE_API_KEY || !env.OPENPHONE_FROM) return 'not-configured';
  const to = e164(phone);
  if (!to) return 'bad-number';
  if (!inTextingHours(now)) return 'after-hours';
  try {
    const r = await fetch('https://api.openphone.com/v1/messages', {
      method: 'POST',
      headers: { authorization: env.OPENPHONE_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ content: confirmationText(firstName, lang), from: env.OPENPHONE_FROM, to: [to] }),
    });
    return r.ok ? 'sent' : `failed-${r.status}`;
  } catch {
    return 'failed-network';
  }
}
