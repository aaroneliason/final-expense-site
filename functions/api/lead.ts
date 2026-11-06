/**
 * POST /api/lead — quote-form submissions.
 * - Rejects bots (honeypot + Cloudflare Turnstile)
 * - Requires the consent box, stores the EXACT consent text shown plus time, IP, page and version
 * - Saves the lead to D1, then alerts the agency (webhook and/or email). The lead is never shared or sold.
 * Accepts JSON (multi-step form) or form-encoded posts (no-JavaScript fallback → 303 to /thank-you/).
 */
import { brand } from '../../src/config/site';
import { CONSENT_VERSION, consentText } from '../../src/lib/consent';
import { LEAD_ENUMS, refCode, telegram } from '../../src/lib/alerts';

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
}

type Lead = Record<string, string>;

const pick = (o: Lead, k: string, max = 120) => String(o[k] ?? '').trim().slice(0, max);
const ENUMS = LEAD_ENUMS;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(secret: string | undefined, token: string, ip: string, host: string) {
  // Local testing only: `TURNSTILE_SECRET=local-test` in .dev.vars, and only on localhost.
  if (secret === 'local-test' && (host === 'localhost' || host === '127.0.0.1')) return { ok: true, reason: 'local-test' };
  if (!secret) return { ok: false, reason: 'turnstile-not-configured' };
  if (!token) return { ok: false, reason: 'missing-token' };
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const out = (await r.json().catch(() => ({}))) as { success?: boolean; 'error-codes'?: string[] };
    return { ok: !!out.success, reason: (out['error-codes'] || []).join(',') };
  } catch {
    return { ok: false, reason: 'verify-unreachable' };
  }
}

function reply(isJson: boolean, status: number, data: Record<string, unknown>, origin: string) {
  if (isJson) return Response.json(data, { status });
  if (status < 300) return Response.redirect(new URL('/thank-you/', origin).href, 303);
  return new Response(`${data.error ?? 'Something went wrong.'} Please go back and try again, or call us.`, {
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
    return reply(isJson, 400, { error: 'Could not read the form.' }, url.origin);
  }

  // Honeypot: real people never fill this hidden field. Pretend success, store nothing.
  if (pick(raw, 'company_website')) return reply(isJson, 200, { ok: true }, url.origin);

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
    language: pick(raw, 'language', 2) || 'en',
    page: pick(raw, 'page', 200),
    utm: pick(raw, 'utm', 400),
  };

  // Validation
  const digits = lead.phone.replace(/\D/g, '');
  if (pick(raw, 'consent') !== 'yes') return reply(isJson, 422, { error: 'Please check the consent box, or call us instead.' }, url.origin);
  // Only first name + phone + consent are asked before sending; the rest is optional on the thank-you page.
  if (!lead.first_name) return reply(isJson, 422, { error: 'Please add your first name.' }, url.origin);
  if (digits.length < 10 || digits.length > 11) return reply(isJson, 422, { error: 'Please enter a 10-digit phone number.' }, url.origin);
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
  if (!ts.ok) return reply(isJson, 403, { error: 'We could not confirm you are not a robot. Please try again.' }, url.origin);

  // Consent proof: the server rebuilds the exact text for the version the page showed.
  const version = pick(raw, 'consent_version', 40);
  if (version !== CONSENT_VERSION) return reply(isJson, 409, { error: 'This page is out of date. Please refresh and try again.' }, url.origin);
  const consent = consentText(brand.name).plain;

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
  return reply(isJson, 200, { ok: true, id, token: edit_token }, url.origin);
};

async function notify(env: Env, lead: Record<string, string>) {
  const summary =
    `New website lead: ${lead.first_name} ${lead.last_name} · ${lead.phone} · ${lead.state} · age ${lead.age_range} · ` +
    `$${lead.coverage} · tobacco ${lead.tobacco} · health ${lead.health} · from ${lead.page} · ref ${refCode(lead.id)}`;
  const jobs: Promise<unknown>[] = [];
  const tg = telegram(
    env,
    [
      `🌿 New lead (call within 5 minutes): ${lead.first_name} ${lead.last_name}`.trim(),
      `📞 ${lead.phone}`,
      `${lead.state} · age ${lead.age_range} · $${lead.coverage} · tobacco ${lead.tobacco} · health ${lead.health}`,
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
  const results = await Promise.allSettled(jobs);
  if (results.some((r) => r.status === 'fulfilled')) {
    await env.LEADS_DB.prepare('UPDATE leads SET notified = 1 WHERE id = ?1').bind(lead.id).run();
  }
}
