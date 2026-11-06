// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL is the real domain once it's bought (e.g. https://example.com).
// Until then builds are "preview" builds: noindex everywhere, robots.txt blocks crawling.
const SITE_URL = process.env.SITE_URL || 'https://preview.invalid';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/thank-you/') && !page.includes('/404'),
    }),
  ],
});
