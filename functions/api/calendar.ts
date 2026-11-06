/**
 * GET /api/calendar?d=YYYY-MM-DD&h=10&lang=en — an "Add to my calendar" file (.ics) for a call time picked on
 * the thank-you page, so the client expects our call and answers it. Holds no personal data: only the
 * day, the hour and our number. Works with Apple Calendar, Outlook and most phone calendars.
 */
import { brand, phone } from '../../src/config/site';
import { windowBetween, zonedToUtc } from '../../src/lib/calltime';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** RFC 5545 line folding: at most 75 octets per line, continuation lines start with a space. */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let chunk = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(chunk);
      chunk = '';
      size = 0;
    }
    chunk += ch;
    size += n;
  }
  out.push(chunk);
  return out.join('\r\n ');
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const day = url.searchParams.get('d') || '';
  const hour = Number(url.searchParams.get('h'));
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
  const { start: open, end: close } = phone.open;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(hour) || hour < open || hour >= close) {
    return new Response('Bad request', { status: 400 });
  }
  const start = zonedToUtc(phone.open.tz, day, hour);
  const end = new Date(start.getTime() + 3_600_000);
  const summary = lang === 'es' ? `Llamada de ${brand.name}` : `Call from ${brand.name}`;
  const description =
    lang === 'es'
      ? `Un agente con licencia le llamará entre ${windowBetween(hour, 'es')} (hora del Este) sobre su cotización de seguro de gastos finales. Le llamamos desde el ${phone.display}. Sin compromiso.`
      : `A licensed agent will call you between ${windowBetween(hour, 'en')} Eastern about your final expense quote. We call from ${phone.display}. No obligation.`;
  const alarm = lang === 'es' ? `${brand.name} le llamará pronto` : `${brand.name} will call you soon`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${brand.name}//Call reminder//${lang.toUpperCase()}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@olive-tree-insurance`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(alarm)}`,
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${lang === 'es' ? 'llamada-olive-tree' : 'olive-tree-call'}.ics"`,
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
};
