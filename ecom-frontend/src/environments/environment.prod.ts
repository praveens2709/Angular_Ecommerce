/**
 * Production settings are read at runtime, so one build works on any host.
 * The SSR server (src/server.ts) sets them from its environment variables; static builds
 * (Cloudflare Pages) bake API_URL in at build time instead.
 * The SSR server's variables:
 *   API_URL            public API base, e.g. https://dopeshope-api.onrender.com/api
 *   API_URL_INTERNAL   optional faster URL the server itself uses to reach the API
 */
const isServer = typeof window === 'undefined';

/** Set at build time for static hosting (scripts/build-cloudflare.mjs passes --define BUILD_API_URL=...) */
declare const BUILD_API_URL: string | undefined;
const buildApiUrl = typeof BUILD_API_URL !== 'undefined' ? BUILD_API_URL : undefined;

export const environment = {
  production: true,
  /**
   * Read on use, not when this file loads: in the server bundle this module can load before
   * runtime-config.ts has set __APP_CONFIG__, which silently fell back to localhost.
   */
  get apiUrl(): string {
    const runtime: { apiUrl?: string; apiUrlInternal?: string } = (globalThis as any).__APP_CONFIG__ ?? {};
    return (isServer && runtime.apiUrlInternal) || runtime.apiUrl || buildApiUrl || 'http://localhost:4000/api';
  },
};
