# Olive Tree Insurance Agency: website

Static Astro site deployed on Cloudflare Pages. A Pages Function (`/api/lead`) stores quote-form leads in Cloudflare D1, with consent proof, and alerts Aaron.
Business context, research and the launch plan live in Aaron's private vault repo (`aaroneliason/aaron-vault`, folder `Projects/Final Expense Site/`).

## Run it

```bash
npm install
npm run dev              # local dev server
npm run build            # PREVIEW build: noindex everywhere, robots.txt blocks crawling, TODO tags visible
npm run check:publish    # lists everything still blocking launch
SITE_URL=https://<domain> npm run build:production   # refuses to build until check:publish passes
```

## Deploy (Cloudflare Pages)

1. One-time setup:
   ```bash
   npx wrangler login                       # or set CLOUDFLARE_API_TOKEN
   npx wrangler pages project create final-expense-site --production-branch main
   npx wrangler d1 create fe-leads          # paste the database_id into wrangler.toml
   npx wrangler d1 execute fe-leads --remote --file=schema.sql
   npx wrangler pages secret put TURNSTILE_SECRET   # from Cloudflare → Turnstile
   # optional lead alerts:
   npx wrangler pages secret put RESEND_API_KEY
   npx wrangler pages secret put NOTIFY_EMAIL_TO
   npx wrangler pages secret put NOTIFY_EMAIL_FROM
   npx wrangler pages secret put NOTIFY_WEBHOOK_URL     # e.g. an Aaron OS prospects endpoint
   npx wrangler pages secret put NOTIFY_WEBHOOK_TOKEN
   ```
2. Preview deploy (safe; every `*.pages.dev` URL sends `X-Robots-Tag: noindex`):
   ```bash
   npm run build && npx wrangler pages deploy
   ```
3. Production, only after `check:publish` passes and every carrier has approved the copy:
   ```bash
   SITE_URL=https://<domain> PUBLIC_TURNSTILE_SITE_KEY=<key> PUBLIC_GA4_ID=G-XXXX PUBLIC_CF_BEACON_TOKEN=<token> \
     npm run build:production && npx wrangler pages deploy --branch main
   ```
   Then attach the custom domain in Cloudflare Pages, and submit `https://<domain>/sitemap-index.xml` in Google Search Console and Bing Webmaster Tools.

## Where things live

| What | File |
|---|---|
| Business facts (brand, phone, licenses) | `src/config/site.ts` |
| Insurers: appointments by state, live contract, ad approval | `src/data/carriers.json` |
| Sample rates (must name the insurer + date; Fla. Rule 69B-150.114) | `src/data/rates.ts` |
| Team page: real people, headshots, licenses | `src/data/team.json`, `src/assets/team/` |
| Consent wording (bump `CONSENT_VERSION` on any change) | `src/lib/consent.ts` |
| Structured data (InsuranceAgency, Person, Article, Breadcrumbs) | `src/lib/schema.ts` |
| Design system | `src/styles/global.css` |
| Lead API | `functions/api/lead.ts`, `schema.sql` |
| Launch gate | `scripts/check-publish.mjs` |

## Compliance rules baked in (don't undo)

- Every rate names the insurer, plan and quote date. Name a carrier only after its written ad approval **and** an active appointment in that state. `src/data/carriers.json` plus `check:publish` enforce this, and "several insurers" needs 2 or more insurers Aaron can write in Florida.
- Never write "free", "no cost", "government", "program" or "benefit program", and use no official-looking seals. Every page footer says the site isn't affiliated with any government agency.
- "No medical exam" always appears next to "approval depends on your health answers" (NAIC 570 §5C).
- Waiting periods on graded and guaranteed-issue plans are explained wherever those plans appear. Guaranteed issue is never called "low cost".
- Consent names one seller (Aaron), sits unchecked next to submit, and is stored verbatim with time, IP, page and version.
- Use real testimonials only, with permission, and disclose any incentive.
- Keep every approved version. Git history is the 5-year ad archive (NAIC 570 §9A).
