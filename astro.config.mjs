// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// SITE_URL is the real domain once it's bought (e.g. https://example.com).
// Until then builds are "preview" builds: noindex everywhere, robots.txt blocks crawling.
const SITE_URL = process.env.SITE_URL || 'https://preview.invalid';
// Sitemap <lastmod>: the content review date kept in src/config/site.ts (lastReviewed).
const LAST_REVIEWED = (readFileSync(new URL('./src/config/site.ts', import.meta.url), 'utf8').match(/lastReviewed = '([\d-]+)'/) || [])[1];

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/thank-you/') && !page.includes('/gracias/') && !page.includes('/404'),
      ...(LAST_REVIEWED ? { lastmod: new Date(LAST_REVIEWED + 'T12:00:00Z') } : {}),
    }),
  ],
});
