import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo';

export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  return new Response(robotsTxt(origin), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
