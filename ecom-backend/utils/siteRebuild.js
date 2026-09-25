/**
 * The storefront on Cloudflare Pages is pre-rendered at build time, so catalogue changes need a
 * rebuild to show up in those pages. Admin changes to products/categories call this; a burst of
 * edits within the delay triggers a single rebuild.
 *
 *   SITE_REBUILD_HOOK_URL   Cloudflare Pages deploy hook (Settings > Builds > Deploy hooks)
 *   SITE_REBUILD_DELAY_MS   wait after the last change before rebuilding (default 90 s)
 */
let timer = null;
let reasons = [];

exports.scheduleSiteRebuild = (reason) => {
  const hook = process.env.SITE_REBUILD_HOOK_URL;
  if (!hook) return false;
  const delay = Number(process.env.SITE_REBUILD_DELAY_MS ?? 90000);

  reasons.push(reason);
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const summary = reasons.join(', ');
    reasons = [];
    timer = null;
    try {
      const res = await fetch(hook, { method: "POST", signal: AbortSignal.timeout(15000) });
      console.log(`Storefront rebuild requested (${summary}): HTTP ${res.status}`);
    } catch (error) {
      console.error(`Storefront rebuild request failed (${summary}): ${error.message}`);
    }
  }, delay);
  // Don't keep the process (or a test run) alive just for this
  timer.unref?.();
  return true;
};
