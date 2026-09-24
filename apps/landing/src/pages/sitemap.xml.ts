import type { APIRoute } from 'astro';
import { getJson } from '../lib/api';
import { sitemapXml } from '../lib/seo';

interface Category {
  products: { slug: string; updatedAt: string }[];
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site!.origin;
  const categories = await getJson<Category[]>('/public/catalog');
  const products = new Map<string, string>();
  let lastmod: string | undefined;
  for (const category of categories) {
    for (const product of category.products) {
      products.set(product.slug, product.updatedAt);
      if (lastmod === undefined || Date.parse(product.updatedAt) > Date.parse(lastmod)) {
        lastmod = product.updatedAt;
      }
    }
  }

  const urls = ['/', '/catalogo', '/nosotros', '/contacto', '/privacidad'].map((path) => ({
    loc: `${origin}${path}`,
    lastmod,
  }));
  for (const [slug, updatedAt] of products) {
    urls.push({ loc: `${origin}/producto/${encodeURIComponent(slug)}`, lastmod: updatedAt });
  }

  return new Response(sitemapXml(urls), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
