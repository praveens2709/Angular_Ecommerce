/**
 * Responsive audit: loads every page at phone, tablet and laptop widths on a throwaway stack,
 * reports anything wider than the screen (the cause of sideways scrolling) and saves screenshots.
 * Usage: node responsive.js [width,width,...]   e.g. node responsive.js 360,390
 * Needs a prior `cd ecom-frontend && npm run build`.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seed = require('./seed');

const API_PORT = 4102;
const WEB_PORT = 4311;
const API = `http://localhost:${API_PORT}/api`;
const WEB = `http://localhost:${WEB_PORT}`;
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots', 'responsive');
const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const WIDTHS = (process.argv[2] || '320,360,390,430,768,1024,1280').split(',').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const start = (cmd, args, env) => spawn(cmd, args, { env: { ...process.env, ...env }, stdio: 'ignore' });
const waitFor = async (url) => {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`${url} did not start`);
};
const call = async (method, p, body, token) => {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => null);
};

/** Elements poking out of the viewport that aren't clipped by a scrolling/hidden ancestor */
const findOverflow = () => {
  const vw = document.documentElement.clientWidth;
  const clipped = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox !== 'visible') {
        const r = a.getBoundingClientRect();
        if (r.right <= vw + 1 && r.left >= -1) return true;
      }
    }
    return false;
  };
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const host = el.closest('[_nghost-ng-c0], [ng-version]') ? '' : '';
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}${host}`;
  };
  const inFixedLayer = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') return true;
    return false;
  };
  const bad = [];
  for (const el of document.body.querySelectorAll('*')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    // Fixed layers (drawers, bars) can't cause sideways page scrolling
    if (inFixedLayer(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Far off-screen on purpose (e.g. the contact form's spam trap)
    if (r.right < -1000) continue;
    if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) bad.push({ el, r });
  }
  // Report only the outermost offenders
  const top = bad.filter((b) => !bad.some((o) => o.el !== b.el && o.el.contains(b.el)));
  return {
    scrollWidth: document.documentElement.scrollWidth,
    vw,
    offenders: top.slice(0, 6).map((b) => `${describe(b.el)} [${Math.round(b.r.left)}→${Math.round(b.r.right)}]`),
  };
};

(async () => {
  const frontendEntry = path.join(ROOT, 'ecom-frontend/dist/ecom/server/server.mjs');
  if (!fs.existsSync(frontendEntry)) throw new Error('Build the storefront first: cd ecom-frontend && npm run build');
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('responsive');
  const children = [
    start('node', [path.join(ROOT, 'ecom-backend/server.js')], {
      PORT: API_PORT, MONGODB_URI: uri, JWT_SECRET: 'responsive-secret', NODE_ENV: 'development', SMTP_HOST: '', CLOUDINARY_URL: '',
      PUBLIC_URL: `http://localhost:${API_PORT}`, CLIENT_URL: WEB, AUTH_RATE_LIMIT_MAX: 1000, PINCODE_LOOKUP: 'off',
      STORE_EMAIL: 'support@example.com', STORE_PHONE: '9876543210', STORE_ADDRESS: '12, Long Street Name, Area', STORE_CITY: 'Jodhpur',
      STORE_STATE: 'Rajasthan', STORE_PINCODE: '342005', STORE_LEGAL_NAME: 'DopeShope',
    }),
    start('node', [frontendEntry], { PORT: WEB_PORT, API_URL: API }),
  ];
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const problems = [];
  try {
    await waitFor(`${API}/health`);
    await waitFor(`${WEB}/home`);
    const data = await seed(API, uri);
    const { userToken, adminToken, ids } = data;

    // Something in the bag, an order, a saved card and a review, so those pages have content
    await call('POST', '/cart', { _id: ids.white, size: 'M' }, userToken);
    await call('POST', '/cart', { _id: ids.jeans, size: 'M' }, userToken);
    const [address] = await call('GET', '/addresses', null, userToken);
    const [order] = await call('POST', '/orders', { addressId: address._id, paymentMethod: 'COD', items: [{ productId: ids.black, size: 'L', quantity: 1 }] }, userToken);
    await call('POST', '/cards', { cardHolderName: 'Test User', cardNumber: '4111111111111111', expiryMonth: '12', expiryYear: '30', cardType: 'VISA' }, userToken);
    await call('POST', `/wishlist/${ids.black}`, {}, userToken);
    // Empty states: a shopper with nothing saved, and one with a bag item but no address yet
    const register = async (email) =>
      (await call('POST', '/auth/user/register', { firstName: 'New', lastName: 'Shopper', email, password: 'user123', mobile: '9876500000', gender: 'Female' })).token;
    const blankToken = await register('blank@test.com');
    const noAddressToken = await register('noaddress@test.com');
    await call('POST', '/cart', { _id: ids.white, size: 'M' }, noAddressToken);
    await call('POST', '/store/contact', { name: 'A Customer', email: 'a@example.com', subject: 'Sizing question', message: 'Does the tee run small or true to size?' });

    const pages = [
      ['home', '/home'], ['shop', '/shop'], ['product', `/product-detail/${ids.white}`], ['product-jeans', `/product-detail/${ids.jeans}`],
      ['about', '/about'], ['contact', '/contact'], ['shipping', '/shipping-policy'], ['returns', '/returns-policy'],
      ['privacy', '/privacy-policy'], ['terms', '/terms'], ['login', '/public/auth'], ['reset', '/public/reset-password?token=abc'],
      ['cart', '/cart', 'user'], ['address', '/address', 'user'], ['payment', 'payment', 'user'],
      ['acc-overview', '/account/overview', 'user'], ['acc-orders', '/account/orders', 'user'], ['acc-order', `/account/order-details/${order._id}`, 'user'],
      ['acc-wishlist', '/account/wishlist', 'user'], ['acc-profile', '/account/profile', 'user'], ['acc-edit', '/account/profile/edit', 'user'],
      ['acc-addresses', '/account/addresses', 'user'], ['acc-cards', '/account/cards', 'user'], ['acc-delete', '/account/delete', 'user'],
      ['empty-cart', '/cart', 'blank'], ['empty-address', '/address', 'noaddress'], ['empty-orders', '/account/orders', 'blank'],
      ['empty-wishlist', '/account/wishlist', 'blank'], ['empty-addresses', '/account/addresses', 'blank'], ['empty-cards', '/account/cards', 'blank'],
      ['admin-login', '/admin/auth'], ['admin-dashboard', '/admin/dashboard', 'admin'], ['admin-products', '/admin/products', 'admin'],
      ['admin-categories', '/admin/categories', 'admin'], ['admin-orders', '/admin/orders', 'admin'], ['admin-users', '/admin/users', 'admin'],
      ['admin-coupons', '/admin/coupons', 'admin'], ['admin-messages', '/admin/messages', 'admin'],
    ];

    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: width < 768 ? 800 : 900, isMobile: width < 768, hasTouch: width < 768, deviceScaleFactor: 1 });
      await page.goto(WEB + '/home');
      // ONLY=name1,name2 limits the run to some pages (handy while fixing one)
      const only = (process.env.ONLY || '').split(',').filter(Boolean);
      for (const [name, url, who] of pages.filter(([n]) => !only.length || only.includes(n))) {
        await page.evaluate(
          (u, a) => {
            localStorage.clear();
            if (u) localStorage.setItem('userAuthToken', u);
            if (a) localStorage.setItem('adminAuthToken', a);
          },
          { user: userToken, blank: blankToken, noaddress: noAddressToken }[who] || null,
          who === 'admin' ? adminToken : null
        );
        if (url === 'payment') {
          // Payment needs an address chosen on the previous step
          await page.goto(WEB + '/address', { waitUntil: 'networkidle0' });
          await sleep(600);
          await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /continue|proceed|place order/i.test(b.textContent))?.click());
        } else {
          await page.goto(WEB + url, { waitUntil: 'networkidle0' });
        }
        // Charts animate in; give the dashboard time to finish drawing
        await sleep(name === 'admin-dashboard' ? 2500 : 900);
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await sleep(500);
        const result = await page.evaluate(findOverflow);
        if (process.env.DEBUG_RADIO && name === 'address') {
          console.log(await page.evaluate(() => { const r = document.querySelector('p-radiobutton, p-radiobutton-button, [class*=radiobutton]'); return r ? r.outerHTML.slice(0, 900) : 'none'; }));
        }
        if (process.env.DEBUG_CHARTS && name === 'admin-dashboard') {
          console.log(width, 'chart canvases:', await page.evaluate(() => [...document.querySelectorAll('p-chart canvas')].map((c) => {
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let inked = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 0) inked++;
            return `${c.width}x${c.height} inked=${inked}`;
          }).join(' | ')));
        }
        // AUDIT_BUTTONS=1 lists every visible, boxed button with its corner radius (design consistency checks)
        if (process.env.AUDIT_BUTTONS) {
          const found = await page.evaluate(() =>
            [...document.querySelectorAll('button, a[class*="btn"], a[role="button"], input[type="submit"], .p-button')]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                const cs = getComputedStyle(el);
                const boxed = parseFloat(cs.borderTopWidth) > 0 || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
                return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && boxed && !el.closest('.ds-admin');
              })
              .map((el) => {
                const cs = getComputedStyle(el);
                const r = el.getBoundingClientRect();
                return {
                  text: (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 32),
                  cls: String(el.className).replace(/ng-\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60),
                  radius: cs.borderTopLeftRadius,
                  size: `${Math.round(r.width)}x${Math.round(r.height)}`,
                };
              })
          );
          (global.__audit ||= []).push(...found.map((f) => ({ page: name, ...f })));
        }
        if (result.scrollWidth > result.vw + 1 || result.offenders.length) {
          problems.push({ width, name, ...result });
        }
        await page.screenshot({ path: path.join(OUT, `${width}-${name}.png`), fullPage: true });
      }
      await page.close();
    }
    if (process.env.AUDIT_BUTTONS) {
      // One line per distinct button (page + text + radius), grouped by radius
      const seen = new Map();
      for (const b of global.__audit || []) seen.set(`${b.radius}|${b.page}|${b.text}|${b.cls}`, b);
      const rows = [...seen.values()].sort((a, b) => a.radius.localeCompare(b.radius) || a.page.localeCompare(b.page));
      console.log('\nBUTTON AUDIT (radius | page | text | classes | size)');
      for (const b of rows) console.log(`${b.radius.padEnd(8)} | ${b.page.padEnd(15)} | ${b.text.padEnd(32)} | ${b.cls} | ${b.size}`);
    }
  } finally {
    await browser.close();
    children.forEach((c) => c.kill());
    await mongo.stop();
  }

  if (!problems.length) console.log(`No horizontal overflow at ${WIDTHS.join(', ')}px. Screenshots: ${OUT}`);
  for (const p of problems) {
    console.log(`${p.width}px ${p.name}: page ${p.scrollWidth}px wide on a ${p.vw}px screen`);
    p.offenders.forEach((o) => console.log(`    ${o}`));
  }
  process.exit(problems.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
