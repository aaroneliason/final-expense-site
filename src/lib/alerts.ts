/** Shared by the lead API routes (functions/api/*). Kept outside functions/ so it isn't a route itself. */

export const refCode = (id: string) => {
  const r = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${r.slice(0, 4)}-${r.slice(4)}`;
};

/** Instant alert to Aaron's phone through a private Telegram bot (free, arrives in seconds). */
export function telegram(env: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string }, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return null;
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  });
}

export const LEAD_ENUMS: Record<string, string[]> = {
  for: ['myself', 'spouse', 'parent', 'other'],
  age: ['under-50', '50-59', '60-69', '70-79', '80-85', 'over-85'],
  coverage: ['5000', '10000', '15000', '20000', '25000', 'unsure'],
  tobacco: ['no', 'yes'],
  health: ['no', 'yes', 'unsure'],
  best_time: ['anytime', 'morning', 'afternoon', 'evening'],
  language: ['en', 'es'],
};
