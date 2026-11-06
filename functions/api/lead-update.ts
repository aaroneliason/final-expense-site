/**
 * POST /api/lead-update — optional details added on the thank-you page (last name, best time, language, email).
 * Needs the one-time token returned by /api/lead, valid for 2 hours. Only these four fields can change;
 * consent, phone and the answers given before consent are never edited here.
 */
import { LEAD_ENUMS, refCode, telegram } from '../../src/lib/alerts';

interface Env {
  LEADS_DB: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

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
    return Response.json({ error: 'Could not read the form.' }, { status: 400 });
  }
  const id = clip(body.id, 64);
  const token = clip(body.token, 128);
  if (!id || !token) return Response.json({ error: 'Missing reference.' }, { status: 400 });

  const row = await env.LEADS_DB.prepare('SELECT edit_token, edit_expires, first_name FROM leads WHERE id = ?1')
    .bind(id)
    .first<{ edit_token: string | null; edit_expires: string | null; first_name: string }>();
  if (!row || !row.edit_token || !same(row.edit_token, token)) return Response.json({ error: 'Not found.' }, { status: 404 });
  if (!row.edit_expires || new Date(row.edit_expires).getTime() < Date.now())
    return Response.json({ error: 'This form has expired. Please call us instead.' }, { status: 410 });

  const last_name = clip(body.last_name, 60);
  let email = clip(body.email, 120).toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) email = '';
  const best_time = LEAD_ENUMS.best_time.includes(clip(body.best_time, 12)) ? clip(body.best_time, 12) : '';
  const language = LEAD_ENUMS.language.includes(clip(body.language, 2)) ? clip(body.language, 2) : '';

  await env.LEADS_DB.prepare(
    `UPDATE leads SET
       last_name = COALESCE(NULLIF(?1, ''), last_name),
       email = COALESCE(NULLIF(?2, ''), email),
       best_time = COALESCE(NULLIF(?3, ''), best_time),
       language = COALESCE(NULLIF(?4, ''), language),
       updated_at = ?5
     WHERE id = ?6`,
  )
    .bind(last_name, email, best_time, language, new Date().toISOString(), id)
    .run();

  const parts = [
    last_name && `last name ${last_name}`,
    best_time && best_time !== 'anytime' && `prefers ${best_time}`,
    language === 'es' && 'Spanish',
    email && `email ${email}`,
  ].filter(Boolean);
  if (parts.length) {
    const tg = telegram(env, `ℹ️ Update for ${row.first_name} (ref ${refCode(id)}): ${parts.join(' · ')}`);
    if (tg) waitUntil(tg);
  }
  return Response.json({ ok: true });
};
