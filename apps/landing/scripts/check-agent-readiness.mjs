// Verifica el landing con Node >=22. Uso: node apps/landing/scripts/check-agent-readiness.mjs [baseUrl]
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const baseUrl = (process.argv[2] ?? 'http://localhost:4321').replace(/\/+$/, '');
let passed = 0;
let total = 0;
let homeHtml = '';

async function check(name, run) {
  total++;
  try {
    await run();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name} — ${error.message.replace(/\s+/g, ' ')}`);
  }
}

async function get(path, accept, status = 200, contentType, userAgent) {
  const headers = {};
  if (accept) headers.Accept = accept;
  if (userAgent) headers['User-Agent'] = userAgent;
  const response = await fetch(`${baseUrl}${path}`, {
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  assert.equal(response.status, status, `status ${response.status}; esperado ${status}`);
  if (contentType) {
    const actual = response.headers.get('content-type') ?? '';
    assert.match(actual, contentType, `content-type inesperado: ${actual || '(ausente)'}`);
  }
  return { response, body };
}

function checkVary(response) {
  const vary = response.headers.get('vary') ?? '';
  assert(vary.split(',').some((value) => value.trim().toLowerCase() === 'accept'),
    `Vary no incluye Accept: ${vary || '(ausente)'}`);
}

await check('/ — Markdown', async () => {
  const { response, body } = await get('/', 'text/markdown', 200, /^text\/markdown/i);
  checkVary(response);
  assert(body.startsWith('# '), 'el cuerpo no empieza con # ');
});

await check('/ — HTML', async () => {
  const { response, body } = await get('/', 'text/html', 200, /^text\/html\b/i);
  homeHtml = body;
  checkVary(response);
});

await check('404 — Markdown', async () => {
  const { body } = await get(`/__agent-404-probe-${randomUUID()}`, 'text/markdown', 404, /^text\/markdown\b/i);
  assert(body.length >= 20, `cuerpo de ${body.length} caracteres; esperado 20+`);
  assert(/\/(llms\.txt|sitemap\.xml)/.test(body), 'faltan enlaces a /llms.txt o /sitemap.xml');
});

await check('/robots.txt', async () => {
  const { body } = await get('/robots.txt', undefined, 200, /^text\/plain\b/i);
  assert(body.includes('Sitemap:'), 'falta Sitemap:');
  assert(!body.includes('Content-Signal'), 'contiene Content-Signal');
  assert(!/^\s*Disallow:\s*\/\s*$/im.test(body), 'contiene una línea Disallow: /');
});

await check('/sitemap.xml', async () => {
  const { body } = await get('/sitemap.xml', undefined, 200, /xml/i);
  assert(body.includes('<urlset'), 'falta <urlset');
  assert(body.includes('<lastmod>'), 'falta <lastmod>');
});

await check('/llms.txt', async () => {
  const { body } = await get('/llms.txt', undefined, 200, /^text\/markdown\b/i);
  assert(body.startsWith('# '), 'el cuerpo no empieza con # ');
  assert(body.includes('Cuándo usar'), 'falta Cuándo usar');
});

await check('/ — metadatos y JSON-LD Organization', async () => {
  assert(homeHtml, 'HTML del home no disponible');
  for (const [pattern, name] of [
    [/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i, 'html lang'],
    [/<link\b[^>]*\brel\s*=\s*["']canonical["']/i, 'canonical'],
    [/<meta\b[^>]*\bproperty\s*=\s*["']og:image["']/i, 'og:image'],
    [/<meta\b[^>]*\bproperty\s*=\s*["']og:type["']/i, 'og:type'],
    [/<meta\b[^>]*\bname\s*=\s*["']description["']/i, 'description'],
  ]) {
    assert(pattern.test(homeHtml), `falta ${name}`);
  }
  const scripts = [...homeHtml.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)];
  assert(scripts.length > 0, 'falta script application/ld+json');
  const entities = scripts.flatMap(([, json]) => {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [parsed];
  });
  const nodes = entities.flatMap((entity) => [entity, ...(Array.isArray(entity?.['@graph']) ? entity['@graph'] : [])]);
  assert(nodes.some((entity) => {
    const types = entity?.['@type'];
    return (Array.isArray(types) ? types.includes('Organization') : types === 'Organization')
      && entity.contactPoint && entity.address;
  }), 'falta Organization con contactPoint y address');
});

for (const path of ['/nosotros', '/contacto', '/privacidad']) {
  await check(`${path} — texto visible`, async () => {
    const { body } = await get(path, 'text/html');
    const main = body.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i);
    assert(main, 'falta <main>');
    const visible = main[1]
      .replace(/<!--[^]*?-->/g, '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    assert(visible.length >= 500, `texto visible de ${visible.length} caracteres; esperado 500+`);
  });
}

for (const userAgent of [
  'ClaudeBot/1.0 (+claudebot@anthropic.com)',
  'GPTBot/1.1',
  'ChatGPT-User/1.0',
  'Google-Extended',
  'DeepSeekBot/1.0',
]) {
  await check(`/ — User-Agent ${userAgent}`, async () => {
    await get('/', undefined, 200, undefined, userAgent);
  });
}

console.log(`\n${passed}/${total}`);
if (passed !== total) process.exit(1);
