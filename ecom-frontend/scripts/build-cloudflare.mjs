/**
 * Static build for Cloudflare Pages: public pages are pre-rendered to HTML at build time,
 * everything else (account, bag, checkout, admin) loads as a normal single-page app.
 *
 *   API_URL=https://dopeshope-api.onrender.com/api node scripts/build-cloudflare.mjs
 *
 * Output: dist/ecom/browser (the folder Cloudflare Pages serves).
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const apiUrl = (process.env.API_URL || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(apiUrl)) {
  console.error('Set API_URL to the public API base, e.g. https://dopeshope-api.onrender.com/api');
  process.exit(1);
}

const OUT = 'dist/ecom/browser';
const STATIC_ROUTES = ['/', '/home', '/shop', '/about', '/contact', '/shipping-policy', '/returns-policy', '/privacy-policy', '/terms'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A free-tier API may be asleep: keep asking for up to ~3 minutes */
async function waitForApi() {
  for (let attempt = 1; attempt <= 36; attempt++) {
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(20000) });
      if (res.ok && (await res.json()).db) return;
    } catch {
      // still waking up
    }
    console.log(`Waiting for the API to wake up (${attempt})...`);
    await sleep(5000);
  }
  throw new Error(`API at ${apiUrl} did not respond`);
}

/** Every product page, following the API's pages of 100 */
async function productRoutes() {
  const ids = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${apiUrl}/products?page=${page}&limit=100`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Listing products failed: ${res.status}`);
    const { items, total } = await res.json();
    ids.push(...items.map((p) => p._id));
    if (!items.length || ids.length >= total) break;
  }
  return ids.map((id) => `/product-detail/${id}`);
}

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

await waitForApi();
const products = await productRoutes();
writeFileSync('prerender-routes.txt', [...STATIC_ROUTES, ...products].join('\n') + '\n');
console.log(`Pre-rendering ${STATIC_ROUTES.length} pages and ${products.length} products from ${apiUrl}`);

run('npx', ['ng', 'build', '--configuration', 'production,cloudflare', '--define', `BUILD_API_URL=${JSON.stringify(apiUrl)}`]);

// Cloudflare serves "/shop" from shop.html directly, but redirects it to "/shop/" when the page is
// shop/index.html. Angular writes the folder form, so flatten each pre-rendered page (except "/").
const flatten = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    flatten(path);
    const page = join(path, 'index.html');
    if (existsSync(page)) {
      renameSync(page, `${path}.html`);
      if (!readdirSync(path).length) rmdirSync(path);
    }
  }
};
flatten(OUT);

// Cloudflare turns <link rel="modulepreload" href="chunk-X.js"> into Early Hints headers, where a
// relative address resolves against the page's path (/product-detail/chunk-X.js), ignoring <base>.
// Make the build's own file references absolute.
const absolutise = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) absolutise(path);
    else if (name.endsWith('.html')) {
      const html = readFileSync(path, 'utf8');
      const fixed = html.replace(/(\s(?:href|src)=")((?:chunk|main|polyfills|styles|scripts)-[A-Za-z0-9]+\.(?:js|css)")/g, '$1/$2');
      if (fixed !== html) writeFileSync(path, fixed);
    }
  }
};
absolutise(OUT);

// Pages that aren't pre-rendered load the plain single-page app, served as /app (a name without
// ".html", which Cloudflare would otherwise redirect away from). A top-level 404.html also stops
// Cloudflare from serving the home page's pre-rendered HTML for every unknown path.
const spa = join(OUT, 'index.csr.html');
if (!existsSync(spa)) throw new Error(`${spa} is missing`);
copyFileSync(spa, join(OUT, 'app.html'));
copyFileSync(spa, join(OUT, '404.html'));

// Signed-in pages render in the browser only (rewrites keep the URL and a 200 status)
writeFileSync(
  join(OUT, '_redirects'),
  ['/account', '/account/*', '/cart', '/address', '/payment', '/wishlist', '/admin', '/admin/*', '/public/*']
    .map((path) => `${path} /app 200`)
    .join('\n') + '\n'
);

// Hashed bundles never change; HTML must always be revalidated so new deploys show up
writeFileSync(
  join(OUT, '_headers'),
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Frame-Options: DENY',
    '/*.js',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/*.css',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/assets/*',
    '  Cache-Control: public, max-age=86400',
  ].join('\n') + '\n'
);
console.log(`Cloudflare Pages build ready in ${OUT}`);
