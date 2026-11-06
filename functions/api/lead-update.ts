/**
 * POST /api/lead-update — what a visitor adds on the thank-you page right after a request:
 *  - the optional details card: last name, language, email (and best_time, kept for older pages)
 *  - the call-time picker: call_day (YYYY-MM-DD) + call_hour (24h, Eastern), a one-hour window
 * Needs the one-time token returned by /api/lead, valid for 2 hours. Only these fields can change;
 * consent, phone and the answers given before consent are never edited here.
 */
import { phone } from '../../src/config/site';
import { LEAD_ENUMS, refCode, telegram } from '../../src/lib/alerts';
import { alertLabel, isOpenSlot } from '../../src/lib/calltime';

interface Env {
  LEADS_DB: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const MSG = {
  en: {
    unreadable: 'Could not read the form.',
    missing: 'Missing reference.',
    notFound: 'Not found.',
    expired: 'This form has expired. Please call us instead.',
    slot: 'That time is no longer open. Please pick another one.',
  },
  es: {
    unreadable: 'No pudimos leer el formulario.',
    missing: 'Falta la referencia.',
    notFound: 'No encontramos su solicitud.',
    expired: 'Este formulario ya venció. Por favor, llámenos.',
    slot: 'Esa hora ya no está disponible. Elija otra, por favor.',
  },
};

const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: MSG.en.unreadable }, { status: 400 });
  }
  const m = MSG[clip(body.lang, 2) === 'es' ? 'es' : 'en'];
  const id = clip(body.id, 64);
  const token = clip(body.token, 128);
  if (!id || !token) return Response.json({ error: m.missing }, { status: 400 });

  const row = await env.LEADS_DB.prepare('SELECT edit_token, edit_expires, first_name FROM leads WHERE id = ?1')
    .bind(id)
    .first<{ edit_token: string | null; edit_expires: string | null; first_name: string }>();
  if (!row || !row.edit_token || !same(row.edit_token, token)) return Response.json({ error: m.notFound }, { status: 404 });
  if (!row.edit_expires || new Date(row.edit_expires).getTime() < Date.now()) return Response.json({ error: m.expired }, { status: 410 });

  const last_name = clip(body.last_name, 60);
  let email = clip(body.email, 120).toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = '';
  const best_time = LEAD_ENUMS.best_time.includes(clip(body.best_time, 12)) ? clip(body.best_time, 12) : '';
  const language = LEAD_ENUMS.language.includes(clip(body.language, 2)) ? clip(body.language, 2) : '';

  // Call time: must be one of the windows the picker offers right now (open day, open hour, not past).
  let call_at = '';
  const call_day = clip(body.call_day, 10);
  if (call_day || body.call_hour !== undefined) {
    const call_hour = Number(body.call_hour);
    if (!isOpenSlot(phone.open, call_day, call_hour)) return Response.json({ error: m.slot }, { status: 422 });
    call_at = `${call_day}T${String(call_hour).padStart(2, '0')}:00`; // Eastern wall-clock start of a 1-hour window
  }

  await env.LEADS_DB.prepare(
    `UPDATE leads SET
       last_name = COALESCE(NULLIF(?1, ''), last_name),
       email = COALESCE(NULLIF(?2, ''), email),
       best_time = COALESCE(NULLIF(?3, ''), best_time),
       language = COALESCE(NULLIF(?4, ''), language),
       call_at = COALESCE(NULLIF(?5, ''), call_at),
       updated_at = ?6
     WHERE id = ?7`,
  )
    .bind(last_name, email, best_time, language, call_at, new Date().toISOString(), id)
    .run();

  const parts = [
    call_at && `📅 call at ${alertLabel(call_day, Number(body.call_hour))}`,
    last_name && `last name ${last_name}`,
    best_time && best_time !== 'anytime' && `prefers ${best_time}`,
    language === 'es' && 'Spanish',
    language === 'en' && clip(body.lang, 2) === 'es' && 'prefers English',
    email && `email ${email}`,
  ].filter(Boolean);
  if (parts.length) {
    const tg = telegram(env, `ℹ️ Update for ${row.first_name} (ref ${refCode(id)}): ${parts.join(' · ')}`);
    if (tg) waitUntil(tg);
  }
  return Response.json({ ok: true, call_at: call_at || undefined });
};
