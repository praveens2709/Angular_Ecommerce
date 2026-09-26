const path = require('path');

/** Admin journey: login guard → dashboard → products (upload + stock) → orders lifecycle → users → coupons → messages */
module.exports = async (s, { data }) => {
  const { ids, userToken } = data;
  const page = () => s.page;
  const images = path.join(__dirname, '../ecom-frontend/src/assets/images');

  const address = (await s.call('GET', '/addresses', null, userToken)).body[0];
  const [order] = (await s.call('POST', '/orders', { addressId: address._id, paymentMethod: 'COD', items: [{ productId: ids.white, size: 'M', quantity: 1 }] }, userToken)).body;
  await s.call('POST', '/store/contact', { name: 'Asha', email: 'asha@example.com', subject: 'Order help', message: 'Where is my parcel?' });

  await s.go('/admin/dashboard', 1200);
  s.check('admin pages need login', page().url().includes('/admin/auth'));
  s.check('admin sign-up closed', (await s.call('POST', '/auth/admin/register', { name: 'X', email: 'x@test.com', password: 'secret1' })).status === 403);
  await page().type('input[formcontrolname=email]', 'admin@test.com');
  await page().type('input[formcontrolname=password]', 'admin123');
  await s.sleep(300);
  await page().click('button[type=submit]');
  await s.sleep(1800);
  const adminToken = await page().evaluate(() => localStorage.getItem('adminAuthToken'));
  await s.newTab();
  await page().goto(`${s.web}/home`);
  await page().evaluate((t) => localStorage.setItem('adminAuthToken', t), adminToken);

  await s.go('/admin/dashboard', 2500);
  const dash = await s.text();
  s.check('dashboard revenue and charts', dash.includes('₹499') && (await page().$$eval('p-chart canvas', (e) => e.length)) === 2);
  await s.shot('admin-dashboard');

  await s.go('/admin/products', 1800);
  s.check('products listed', (await s.text()).includes('4 products'));
  await s.click('button', 'Add product');
  await s.sleep(800);
  await page().type('#name', 'Graphic Tee');
  await page().select('#category', 'T-Shirts');
  await page().evaluate(() => { const p = document.querySelector('#price'); p.value = ''; p.dispatchEvent(new Event('input')); });
  await page().type('#price', '799');
  await page().type('#color', 'Red');
  await page().type('#description', 'Bold graphic print on soft cotton.');
  for (const [size, qty] of [['S', '4'], ['M', '6'], ['L', '1']]) {
    await page().evaluate((id) => { const i = document.getElementById(id); i.value = ''; i.dispatchEvent(new Event('input')); }, `stock-${size}`);
    await page().type(`#stock-${size}`, qty);
  }
  await (await page().$('#image')).uploadFile(path.join(images, 'product6.png'));
  await s.sleep(2000);
  s.check('image uploads as WebP', (await page().$eval('.image-preview img', (i) => i.src)).endsWith('.webp'));
  await s.click('button[type=submit]', 'Save Product');
  await s.sleep(1800);
  const created = (await s.call('GET', '/products?q=graphic')).body[0];
  s.check('product saved with stock', created?.stock?.M === 6 && created.inventoryStatus === 'INSTOCK');

  await s.go('/admin/orders', 1800);
  await s.click('button', 'Mark as shipped');
  await s.sleep(500);
  await s.click('.p-dialog button', 'Yes');
  await s.sleep(1500);
  await s.click('button', 'Mark as delivered');
  await s.sleep(500);
  await s.click('.p-dialog button', 'Yes');
  await s.sleep(1500);
  s.check('order delivered', (await s.call('GET', `/orders/order/${order._id}`, null, userToken)).body.status === 'Delivered');
  await s.call('POST', `/orders/${order._id}/return`, { type: 'Exchange', reason: 'Too small', exchangeSize: 'L' }, userToken);
  await s.go('/admin/orders', 1800);
  await s.click('.status-tab', 'Return Requested');
  await s.sleep(1200);
  await s.click('button', 'View details');
  await s.sleep(800);
  s.check('order panel opens', await page().$eval('.order-drawer', (e) => e.classList.contains('open')));
  await s.click('.order-drawer button', 'Approve exchange');
  await s.sleep(500);
  await page().evaluate(() => [...document.querySelectorAll('.p-dialog button')].filter((b) => b.textContent.trim() === 'Yes').pop().click());
  await s.sleep(1800);
  const mine = (await s.call('GET', '/orders/my', null, userToken)).body;
  s.check('exchange creates a free replacement', mine.some((o) => o.products[0].size === 'L' && o.totalAmount === 0));

  await s.go('/admin/users', 1500);
  await s.click('button', 'Disable');
  await s.sleep(1200);
  s.check('disabled user blocked', (await s.call('POST', '/auth/user/login', { email: 'user@test.com', password: 'user123' })).status === 403);
  await s.click('button', 'Enable');
  await s.sleep(1000);

  await s.go('/admin/coupons', 1500);
  await s.click('button', 'Add coupon');
  await s.sleep(700);
  await page().type('#code', 'summer25');
  await page().select('#type', 'FLAT');
  await page().evaluate(() => { const v = document.getElementById('value'); v.value = ''; v.dispatchEvent(new Event('input')); });
  await page().type('#value', '250');
  await s.sleep(300);
  await s.click('.p-dialog button[type=submit]');
  await s.sleep(1500);
  s.check('coupon created', (await s.text()).includes('SUMMER25'));

  await s.go('/admin/messages', 1500);
  s.check('contact message in inbox', (await s.text()).includes('Where is my parcel?'));
  await s.click('.msg-head');
  await s.sleep(400);
  await s.click('button', 'Mark resolved');
  await s.sleep(1200);
  s.check('message resolved', (await s.call('GET', '/store/messages', null, adminToken)).body.unread === 0);

  await s.click('button[title=Logout]');
  await s.sleep(1200);
  s.check('admin logout', page().url().includes('/admin/auth'));
};
