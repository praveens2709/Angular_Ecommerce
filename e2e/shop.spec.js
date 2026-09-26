/** Shopper journey: browse → product → bag → coupon → checkout → orders → invoice → help pages → password reset */
module.exports = async (s, { data, apiLogs }) => {
  const { ids } = data;
  const page = () => s.page;
  const token = () => page().evaluate(() => localStorage.getItem('userAuthToken'));
  const authed = async (path) => (await s.call('GET', path, null, await token())).body;

  // --- guest ---
  await s.go('/home', 2500);
  const home = (await s.text()).toLowerCase();
  s.check('home shows categories, arrivals and deal', home.includes('shop by category') && home.includes('new arrivals') && home.includes('deal of the day'));
  s.check('site footer with policy links', home.includes('privacy policy') && home.includes('returns & refunds'));
  await s.click('app-search-bar .icon-btn');
  await s.sleep(300);
  await page().type('app-search-bar input', 'tee');
  await s.sleep(1200);
  const suggestions = await page().$$eval('app-search-bar li[role=option]', (els) => els.length);
  s.check('search suggestions', suggestions === 3, String(suggestions));
  await page().keyboard.press('Enter');
  await s.sleep(2000);
  s.check('search opens the shop filtered', page().url().endsWith('/shop?q=tee') && (await s.text()).includes('of 3 results'));

  for (const [path, heading] of [['/about', 'About Us'], ['/shipping-policy', 'Shipping Policy'], ['/returns-policy', 'Returns'], ['/privacy-policy', 'Privacy Policy'], ['/terms', 'Terms & Conditions']]) {
    await s.go(path, 800);
    s.check(`${path} renders`, (await page().$eval('h1', (h) => h.textContent)).includes(heading));
  }

  await s.go('/contact', 1000);
  await page().type('#c-name', 'Asha');
  await page().type('#c-email', 'asha@example.com');
  await page().type('#c-message', 'Do you ship to Jaipur?');
  await s.sleep(300);
  await s.click('.send-btn');
  await s.sleep(1500);
  s.check('contact form sends', (await s.text()).includes("we've got your message"));

  await s.go('/cart', 1200);
  s.check('guests are sent to login from the bag', page().url().includes('/public/auth'));

  // --- login (then a fresh tab) ---
  await page().type('input[formcontrolname=email]', 'user@test.com');
  await page().type('input[formcontrolname=password]', 'user123');
  await s.sleep(300);
  await page().click('button[type=submit]');
  await s.sleep(1800);
  await s.newTab();

  // --- product page ---
  await s.go(`/product-detail/${ids.white}`, 2500);
  s.check('product title', (await page().title()) === 'Classic Tee (White) | DopeShope', await page().title());
  s.check('gallery thumbnails', (await page().$$eval('.left-images .more-imgs', (e) => e.length)) === 3);
  const sizes = await page().$$eval('.size-box', (els) => els.filter((e) => e.disabled).map((e) => e.textContent.trim()));
  s.check('sold-out sizes disabled', sizes.join(',') === 'XS,XXL', sizes.join(','));
  await s.click('.bag-btn', 'ADD TO BAG');
  await s.sleep(600);
  s.check('size is required', (await s.text()).includes('Please select a size'));
  await s.click('.size-box', 'M');
  await s.click('.bag-btn', 'ADD TO BAG');
  await s.sleep(1500);
  s.check('added to bag', (await s.text()).includes('GO TO BAG'));
  s.check('bag drawer opens', await page().$eval('.bag-drawer-root', (e) => e.classList.contains('open')));
  await s.click('.bd-close');
  await s.sleep(400);
  await s.click('.wish-toggle');
  await s.sleep(1000);
  s.check('wishlist saved', (await authed('/wishlist'))?.length === 1);

  await s.click('.pincode-check');
  await s.sleep(800);
  await page().type('.pincode-input', '560001');
  await s.click('.pincode-form button');
  await s.sleep(1200);
  s.check('pincode check shows a delivery date', (await s.text()).includes('Get it by'));

  await page().evaluate(() => (window.__mark = 1));
  await page().evaluate(() => document.querySelectorAll('.color-imgs')[1].click());
  await s.sleep(1200);
  s.check('colour switch without reload', (await page().evaluate(() => window.__mark === 1)) && page().url().endsWith(ids.black));

  await s.click('.review-btn');
  await s.sleep(500);
  const stars = await page().$$('p-rating .p-rating-option');
  if (stars[3]) await stars[3].click();
  await page().type('.review-form textarea', 'Great fit, soft fabric.');
  await s.sleep(300);
  await s.click('.review-form button[type=submit]');
  await s.sleep(1800);
  s.check('review posted', (await s.text()).includes('Great fit, soft fabric.'));

  // --- bag, coupon, checkout ---
  await s.go('/cart', 1800);
  await s.click('button', 'Qty:');
  await s.sleep(600);
  s.check('quantity limited to stock', (await page().$$eval('.size-btn', (e) => e.length)) === 8);
  await s.click('.size-btn', '2');
  await s.click('button', 'Done');
  await s.sleep(1500);
  await page().click('.coupon-input');
  await page().keyboard.type('welcome10');
  await s.sleep(400);
  await s.click('.apply-btn');
  await s.sleep(1500);
  const summary = await page().evaluate(() => document.querySelector('.cart-right').innerText);
  s.check('coupon applied', summary.includes('WELCOME10') && summary.includes('₹898.00'));
  await s.shot('shop-bag');
  await s.click('.cart-right button', 'Place Order');
  await s.sleep(1500);
  await s.click('.cart-right button', 'Continue');
  await s.sleep(1500);
  await s.click('.payment-option', 'Cash on Delivery');
  await s.sleep(300);
  const code = await page().evaluate(() => document.querySelector('.captcha-box div').textContent.replace(/\s/g, ''));
  await page().type('.input-box input', code);
  await s.sleep(500);
  await s.click('.payment-right button', 'PLACE ORDER');
  await s.sleep(2500);
  s.check('order placed', page().url().endsWith('/order-success'));
  s.check('success page lists the order', (await s.text()).includes('Order placed!') && (await s.text()).includes('₹898'));
  await s.shot('shop-success');
  const [order] = await authed('/orders/my');
  s.check('server-side total with coupon', order?.totalAmount === 898 && order?.couponCode === 'WELCOME10', `${order?.totalAmount}`);
  s.check('stock reserved', (await s.call('GET', `/products/${ids.white}`)).body.stock.M === 6);

  const invoice = await fetch(`${s.api}/orders/${order._id}/invoice`, { headers: { Authorization: `Bearer ${await token()}` } });
  s.check('invoice PDF downloads', invoice.status === 200 && invoice.headers.get('content-type') === 'application/pdf');

  await s.go(`/account/order-details/${order._id}`, 1800);
  s.check('tracking timeline', (await page().$$eval('.timeline-step', (e) => e.length)) === 3);
  s.check('invoice button shown', (await s.text()).includes('Download invoice'));
  await s.shot('shop-order');
  await s.click('.cancel-order-btn', 'Cancel Order');
  await s.sleep(500);
  await s.click('.common-confirm-btn');
  await s.sleep(1500);
  s.check('cancel restores stock', (await s.call('GET', `/products/${ids.white}`)).body.stock.M === 8);

  await s.go('/account/wishlist', 1500);
  s.check('wishlist page', (await s.text()).includes('Classic Tee'));

  // Switching account tabs must never flash signed-out or empty-state placeholders,
  // even on a slow connection (each request delayed 400ms here)
  const cdp = await page().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: -1, uploadThroughput: -1 });
  await page().evaluate(() => {
    const bad = ['Sign In', 'Sign in to', "haven’t placed", "haven't placed", 'Save your address', 'Save your credit', 'Guest'];
    window.__flashes = [];
    window.__seen = new Set();
    new MutationObserver(() => {
      const text = document.querySelector('app-account')?.innerText || '';
      for (const b of bad) if (text.includes(b) && !window.__flashes.includes(b)) window.__flashes.push(b);
      // Positive control: the observer must also see the real content, or the check proves nothing
      for (const good of ['Saved Addresses', 'Your orders', 'Profile Details']) if (text.includes(good)) window.__seen.add(good);
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  for (let round = 0; round < 2; round++) {
    for (const label of ['Overview', 'Orders & Returns', 'Wishlist', 'Profile', 'Addresses', 'Saved Cards']) {
      await s.click('.acc-nav a', label);
      await s.sleep(round === 0 ? 900 : 150);
    }
  }
  const { flashes, seen } = await page().evaluate(() => ({ flashes: window.__flashes, seen: [...window.__seen] }));
  s.check('tab-switch observer saw real content', seen.length === 3, seen.join(', '));
  s.check('account tabs switch without placeholder flashes', flashes.length === 0, flashes.join(', '));
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  // --- password reset ---
  await s.go('/account/overview', 1200);
  await s.click('.acc-nav .logout');
  await s.sleep(500);
  await s.click('.common-confirm-btn');
  await s.sleep(1200);
  await s.newTab();
  await s.go('/public/auth', 1200);
  await s.click('a', 'Forgot password?');
  await s.sleep(500);
  const logStart = apiLogs.join('').length;
  await page().type('input[formcontrolname=email]', 'user@test.com');
  await s.sleep(400);
  await s.click('button[type=submit]');
  await s.sleep(1500);
  s.check('reset link requested', (await s.text()).includes('reset link is on its way'));
  const resetToken = [...apiLogs.join('').slice(logStart).matchAll(/token=([a-f0-9]{64})/g)].pop()?.[1];
  s.check('reset email sent', !!resetToken);
  await s.go(`/public/reset-password?token=${resetToken}`, 1200);
  await page().type('input[formcontrolname=password]', 'newpass1');
  await page().type('input[formcontrolname=confirm]', 'newpass1');
  await s.sleep(400);
  await s.click('button[type=submit]');
  await s.sleep(1800);
  const login = await s.call('POST', '/auth/user/login', { email: 'user@test.com', password: 'newpass1' });
  s.check('new password works', login.status === 200);
};
