/**
 * Production settings are read at runtime, so one build works on any host.
 * The SSR server (src/server.ts) sets them from its environment variables:
 *   API_URL            public API base, e.g. https://dopeshope-api.onrender.com/api
 *   API_URL_INTERNAL   optional faster URL the server itself uses to reach the API
 */
const runtime: { apiUrl?: string; apiUrlInternal?: string } = (globalThis as any).__APP_CONFIG__ ?? {};
const isServer = typeof window === 'undefined';

export const environment = {
  production: true,
  apiUrl: (isServer && runtime.apiUrlInternal) || runtime.apiUrl || 'http://localhost:4000/api',
};
