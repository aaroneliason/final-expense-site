/**
 * "Save to my contacts" card for the thank-you page. People ignore calls from numbers they don't know,
 * so saving ours before we call raises the share of leads we actually reach.
 */
import type { APIRoute } from 'astro';
import { brand, phone } from '../config/site';

export const GET: APIRoute = ({ site }) => {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${brand.name}`,
    `ORG:${brand.name}`,
    `TEL;TYPE=WORK,VOICE:${phone.tel}`,
    ...(site && !site.hostname.endsWith('.invalid') ? [`URL:${site.href}`] : []),
    'NOTE:Licensed insurance agency. We call from this number about your final expense quote.',
    'END:VCARD',
  ];
  return new Response(lines.join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/vcard; charset=utf-8' },
  });
};
