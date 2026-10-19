#!/usr/bin/env node
// Zero-dependency static server for dist/, mounted at basePath like GitHub Pages.
// Usage: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const { basePath } = JSON.parse(await readFile(join(ROOT, 'site.config.json'), 'utf8'));
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

async function resolve(path) {
  const file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) return null;
  const s = await stat(file).catch(() => null);
  if (s?.isFile()) return file;
  if (s?.isDirectory()) return resolve(join(path, 'index.html'));
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/') { res.writeHead(302, { Location: basePath }).end(); return; }
  if (!pathname.startsWith(basePath)) { res.writeHead(404).end('Not under basePath'); return; }
  const rel = decodeURIComponent(pathname.slice(basePath.length));
  // Mirror GitHub Pages: /dir → /dir/ redirect, then index.html.
  const s = await stat(join(DIST, rel)).catch(() => null);
  if (s?.isDirectory() && !pathname.endsWith('/')) { res.writeHead(301, { Location: pathname + '/' }).end(); return; }
  const file = await resolve(rel);
  const status = file ? 200 : 404;
  const target = file || join(DIST, '404.html');
  try {
    const body = await readFile(target);
    res.writeHead(status, { 'Content-Type': TYPES[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
  console.log(status, pathname);
}).listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}${basePath}`));
