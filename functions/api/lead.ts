/**
 * POST /api/lead — quote-form submissions.
 * - Rejects bots (honeypot + Cloudflare Turnstile)
 * - Requires the consent box, stores the EXACT consent text shown plus time, IP, page and version
 * - Saves the lead to D1, then alerts the agency (webhook and/or email). The lead is never shared or sold.
 * Accepts JSON (multi-step form) or form-encoded posts (no-JavaScript fallback → 303 to the thank-you page).
 * English or Spanish: `lang` picks the consent text (own version per language), the error messages and the
 * thank-you page; Spanish-page leads are saved with language 'es' so the agent calls in Spanish.
 */
import { brand } from '../../src/config/site';
import { CONSENT_VERSIONS, consentText } from '../../src/lib/consent';
import { LEAD_ENUMS, refCode, telegram } from '../../src/lib/alerts';
import { sendConfirmation } from '../../src/lib/sms';
import { verifyTurnstile } from '../../src/lib/turnstile';

interface Env {
  LEADS_DB: D1Database;
  TURNSTILE_SECRET?: string;
  ALLOWED_STATES?: string;
  NOTIFY_WEBHOOK_URL?: string;
  NOTIFY_WEBHOOK_TOKEN?: string;
  RESEND_API_KEY?: string;
  NOTIFY_EMAIL_TO?: string;
  NOTIFY_EMAIL_FROM?: string;
  TELEGRAM_BOT_TOKEN?: string; // instant lead alert to Aaron's phone (Telegram bot)
  TELEGRAM_CHAT_ID?: string;
  OPENPHONE_API_KEY?: string; // confirmation text to the lead from the site number (src/lib/sms.ts)
  OPENPHONE_FROM?: string;
}

type Lead = Record<string, string>;

const pick = (o: Lead, k: string, max = 120) => String(o[k] ?? '').trim().slice(0, max);
const ENUMS = LEAD_ENUMS;
type Lang = 'en' | 'es';

