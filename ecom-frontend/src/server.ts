// Must stay the first import: sets API URLs before the app's environment is read
import { runtimeConfigScript } from './runtime-config';
import { APP_BASE_HREF } from '@angular/common';
import compression from 'compression';
import { readFileSync } from 'node:fs';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AppServerModule from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');
const csrIndexHtml = join(browserDistFolder, 'index.csr.html');
const injectConfig = (html: string) => html.replace('<head>', `<head>${runtimeConfigScript}`);
let csrHtml: string | undefined;

/**
 * Only public catalogue pages are rendered on the server (for search engines and link previews).
 * Account, bag, checkout and admin pages depend on the logged-in user, so they render in the browser.
 */
const SSR_ROUTES = [
  /^\/$/,
  /^\/home\/?$/,
  /^\/shop\/?$/,
  /^\/product-detail\/[a-f0-9]{24}\/?$/i,
  /^\/(about|contact|shipping-policy|returns-policy|privacy-policy|terms)\/?$/,
];
const shouldRenderOnServer = (path: string) => SSR_ROUTES.some((pattern) => pattern.test(path));

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());
// Hostnames allowed to be server-rendered, e.g. NG_ALLOWED_HOSTS="shop.example.com,www.shop.example.com"
const allowedHosts = (process.env['NG_ALLOWED_HOSTS'] || 'localhost,127.0.0.1')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);
const commonEngine = new CommonEngine({ allowedHosts });

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    // Let HTML fall through to the renderer so it gets the runtime config
    index: false,
    // Hashed bundles can be cached forever; /assets keep their names, so revalidate daily
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${join('browser', 'assets')}`)) res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers, path } = req;

  if (!shouldRenderOnServer(path)) {
    csrHtml ??= injectConfig(readFileSync(csrIndexHtml, 'utf8'));
    res.type('html').send(csrHtml);
    return;
  }

  commonEngine
    .render({
      bootstrap: AppServerModule,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(injectConfig(html)))
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  // 4000 is the API; serve the storefront on 4200 by default
  const port = process.env['PORT'] || 4200;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
