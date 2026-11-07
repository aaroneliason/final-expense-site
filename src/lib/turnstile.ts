/** Cloudflare Turnstile check, shared by the API routes (functions/api/*). */
export async function verifyTurnstile(secret: string | undefined, token: string, ip: string, host: string) {
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
