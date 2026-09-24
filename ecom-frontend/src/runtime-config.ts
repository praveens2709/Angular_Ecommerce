/**
 * Loaded first by the SSR server, before the app code reads `environment`.
 * Values come from the host's environment variables (see DEPLOYMENT.md).
 */
const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const runtimeConfig = {
  apiUrl: trimSlash(process.env['API_URL'] || 'http://localhost:4000/api'),
  apiUrlInternal: process.env['API_URL_INTERNAL'] ? trimSlash(process.env['API_URL_INTERNAL']) : undefined,
};

(globalThis as any).__APP_CONFIG__ = runtimeConfig;

/** Script tag that gives the browser the same config before the app boots */
export const runtimeConfigScript = `<script>window.__APP_CONFIG__=${JSON.stringify({ apiUrl: runtimeConfig.apiUrl }).replace(/</g, '\\u003c')};</script>`;
