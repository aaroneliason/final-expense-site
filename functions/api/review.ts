/**
 * POST /api/review — a client's review from the private review page (/share-your-experience/ or
 * /es/comparta-su-experiencia/). Saved as 'pending' in D1 with the exact permission text the person agreed to,
 * then Aaron gets a Telegram alert. Nothing appears on the site until Aaron approves it and Claude adds it to
 * src/data/reviews.json (the words are never edited; only first name, last initial and city are shown).
 */
import { brand } from '../../src/config/site';
import { telegram } from '../../src/lib/alerts';
import { REVIEW_CONSENT_VERSIONS, reviewConsentText } from '../../src/lib/review-consent';
import { verifyTurnstile } from '../../src/lib/turnstile';

interface Env {
  LEADS_DB: D1Database;
  TURNSTILE_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

type Lang = 'en' | 'es';
const MSG: Record<Lang, Record<string, string>> = {
  en: {
    unreadable: 'Could not read the form.',
    text: 'Please write at least a sentence or two (20 characters or more).',
    name: 'Please add your first name and the first letter of your last name.',
    consent: 'Please check the permission box so we can show your review.',
    robot: 'We could not confirm you are not a robot. Please try again.',
    stale: 'This page is out of date. Please refresh and try again.',
    thanks: 'Thank you. Your review was received.',
  },
  es: {
    unreadable: 'No pudimos leer el formulario.',
    text: 'Escriba al menos una o dos oraciones (20 caracteres o más).',
    name: 'Escriba su nombre y la primera letra de su apellido.',
    consent: 'Marque la casilla de permiso para que podamos mostrar su opinión.',
    robot: 'No pudimos confirmar que usted no es un robot. Inténtelo otra vez.',
    stale: 'Esta página está desactualizada. Actualícela e inténtelo otra vez.',
    thanks: 'Gracias. Recibimos su opinión.',
  },
};
const RELATIONSHIPS = ['client', 'family', 'prospect'];

const clip = (v: unknown, max: number) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const url = new URL(request.url);
  const isJson = (request.headers.get('content-type') || '').includes('application/json');
  let raw: Record<string, unknown> = {};
  try {
    raw = isJson ? await request.json() : Object.fromEntries((await request.formData()).entries());
  } catch {
    return Response.json({ error: MSG.en.unreadable }, { status: 400 });
  }
  const lang: Lang = clip(raw.lang, 2) === 'es' ? 'es' : 'en';
  const m = MSG[lang];
  const send = (status: number, data: Record<string, unknown>) =>
    isJson
      ? Response.json(data, { status })
      : new Response(String(data.error ?? m.thanks), { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });

  if (clip(raw.company_website, 200)) return send(200, { ok: true }); // honeypot: pretend success, store nothing

  const text = clip(raw.text, 1500);
  const first_name = clip(raw.first_name, 40);
  const last_initial = clip(raw.last_initial, 1).toUpperCase();
  const city = clip(raw.city, 40);
  const relationship = RELATIONSHIPS.includes(clip(raw.relationship, 10)) ? clip(raw.relationship, 10) : '';
  const contact = clip(raw.contact, 120);

  if (text.length < 20) return send(422, { error: m.text });
  if (!/^\p{L}[\p{L}' .-]{0,39}$/u.test(first_name) || !/^\p{L}$/u.test(last_initial)) return send(422, { error: m.name });
  if (clip(raw.consent, 3) !== 'yes') return send(422, { error: m.consent });

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ts = await verifyTurnstile(env.TURNSTILE_SECRET, clip(raw['cf-turnstile-response'], 4096), ip, url.hostname);
  if (!ts.ok) return send(403, { error: m.robot });

  const version = clip(raw.consent_version, 40);
  if (version !== REVIEW_CONSENT_VERSIONS[lang]) return send(409, { error: m.stale });
  const consent = reviewConsentText(brand.name, lang);

  const id = crypto.randomUUID();
  await env.LEADS_DB.prepare(
    `INSERT INTO reviews (id, created_at, lang, first_name, last_initial, city, relationship, text, contact,
      consent_version, consent_text, ip, user_agent, status)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 'pending')`,
  )
    .bind(
      id, new Date().toISOString(), lang, first_name, last_initial, city || null, relationship || null, text, contact || null,
      version, consent, ip, (request.headers.get('user-agent') || '').slice(0, 300),
    )
    .run();

  const who = `${first_name} ${last_initial}.${city ? `, ${city}` : ''}${relationship ? ` (${relationship})` : ''}`;
  const tg = telegram(
    env,
    `⭐ New review waiting for your OK: ${who}${lang === 'es' ? ' · Spanish' : ''}\n\n“${text.slice(0, 900)}${text.length > 900 ? '…' : ''}”\n\n` +
      `Review id ${id.slice(0, 8)}. To publish it, tell Claude “approve review ${id.slice(0, 8)}”.`,
  );
  if (tg) waitUntil(tg);
  return send(200, { ok: true });
};
