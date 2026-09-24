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
