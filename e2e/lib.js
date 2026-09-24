const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Small harness: named checks, console-error capture, fresh tabs, screenshots */
const createSession = async ({ web, api }) => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1440, height: 900 } });
  const results = [];
  const errors = [];
  let page;

  const hook = (p) => {
    p.on('console', (m) => m.type() === 'error' && errors.push(`[${p.url().replace(web, '')}] ${m.text().slice(0, 220)}`));
    p.on('pageerror', (e) => errors.push(`[${p.url().replace(web, '')}] ${e.message.slice(0, 220)}`));
  };

  const s = {
    get page() {
      return page;
    },
    web,
    api,
    sleep,
    check: (name, ok, detail = '') => results.push({ name, ok: !!ok, detail }),
    // Chrome's password-save UI swallows mouse input in the tab that submitted a login form
    newTab: async () => {
      const old = page;
      page = await browser.newPage();
      hook(page);
      if (old) await old.close();
      return page;
    },
    go: async (path, wait = 1500) => {
      await page.goto(web + path, { waitUntil: 'networkidle0' });
      await sleep(wait);
    },
    shot: (name) => {
      fs.mkdirSync(`${__dirname}/screenshots`, { recursive: true });
      return page.screenshot({ path: `${__dirname}/screenshots/${name}.png` });
    },
    text: () => page.evaluate(() => document.body.innerText),
    click: (selector, text) =>
      page.evaluate(
        (sel, t) => {
          const el = [...document.querySelectorAll(sel)].find((e) => !t || e.textContent.trim().includes(t) || e.title === t);
          if (!el) throw new Error(`not found: ${sel} ${t || ''}`);
          el.click();
        },
        selector,
        text
      ),
    call: async (method, path, body, token) => {
      const res = await fetch(api + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    close: () => browser.close(),
    results,
    errors,
  };
  await s.newTab();
  return s;
};

module.exports = { createSession, sleep };
