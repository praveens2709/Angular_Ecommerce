/**
 * Starts a throwaway stack (in-memory MongoDB + API + SSR storefront), seeds it, runs the walkthroughs.
 * Usage: node run.js [shop|admin]
 * E2E_STATIC=1 tests the Cloudflare Pages build instead: after seeding, it runs `npm run build:cloudflare`
 * against the throwaway API and serves the result with `wrangler pages dev` (routing, headers, functions).
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createSession, sleep } = require('./lib');
const seed = require('./seed');

const API_PORT = Number(process.env.E2E_API_PORT || 4101);
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 4310);
const API = `http://localhost:${API_PORT}/api`;
const WEB = `http://localhost:${WEB_PORT}`;
const ROOT = path.join(__dirname, '..');
const SSR_ENTRY = path.join(ROOT, 'ecom-frontend/dist/ecom/server/server.mjs');

const suites = { shop: require('./shop.spec'), admin: require('./admin.spec') };

const start = (name, cmd, args, env, logs, cwd) => {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => logs.push(d.toString()));
  child.stderr.on('data', (d) => logs.push(d.toString()));
  child.on('exit', (code) => code && code !== 143 && console.error(`${name} exited with ${code}\n${logs.join('').slice(-2000)}`));
  return child;
};

const waitFor = async (url, label) => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`${label} did not start (${url})`);
};

(async () => {
  const isStatic = !!process.env.E2E_STATIC;
  if (!isStatic && !fs.existsSync(SSR_ENTRY)) {
    console.error('Build the storefront first: cd ecom-frontend && npm run build');
    process.exit(1);
  }
  const selected = process.argv[2] ? [process.argv[2]] : Object.keys(suites);
  const mongo = await MongoMemoryServer.create();
  const apiLogs = [];
  const webLogs = [];
  const children = [];
  let failed = 0;

  try {
    const mongoUri = mongo.getUri('e2e');
    children.push(
      start('API', 'node', [path.join(ROOT, 'ecom-backend/server.js')], {
        PORT: API_PORT,
        MONGODB_URI: mongoUri,
        JWT_SECRET: 'e2e-secret',
        NODE_ENV: 'development',
        SMTP_HOST: '',
        CLOUDINARY_URL: '',
        PUBLIC_URL: `http://localhost:${API_PORT}`,
        CLIENT_URL: WEB,
        AUTH_RATE_LIMIT_MAX: 1000,
        PINCODE_LOOKUP: 'off',
        STORE_EMAIL: 'support@example.com',
        STORE_STATE: 'Delhi',
        STORE_PINCODE: '110001',
      }, apiLogs)
    );
    if (!isStatic) children.push(start('Storefront', 'node', [SSR_ENTRY], { PORT: WEB_PORT, API_URL: API }, webLogs));
    await waitFor(`${API}/health`, 'API');
    if (!isStatic) await waitFor(`${WEB}/home`, 'Storefront');
    let staticReady = false;

    for (const name of selected) {
      const data = await seed(API, mongoUri);
      if (isStatic && !staticReady) {
        // Pre-render from the seeded catalogue, then serve like Cloudflare Pages
        const frontend = path.join(ROOT, 'ecom-frontend');
        const build = require('child_process').spawnSync('node', ['scripts/build-cloudflare.mjs'], {
          cwd: frontend, env: { ...process.env, API_URL: API }, encoding: 'utf8',
        });
        if (build.status !== 0) throw new Error(`Static build failed:\n${(build.stdout + build.stderr).slice(-2000)}`);
        children.push(start('Static site', 'npx', ['wrangler@4', 'pages', 'dev', 'dist/ecom/browser', '--port', String(WEB_PORT), '--ip', '127.0.0.1'], {}, webLogs, frontend));
        await waitFor(`${WEB}/`, 'Static site');
        staticReady = true;
      }
      const session = await createSession({ web: WEB, api: API });
      const started = Date.now();
      try {
        await suites[name](session, { data, apiLogs });
      } catch (error) {
        session.check(`suite aborted: ${error.message}`, false);
      } finally {
        await session.close();
      }
      console.log(`\n${name} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
      for (const r of session.results) {
        console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ''}`);
        if (!r.ok) failed++;
      }
      if (session.errors.length) {
        failed += session.errors.length;
        console.log('  console errors:\n    ' + session.errors.join('\n    '));
      }
    }
  } finally {
    children.forEach((c) => c.kill());
    await mongo.stop();
  }
  console.log(failed ? `\n${failed} problem(s)` : '\nAll walkthroughs passed');
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
