import type { APIRoute } from 'astro';
import { SITE_MODE } from '../config/site';

// Preview builds block all crawling; production builds allow it and point to the sitemap.
export const GET: APIRoute = ({ site }) => {
  const body =
    SITE_MODE === 'production' && site
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /thank-you/\n\nSitemap: ${new URL('sitemap-index.xml', site).href}\n`
      : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