const MSG: Record<Lang, Record<string, string>> = {
  en: {
    unreadable: 'Could not read the form.',
    consent: 'Please check the consent box, or call us instead.',
    first: 'Please add your first name.',
    phone: 'Please enter a 10-digit phone number.',
    robot: 'We could not confirm you are not a robot. Please try again.',
    stale: 'This page is out of date. Please refresh and try again.',
    fallback: 'Something went wrong.',
    back: 'Please go back and try again, or call us.',
  },
  es: {
    unreadable: 'No pudimos leer el formulario.',
    consent: 'Marque la casilla de consentimiento, o llámenos.',
    first: 'Escriba su nombre.',
    phone: 'Escriba un número de teléfono de 10 dígitos.',
    robot: 'No pudimos confirmar que usted no es un robot. Inténtelo otra vez.',
    stale: 'Esta página está desactualizada. Actualícela e inténtelo otra vez.',
    fallback: 'Algo salió mal.',
    back: 'Regrese e inténtelo otra vez, o llámenos.',
  },
};
const THANKS: Record<Lang, string> = { en: '/thank-you/', es: '/es/gracias/' };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function reply(isJson: boolean, status: number, data: Record<string, unknown>, origin: string, lang: Lang = 'en') {
  if (isJson) return Response.json(data, { status });
  if (status < 300) return Response.redirect(new URL(THANKS[lang], origin).href, 303);
  return new Response(`${data.error ?? MSG[lang].fallback} ${MSG[lang].back}`, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const url = new URL(request.url);
  const isJson = (request.headers.get('content-type') || '').includes('application/json');
  let raw: Lead = {};
  try {
    raw = isJson ? await request.json() : (Object.fromEntries((await request.formData()).entries()) as Lead);
  } catch {
    return reply(isJson, 400, { error: MSG.en.unreadable }, url.origin);
  }
  const lang: Lang = pick(raw, 'lang', 2) === 'es' ? 'es' : 'en';
  const m = MSG[lang];
  const send = (status: number, data: Record<string, unknown>) => reply(isJson, status, data, url.origin, lang);

  // Honeypot: real people never fill this hidden field. Pretend success, store nothing.
  if (pick(raw, 'company_website')) return send(200, { ok: true });

  const ip = request.headers.get('cf-connecting-ip') || '';
  const lead = {
    first_name: pick(raw, 'first_name', 60),
    last_name: pick(raw, 'last_name', 60),
    phone: pick(raw, 'phone', 30).replace(/[^\d+]/g, ''),
    email: pick(raw, 'email', 120).toLowerCase(),
    coverage_for: pick(raw, 'for', 20),
    age_range: pick(raw, 'age', 20),
    state: pick(raw, 'state', 10).toUpperCase(),
    coverage: pick(raw, 'coverage', 10),
    tobacco: pick(raw, 'tobacco', 5),
    health: pick(raw, 'health', 10),
    best_time: pick(raw, 'best_time', 12) || 'anytime',
    language: pick(raw, 'language', 2) || lang, // a Spanish-page lead is called in Spanish unless they say otherwise
    page: pick(raw, 'page', 200),
    utm: pick(raw, 'utm', 400),
  };

  // Validation
  const digits = lead.phone.replace(/\D/g, '');
  if (pick(raw, 'consent') !== 'yes') return send(422, { error: m.consent });
  // Only first name + phone + consent are asked before sending; the rest is optional on the thank-you page.
  if (!lead.first_name) return send(422, { error: m.first });
  if (digits.length < 10 || digits.length > 11) return send(422, { error: m.phone });
  if (lead.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) lead.email = '';
  const allowed = (env.ALLOWED_STATES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (lead.state !== 'OTHER' && allowed.length && !allowed.includes(lead.state)) lead.state = 'OTHER';
  const enumMap: Record<string, keyof typeof lead> = {
    for: 'coverage_for', age: 'age_range', coverage: 'coverage', tobacco: 'tobacco', health: 'health', best_time: 'best_time', language: 'language',
  };
  for (const [k, field] of Object.entries(enumMap)) {
    if (lead[field] && !ENUMS[k].includes(lead[field])) lead[field] = '';
  }

  // Bot check
  const ts = await verifyTurnstile(env.TURNSTILE_SECRET, pick(raw, 'cf-turnstile-response', 4096), ip, url.hostname);
  if (!ts.ok) return send(403, { error: m.robot });

  // Consent proof: the server rebuilds the exact text for the version (and language) the page showed.
  const version = pick(raw, 'consent_version', 40);
  if (version !== CONSENT_VERSIONS[lang]) return send(409, { error: m.stale });
  const consent = consentText(brand.name, lang).plain;

  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  // One-time token so the visitor can add optional details on the thank-you page (2-hour window).
  const edit_token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const edit_expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const cf = (request as unknown as { cf?: { country?: string; region?: string } }).cf || {};
  await env.LEADS_DB.prepare(
    `INSERT INTO leads (id, created_at, first_name, last_name, phone, email, coverage_for, age_range, state, coverage, tobacco, health,
      best_time, language, page, utm, consent_version, consent_text, consent_sha256, ip, user_agent, country, region, turnstile_ok,
      edit_token, edit_expires)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, 1, ?24, ?25)`,
  )
    .bind(
      id, created_at, lead.first_name, lead.last_name, lead.phone, lead.email || null, lead.coverage_for, lead.age_range, lead.state,
      lead.coverage, lead.tobacco, lead.health, lead.best_time, lead.language, lead.page, lead.utm, version, consent, await sha256(consent),
      ip, (request.headers.get('user-agent') || '').slice(0, 300), cf.country || null, cf.region || null,
      edit_token, edit_expires,
    )
    .run();

  waitUntil(notify(env, { id, created_at, ...lead }));
  return send(200, { ok: true, id, token: edit_token });
};

async function notify(env: Env, lead: Record<string, string>) {
  const summary =
    `New website lead: ${lead.first_name} ${lead.last_name} · ${lead.phone} · ${lead.state} · age ${lead.age_range} · ` +
    `$${lead.coverage} · tobacco ${lead.tobacco} · health ${lead.health}${lead.language === 'es' ? ' · SPANISH' : ''} · from ${lead.page} · ref ${refCode(lead.id)}`;
  const jobs: Promise<unknown>[] = [];
  const tg = telegram(
    env,
    [
      `🌿 New lead (call within 5 minutes): ${lead.first_name} ${lead.last_name}`.trim(),
      `📞 ${lead.phone}`,
      `${lead.state} · age ${lead.age_range} · $${lead.coverage} · tobacco ${lead.tobacco} · health ${lead.health}`,
      ...(lead.language === 'es' ? ['🗣 Spanish speaker: call in Spanish'] : []),
      `From ${lead.page} · ref ${refCode(lead.id)}`,
    ].join('\n'),
  );
  if (tg) jobs.push(tg);
  if (env.NOTIFY_WEBHOOK_URL) {
    jobs.push(
      fetch(env.NOTIFY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(env.NOTIFY_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.NOTIFY_WEBHOOK_TOKEN}` } : {}),
        },
        body: JSON.stringify({ source: 'website', summary, lead }),
      }),
    );
  }
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL_TO && env.NOTIFY_EMAIL_FROM) {
    jobs.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: env.NOTIFY_EMAIL_FROM,
          to: env.NOTIFY_EMAIL_TO,
          subject: `Website lead: ${lead.first_name} ${lead.last_name} (${lead.state}, ${lead.age_range})`,
          text: `${summary}\n\nLead id ${lead.id}. Call within 5 minutes if you can; speed matters.`,
        }),
      }),
    );
  }
  // Confirmation text to the lead (9 AM–8 PM Eastern only; dormant until the OpenPhone secrets are set).
  const sms = await sendConfirmation(env, lead.phone, lead.first_name, lead.language === 'es' ? 'es' : 'en');
  if (sms.startsWith('failed')) {
    const warn = telegram(env, `⚠️ The confirmation text to ${lead.first_name} (ref ${refCode(lead.id)}) didn't send (${sms}). Call them as usual.`);
    if (warn) jobs.push(warn);
  }
  const results = await Promise.allSettled(jobs);
  await env.LEADS_DB.prepare('UPDATE leads SET notified = ?1, sms_status = ?2 WHERE id = ?3')
    .bind(results.some((r) => r.status === 'fulfilled') ? 1 : 0, sms, lead.id)
    .run();
}
