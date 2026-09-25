# End-to-end walkthroughs

Drives real Chrome through the shopper and admin flows against a **throwaway** stack:
an in-memory MongoDB, the API on :4101 and the production storefront build (SSR) on :4300.
Your real database is never touched.

```bash
cd ecom-frontend && npm run build   # once, or after frontend changes
cd ../e2e && npm install
npm test            # both suites
npm run test:shop   # or just one
```

Uses your installed Chrome. Set `CHROME_PATH` if it isn't at the default macOS location.
Screenshots of each step land in `e2e/screenshots/`.

## Responsive check

```bash
npm run test:responsive            # every page at 320–1280px
node responsive.js 360,768         # or chosen widths
```

Loads each storefront, account and admin page on a throwaway stack, fails if anything makes the page scroll
sideways (and names the element), and saves full-page screenshots to `e2e/screenshots/responsive/`.
