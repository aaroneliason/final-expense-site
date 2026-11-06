/**
 * "Pick a call time": the open days and one-hour call windows a visitor can choose, built from the site hours
 * (src/config/site.ts → phone.open). Used by the thank-you pages (browser) and by /api/lead-update and
 * /api/calendar (server), so both sides agree on what can be picked. No third-party scheduler: nothing to
 * sign up for, no email required, and it works the same in English and Spanish.
 */
export type Hours = { tz: string; days: number[]; start: number; end: number };
export type Lang = 'en' | 'es';
/** offset = days from today in the business time zone (0 = today); weekday 0 = Sunday. */
export type Slot = { day: string; hours: number[]; offset: number; weekday: number };

const DAY_MS = 86_400_000;

function zonedParts(tz: string, at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute) };
}

/** Today's date (YYYY-MM-DD) and the current hour in the business time zone. */
export function zonedNow(tz: string, now = new Date()) {
  const p = zonedParts(tz, now);
  return { day: `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`, hour: p.h };
}

const dayIndex = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY_MS;
const isoDay = (index: number) => new Date(index * DAY_MS).toISOString().slice(0, 10);
export const weekdayOf = (iso: string) => new Date(dayIndex(iso) * DAY_MS).getUTCDay();

/** Is the agency open right now? */
export function isOpenNow(hours: Hours, now = new Date()) {
  const z = zonedNow(hours.tz, now);
  return hours.days.includes(weekdayOf(z.day)) && z.hour >= hours.start && z.hour < hours.end;
}

/**
 * The next `count` open days, each with the one-hour windows still ahead. Today keeps only the windows that
 * start after the current hour, so there's always some notice before the call.
 */
export function openSlots(hours: Hours, count = 5, now = new Date(), horizon = 14): Slot[] {
  const today = zonedNow(hours.tz, now);
  const base = dayIndex(today.day);
  const out: Slot[] = [];
  for (let k = 0; k <= horizon && out.length < count; k++) {
    const weekday = new Date((base + k) * DAY_MS).getUTCDay();
    if (!hours.days.includes(weekday)) continue;
    const hrs: number[] = [];
    for (let h = hours.start; h < hours.end; h++) if (k > 0 || h > today.hour) hrs.push(h);
    if (hrs.length) out.push({ day: isoDay(base + k), hours: hrs, offset: k, weekday });
  }
  return out;
}

/** True when `day` (YYYY-MM-DD) + `hour` (24h, business time zone) is a window that can be picked right now. */
export function isOpenSlot(hours: Hours, day: string, hour: number, now = new Date(), horizon = 14) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(hour)) return false;
  return openSlots(hours, horizon + 1, now, horizon).some((s) => s.day === day && s.hours.includes(hour));
}

/** The UTC instant of a wall-clock hour in the business time zone (daylight saving time handled). */
export function zonedToUtc(tz: string, day: string, hour: number) {
  const target = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), hour);
  let t = target;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(tz, new Date(t));
    const diff = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - target;
    if (diff === 0) break;
    t -= diff;
  }
  return new Date(t);
}

// Plain-language labels. Written out by hand so every browser shows the same words.
const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
};
const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};
const MONTHS_SHORT_ES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];

/** "Fri, Nov 6" / "Friday, November 6" · "viernes 6 de nov." / "viernes 6 de noviembre" */
export function dayName(lang: Lang, iso: string, style: 'short' | 'long' = 'short') {
  const wd = WEEKDAYS[lang][weekdayOf(iso)];
  const m = Number(iso.slice(5, 7)) - 1;
  const d = Number(iso.slice(8, 10));
  if (lang === 'es') return `${wd} ${d} de ${style === 'long' ? MONTHS.es[m] : MONTHS_SHORT_ES[m]}`;
  return style === 'long' ? `${wd}, ${MONTHS.en[m]} ${d}` : `${wd.slice(0, 3)}, ${MONTHS.en[m].slice(0, 3)} ${d}`;
}

/** Weekday on its own, for "we open Monday at 9 AM" / "abrimos el lunes a las 9 a. m.". */
export const weekdayName = (lang: Lang, weekday: number) => WEEKDAYS[lang][weekday];

const h12 = (h: number) => ((h + 11) % 12) + 1;
const meridiem = (h: number, lang: Lang) => (lang === 'es' ? (h % 24 < 12 ? 'a. m.' : 'p. m.') : h % 24 < 12 ? 'AM' : 'PM');

/** "9 AM" / "9 a. m." */
export const hourLabel = (h: number, lang: Lang) => `${h12(h)} ${meridiem(h, lang)}`;

/** Tile label for a one-hour window: "10–11 AM", "11 AM–12 PM" / "10–11 a. m.", "11 a. m.–12 p. m." */
export function windowLabel(h: number, lang: Lang) {
  const a = meridiem(h, lang);
  const b = meridiem(h + 1, lang);
  return a === b ? `${h12(h)}–${h12(h + 1)} ${a}` : `${h12(h)} ${a}–${h12(h + 1)} ${b}`;
}

/** For sentences: "10 and 11 AM" / "las 10 y las 11 a. m." ("la 1", singular, in Spanish). */
export function windowBetween(h: number, lang: Lang) {
  const a = meridiem(h, lang);
  const b = meridiem(h + 1, lang);
  if (lang === 'es') {
    const art = (x: number) => (h12(x) === 1 ? 'la' : 'las');
    return a === b ? `${art(h)} ${h12(h)} y ${art(h + 1)} ${h12(h + 1)} ${a}` : `${art(h)} ${h12(h)} ${a} y ${art(h + 1)} ${h12(h + 1)} ${b}`;
  }
  return a === b ? `${h12(h)} and ${h12(h + 1)} ${a}` : `${h12(h)} ${a} and ${h12(h + 1)} ${b}`;
}

/** Short English label for the agency's own alerts: "Sat, Nov 7, 10–11 AM ET". */
export const alertLabel = (day: string, hour: number) => `${dayName('en', day)}, ${windowLabel(hour, 'en')} ET`;
