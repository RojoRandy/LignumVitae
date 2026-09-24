import type { APIRoute } from 'astro';
import { getJson } from '../lib/api';
import { siteMarkdown, type SeoSettings, type SeoCategory } from '../lib/seo';

export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  const [settings, categories] = await Promise.all([
    getJson<SeoSettings>('/public/settings'),
    getJson<SeoCategory[]>('/public/catalog'),
  ]);
  return new Response(siteMarkdown(settings, categories, origin), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
