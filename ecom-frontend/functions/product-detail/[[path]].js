/**
 * Cloudflare Pages Function for /product-detail/*.
 * Products that existed at build time have a pre-rendered page; a product added since the last
 * build doesn't yet, so serve the single-page app for it (status 200) instead of the 404 page.
 */
export async function onRequest({ request, env }) {
  const page = await env.ASSETS.fetch(request);
  if (page.status !== 404) return page;
  const app = await env.ASSETS.fetch(new URL('/app', request.url));
  return new Response(app.body, { status: 200, headers: app.headers });
}
