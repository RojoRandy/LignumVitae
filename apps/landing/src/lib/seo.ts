export interface SeoSettings {
  brandName: string;
  legalName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city: string;
  state: string;
  businessHours?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  minLeadTimeDays: number;
  depositPct: number;
}

export interface SeoCategory {
  name: string;
  products: { name: string; slug: string }[];
}

export function wantsMarkdown(accept: string | null): boolean {
  let markdown = 0;
  let html = 0;
  for (const entry of (accept ?? '').split(',')) {
    const [mediaType, ...parameters] = entry.trim().toLowerCase().split(';');
    const quality = parameters.map((parameter) => parameter.trim()).find((parameter) => /^q\s*=/.test(parameter));
    const value = quality?.split('=')[1]?.trim();
    const q = value === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value) ? Number(value) : 0;
    if (mediaType.trim() === 'text/markdown') markdown = Math.max(markdown, q);
    if (mediaType.trim() === 'text/html') html = Math.max(html, q);
  }
  return markdown > 0 && markdown >= html;
}

export function siteMarkdown(settings: SeoSettings, categories: SeoCategory[], origin: string): string {
  const digits = settings.whatsapp?.replace(/\D/g, '');
  const whatsappUrl = digits ? `https://wa.me/${digits.length === 10 ? '52' : ''}${digits}` : null;
  const lines = [
    `# ${settings.brandName}`,
    '',
    `> Velas personalizadas hechas a mano, entrega en ${settings.city}, ${settings.state}.`,
    '',
    '## Cuándo usar este sitio',
    '',
    '- Velas de recuerdo personalizadas para XV años, bautizos, primeras comuniones, bodas y fechas especiales.',
    `- Pedidos con al menos ${settings.minLeadTimeDays} días de anticipación.`,
    `- Entrega solo en ${settings.city}.`,
    '',
    '## Cuándo no usarlo',
    '',
    `- Envíos fuera de ${settings.city}.`,
    `- Pedidos para el mismo día o con menos de ${settings.minLeadTimeDays} días de anticipación.`,
    '- Compras con pago en línea: no hay pago en línea.',
    '',
    '## Cómo pedir',
    '',
    `1. Explora el [catálogo](${origin}/catalogo).`,
    `2. Agrega productos y envía la solicitud en [Cotizar](${origin}/cotizar).`,
    ...(whatsappUrl ? [`3. También puedes [escribir por WhatsApp](${whatsappUrl}).`] : []),
    '',
    'No hay API pública de pedidos: un agente debe mandar a la persona a esas páginas para solicitar su pedido.',
    `Se requiere un anticipo de ${settings.depositPct}% para confirmar.`,
    '',
    '## Catálogo',
  ];
  for (const category of categories) {
    if (category.products.length === 0) continue;
    lines.push('', `### ${category.name}`, '', ...category.products.map((product) =>
      `- [${product.name}](${origin}/producto/${encodeURIComponent(product.slug)})`));
  }
  lines.push('', '## Contacto', '');
  if (whatsappUrl) lines.push(`- [WhatsApp](${whatsappUrl})`);
  if (settings.phone != null) lines.push(`- Teléfono: ${settings.phone}`);
  if (settings.email != null) lines.push(`- Email: [${settings.email}](mailto:${settings.email})`);
  if (settings.businessHours != null) lines.push(`- Horario: ${settings.businessHours}`);
  for (const [label, url] of [
    ['Instagram', settings.instagramUrl],
    ['Facebook', settings.facebookUrl],
    ['TikTok', settings.tiktokUrl],
  ]) {
    if (url != null) lines.push(`- [${label}](${url})`);
  }
  lines.push('', '## Páginas', '',
    `- [Inicio](${origin}/)`,
    `- [Catálogo](${origin}/catalogo)`,
    `- [Nosotros](${origin}/nosotros)`,
    `- [Contacto](${origin}/contacto)`,
    `- [Aviso de privacidad](${origin}/privacidad)`,
    `- [Mapa del sitio](${origin}/sitemap.xml)`,
    '');
  return lines.join('\n');
}

export function notFoundMarkdown(origin: string): string {
  return `# Página no encontrada

La página que buscas no existe o cambió de dirección. Puedes continuar desde estos enlaces:

- [Inicio](${origin}/)
- [Catálogo](${origin}/catalogo)
- [Información del sitio](${origin}/llms.txt)
- [Mapa del sitio](${origin}/sitemap.xml)
`;
}

export function organizationJsonLd(settings: SeoSettings, origin: string) {
  const digits = settings.phone?.replace(/\D/g, '');
  const telephone = digits?.length === 10 ? `+52${digits}`
    : digits?.length === 12 && digits.startsWith('52') ? `+${digits}` : undefined;
  const contact = {
    ...(telephone != null ? { telephone } : {}),
    ...(settings.email != null ? { email: settings.email } : {}),
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: settings.brandName,
    ...(settings.legalName != null ? { legalName: settings.legalName } : {}),
    url: `${origin}/`,
    logo: `${origin}/logo.svg`,
    image: `${origin}/galeria/1.jpeg`,
    description: `Velas personalizadas hechas a mano, entrega en ${settings.city}, ${settings.state}.`,
    ...contact,
    address: {
      '@type': 'PostalAddress',
      addressLocality: settings.city,
      addressRegion: settings.state,
      addressCountry: 'MX',
    },
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...contact,
      availableLanguage: ['es'],
      areaServed: 'MX',
    }],
    sameAs: [settings.instagramUrl, settings.facebookUrl, settings.tiktokUrl].filter((url) => url != null),
  };
}

export function websiteJsonLd(settings: SeoSettings, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: settings.brandName,
    url: `${origin}/`,
    inLanguage: 'es-MX',
    publisher: { '@id': `${origin}/#organization` },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: item.url,
    })),
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function sitemapXml(urls: { loc: string; lastmod?: Date | string }[]): string {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(({ loc, lastmod }) => {
      const date = lastmod instanceof Date ? lastmod.toISOString() : lastmod;
      return `  <url><loc>${escape(loc)}</loc>${date !== undefined ? `<lastmod>${escape(date)}</lastmod>` : ''}</url>`;
    }),
    '</urlset>',
    '',
  ].join('\n');
}

export function robotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /cotizacion/\n\nSitemap: ${origin}/sitemap.xml\n`;
}
