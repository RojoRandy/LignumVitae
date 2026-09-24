import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  breadcrumbJsonLd, jsonLdScript, notFoundMarkdown, organizationJsonLd,
  robotsTxt, siteMarkdown, sitemapXml, wantsMarkdown, websiteJsonLd,
  type SeoSettings,
} from './seo.ts';

const origin = 'https://lignumvitae.com.mx';
const settings: SeoSettings = {
  brandName: 'Lignum Vitae',
  legalName: 'Lignum Vitae Legal',
  phone: '(81) 1234-5678',
  whatsapp: '81 8765 4321',
  email: 'hola@example.com',
  city: 'Monterrey',
  state: 'Nuevo León',
  businessHours: 'Lunes a viernes de 9:00 a 18:00',
  instagramUrl: 'https://www.instagram.com/example',
  facebookUrl: null,
  tiktokUrl: null,
  minLeadTimeDays: 15,
  depositPct: 50,
};

test('Accept negocia Markdown por tipo explícito y calidad', () => {
  const cases: [string | null, boolean][] = [
    ['text/markdown', true], ['text/html', false], ['*/*', false],
    ['text/*', false], ['', false], [null, false],
    ['text/markdown;q=0.5, text/html', false],
    ['text/html;q=0.5, text/markdown', true], ['text/markdown;q=0', false],
    ['text/html;q=0.5, text/markdown;q=0.5', true],
    ['text/markdown;q=0.1, */*', true],
    [' TEXT/MARKDOWN ; charset=utf-8; Q=0.8, text/html;q=0.7', true],
    ['text/markdown;q=invalid', false], ['text/markdown;q=2', false],
    ['text/markdown;q=-1', false], ['text/markdown;q=', false],
    ['text/markdown;q=0, text/markdown;q=0.8', true],
  ];
  for (const [accept, expected] of cases) assert.equal(wantsMarkdown(accept), expected, String(accept));
});

test('JSON-LD escapa cada apertura de etiqueta y conserva los datos', () => {
  const data = { name: '</script><script>alert(1)</script>' };
  const result = jsonLdScript(data);
  assert.ok(!result.includes('<'));
  assert.ok(result.includes('\\u003c/script>'));
  assert.deepEqual(JSON.parse(result), data);
});

test('sitemap incluye el protocolo, escapa XML y serializa fechas', () => {
  const xml = sitemapXml([
    { loc: `${origin}/?a=1&b=<"'>`, lastmod: new Date('2026-09-24T12:30:00Z') },
    { loc: `${origin}/catalogo`, lastmod: '2026-09-23' },
    { loc: `${origin}/nosotros` },
  ]);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(xml.includes('?a=1&amp;b=&lt;&quot;&apos;&gt;</loc>'));
  assert.ok(xml.includes('<lastmod>2026-09-24T12:30:00.000Z</lastmod>'));
  assert.ok(xml.includes('<lastmod>2026-09-23</lastmod>'));
  assert.ok(xml.includes(`<url><loc>${origin}/nosotros</loc></url>`));
  assert.ok(sitemapXml([]).endsWith('</urlset>\n'));
});

test('Organization incluye identidad, dirección y contacto en E.164', () => {
  const organization = organizationJsonLd(settings, origin);
  assert.equal(organization['@context'], 'https://schema.org');
  assert.equal(organization['@type'], 'Organization');
  assert.equal(organization['@id'], `${origin}/#organization`);
  assert.equal(organization.name, settings.brandName);
  assert.equal(organization.legalName, settings.legalName);
  assert.equal(organization.url, `${origin}/`);
  assert.equal(organization.logo, `${origin}/logo.svg`);
  assert.equal(organization.image, `${origin}/galeria/1.jpeg`);
  assert.equal(organization.telephone, '+528112345678');
  assert.equal(organization.email, settings.email);
  assert.deepEqual(organization.address, {
    '@type': 'PostalAddress', addressLocality: 'Monterrey', addressRegion: 'Nuevo León', addressCountry: 'MX',
  });
  assert.deepEqual(organization.contactPoint, [{
    '@type': 'ContactPoint', contactType: 'customer service', telephone: '+528112345678',
    email: settings.email, availableLanguage: ['es'], areaServed: 'MX',
  }]);
  assert.deepEqual(organization.sameAs, [settings.instagramUrl]);
  assert.equal(organizationJsonLd({ ...settings, phone: '+52 81 1234 5678' }, origin).telephone, '+528112345678');
});

