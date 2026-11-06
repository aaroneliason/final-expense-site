# Olive Tree Insurance Agency site — guide for Claude

Read `README.md` first: run/deploy commands, file map, and the compliance rules that must not be undone.

- **Owner:** Claude builds and maintains this site end to end for Aaron Eliason (licensed agent, FL G246242, NPN 21620314). Aaron approves anything that costs money, goes public, or contacts people.
- **Business context** (research, decisions, launch plan, status): private vault repo `aaroneliason/aaron-vault`, folder `Projects/Final Expense Site/`. Update its project page when status changes.
- **Facts live in one place:** `src/config/site.ts` (brand, phone, licenses), `src/data/carriers.json` (appointments by state, live contract, ad approval) and `src/data/rates.ts`. Never hard-code them in pages. Name insurers only through `nameableIn(state)`.
- **Launch gate:** `npm run check:publish` lists every blocker. Production builds refuse to run until it passes. Mark anything unverified with `TODO` so the gate catches it.
- **Preview only until launch:** `npm run build` output is noindex everywhere and `*.pages.dev` sends `X-Robots-Tag: noindex`. Don't remove either.
- **Compliance (Florida + NAIC Model 570):** no "free", no government look-alikes or "program" wording, no-exam claims always paired with "approval depends on your health answers", the insurer named next to any price, carriers named only after written ad approval and an active appointment in that state, consent names one seller and is stored verbatim. Bump `CONSENT_VERSION` on any consent wording change.
- **Secrets** go in Cloudflare (`wrangler pages secret put`) or `.dev.vars` (gitignored). Never commit them; this repo is public.
