// Servidor de produccion del admin, sin dependencias npm: sirve dist/ y cae
// a index.html para que react-router maneje las rutas del lado del cliente.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist');
const PORT = process.env.PORT ?? 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let filePath = normalize(join(DIST_DIR, decodeURIComponent(url.pathname)));

    // Nunca servir fuera de dist/, aunque la URL traiga "../".
    if (!filePath.startsWith(DIST_DIR)) {
      filePath = join(DIST_DIR, 'index.html');
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
      if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      filePath = join(DIST_DIR, 'index.html');
    }

    const body = await readFile(filePath);
    const contentType = MIME[extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch (error) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => console.log(`Admin sirviendo dist/ en http://localhost:${PORT}`));
