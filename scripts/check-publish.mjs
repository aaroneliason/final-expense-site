#!/usr/bin/env node
/**
 * Pre-publish gate. A production build refuses to run while anything below is unresolved:
 *  - any "TODO" left in src/ (unverified facts, placeholder brand/phone, missing photo text, etc.)
 *  - license list or agent details not marked verified
 *  - placeholder sample rates
 *  - "several insurers" with fewer than 2 insurers writable in Florida; any insurer named without
 *    a Florida appointment + live contract + written ad approval (src/data/carriers.json)
 *  - the D1 database id still a placeholder
 * Run: npm run check:publish   (also runs automatically in npm run build:production)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(astro|ts|tsx|js|mjs|md|mdx|css)$/.test(name)) {
      const lines = readFileSync(p, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (line.includes('TODO') && !line.includes('check-publish-ignore')) problems.push(`${relative(root, p)}:${i + 1}  ${line.trim().slice(0, 140)}`);
      });
    }
  }
}
walk(join(root, 'src'));

const site = readFileSync(join(root, 'src/config/site.ts'), 'utf8');
if (/verified:\s*false/.test(site)) problems.push('src/config/site.ts  some licenses/agent details are still verified: false (check NIPR + DFS)');
if (/spanish = \{\s*reviewed:\s*false/.test(site)) problems.push('src/config/site.ts  Spanish pages not yet read and approved by Aaron (spanish.reviewed: false)');
if (/guides = \{\s*agentReviewed:\s*false/.test(site)) problems.push('src/config/site.ts  guides say "reviewed by a licensed agent" but Aaron has not read them yet (guides.agentReviewed: false)');
const rates = readFileSync(join(root, 'src/data/rates.ts'), 'utf8');
if (/placeholder:\s*true/.test(rates)) problems.push('src/data/rates.ts  sample rates are still placeholders');
// Carriers: count only insurers Aaron can write in Florida; name only those that are also ad-approved.
const carrierData = JSON.parse(readFileSync(join(root, 'src/data/carriers.json'), 'utf8'));
const writableFL = carrierData.carriers.filter((c) => c.writable && c.appointedIn.includes('FL'));
const nameableFL = writableFL.filter((c) => c.adApproval === 'approved');
if (writableFL.length < 2)
  problems.push(`src/data/carriers.json  pages say "several insurers", but only ${writableFL.length} insurer(s) are confirmed writable in Florida (${writableFL.map((c) => c.shortName).join(', ') || 'none'})`);
if (!nameableFL.length) problems.push('src/data/carriers.json  no insurer is appointed in Florida, writable AND ad-approved yet, so no insurer can be named');
const okNames = new Set(nameableFL.flatMap((c) => [c.legalName, c.shortName]));
for (const name of new Set([...rates.matchAll(/insurer:\s*'([^']+)'/g)].map((m) => m[1]).filter((n) => !n.startsWith('TODO'))))
  if (!okNames.has(name)) problems.push(`src/data/rates.ts  a rate names "${name}", which is not appointed in Florida + writable + ad-approved`);
// Team page: real people only, each with a headshot on disk, written OK, and a checked license.
const team = JSON.parse(readFileSync(join(root, 'src/data/team.json'), 'utf8'));
for (const m of team.members) {
  const who = m.displayName && !m.displayName.startsWith('TODO') ? m.displayName : m.id;
  if (!m.displayName || m.displayName.startsWith('TODO')) problems.push(`src/data/team.json  ${m.id}: display name not set`);
  if (!m.photo) problems.push(`src/data/team.json  ${who}: no headshot yet (real photo only)`);
  else if (!existsSync(join(root, 'src/assets/team', m.photo))) problems.push(`src/data/team.json  ${who}: photo file src/assets/team/${m.photo} is missing`);
  if (m.bio && m.bio.startsWith('TODO')) problems.push(`src/data/team.json  ${who}: bio not written`);
  if (!m.consent) problems.push(`src/data/team.json  ${who}: no written OK to appear on the site`);
  if (!m.verified) problems.push(`src/data/team.json  ${who}: license not checked on DFS/NIPR`);
}
const wrangler = readFileSync(join(root, 'wrangler.toml'), 'utf8');
if (wrangler.includes('00000000-0000-0000-0000-000000000000')) problems.push('wrangler.toml  D1 database_id is still a placeholder');
if (!process.env.SITE_URL || process.env.SITE_URL.includes('invalid')) problems.push('SITE_URL env var not set to the real domain');
const tsKey = process.env.PUBLIC_TURNSTILE_SITE_KEY || (site.match(/siteKey:[^']*'([^']+)'/) || [])[1] || '';
if (!tsKey || tsKey.startsWith('1x0000')) problems.push('Turnstile site key is missing or is the Cloudflare test key');

if (problems.length) {
  console.error(`\n✗ Not ready to publish: ${problems.length} item(s)\n`);
  for (const p of problems) console.error('  - ' + p);
  console.error('\nPreview builds (npm run build) still work; they are noindex and blocked in robots.txt.\n');
  process.exit(1);
}
console.log('✓ Ready to publish.');