test('Organization omite claves nulas o ausentes también dentro del contacto', () => {
  for (const missing of [null, undefined]) {
    const organization = organizationJsonLd({
      ...settings, legalName: missing, phone: missing, email: missing, instagramUrl: missing,
    }, origin);
    assert.ok(!Object.hasOwn(organization, 'email'));
    assert.ok(!Object.hasOwn(organization, 'telephone'));
    assert.ok(!Object.hasOwn(organization, 'legalName'));
    assert.ok(!Object.hasOwn(organization.contactPoint[0], 'email'));
    assert.ok(!Object.hasOwn(organization.contactPoint[0], 'telephone'));
    assert.deepEqual(organization.sameAs, []);
  }
});

test('WebSite enlaza al publisher y usa español de México', () => {
  assert.deepEqual(websiteJsonLd(settings, origin), {
    '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${origin}/#website`,
    name: settings.brandName, url: `${origin}/`, inLanguage: 'es-MX',
    publisher: { '@id': `${origin}/#organization` },
  });
});

test('BreadcrumbList mantiene enlaces y posiciones desde uno', () => {
  const result = breadcrumbJsonLd([{ name: 'Inicio', url: `${origin}/` }, { name: 'Catálogo', url: `${origin}/catalogo` }]);
  assert.equal(result['@type'], 'BreadcrumbList');
  assert.deepEqual(result.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${origin}/catalogo` },
  ]);
  assert.deepEqual(breadcrumbJsonLd([]).itemListElement, []);
});

test('Markdown orienta pedidos, agrupa productos y publica contacto y páginas', () => {
  const markdown = siteMarkdown(settings, [
    { name: 'Bautizos', products: [{ name: 'Vela corazón', slug: 'corazón / especial' }] },
    { name: 'Vacía', products: [] },
  ], origin);
  assert.ok(markdown.startsWith('# Lignum Vitae\n\n> '));
  for (const text of [
    '## Cuándo usar este sitio', '## Cuándo no usarlo', 'primeras comuniones',
    'al menos 15 días', 'fuera de Monterrey', 'mismo día', 'menos de 15 días',
    'no hay pago en línea', 'No hay API pública de pedidos', 'anticipo de 50%',
    '### Bautizos', `[Vela corazón](${origin}/producto/coraz%C3%B3n%20%2F%20especial)`,
    'https://wa.me/528187654321', settings.phone!, settings.email!, settings.businessHours!, settings.instagramUrl!,
  ]) assert.ok(markdown.includes(text), text);
  for (const path of ['/', '/catalogo', '/cotizar', '/nosotros', '/contacto', '/privacidad', '/sitemap.xml']) {
    assert.ok(markdown.includes(`](${origin}${path})`), path);
  }
  assert.ok(!markdown.includes('### Vacía'));
  assert.ok(!markdown.includes('null'));
  assert.ok(siteMarkdown({ ...settings, whatsapp: '+52 81 8765 4321' }, [], origin).includes('https://wa.me/528187654321'));
});

test('Markdown omite los contactos no disponibles', () => {
  const markdown = siteMarkdown({
    ...settings, whatsapp: null, phone: null, email: null, businessHours: null, instagramUrl: null,
  }, [], origin);
  for (const text of ['wa.me', 'Teléfono:', 'Email:', 'Horario:', 'Instagram', 'null', 'undefined']) {
    assert.ok(!markdown.includes(text), text);
  }
});

test('404 explica el error y ofrece enlaces de recuperación', () => {
  const markdown = notFoundMarkdown(origin);
  assert.ok(markdown.startsWith('# Página no encontrada\n'));
  assert.ok(markdown.split('\n\n')[1].length > 20);
  for (const path of ['/', '/catalogo', '/llms.txt', '/sitemap.xml']) assert.ok(markdown.includes(`](${origin}${path})`));
});

test('robots tiene las reglas exactas y salto final', () => {
  assert.equal(robotsTxt(origin), `User-agent: *\nAllow: /\nDisallow: /cotizacion/\n\nSitemap: ${origin}/sitemap.xml\n`);
});
