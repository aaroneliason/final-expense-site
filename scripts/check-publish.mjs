#!/usr/bin/env node
/**
 * Pre-publish gate. A production build refuses to run while anything below is unresolved:
 *  - any "TODO" left in src/ (unverified facts, placeholder brand/phone, missing photo text, etc.)
 *  - license list or agent details not marked verified
 *  - placeholder sample rates
 *  - carriers named in rate rows without written ad approval
 *  - the D1 database id still a placeholder
 * Run: npm run check:publish   (also runs automatically in npm run build:production)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
const rates = readFileSync(join(root, 'src/data/rates.ts'), 'utf8');
if (/placeholder:\s*true/.test(rates)) problems.push('src/data/rates.ts  sample rates are still placeholders');
if (!/adApproval:\s*'approved'/.test(site)) problems.push('src/config/site.ts  no carrier has written ad approval yet');
const wrangler = readFileSync(join(root, 'wrangler.toml'), 'utf8');
if (wrangler.includes('00000000-0000-0000-0000-000000000000')) problems.push('wrangler.toml  D1 database_id is still a placeholder');
if (!process.env.SITE_URL || process.env.SITE_URL.includes('invalid')) problems.push('SITE_URL env var not set to the real domain');

if (problems.length) {
  console.error(`\n✗ Not ready to publish: ${problems.length} item(s)\n`);
  for (const p of problems) console.error('  - ' + p);
  console.error('\nPreview builds (npm run build) still work; they are noindex and blocked in robots.txt.\n');
  process.exit(1);
}
console.log('✓ Ready to publish.');
