const { MongoClient } = require('mongodb');

/** Fresh data for each suite: wipes the throwaway DB, then creates it through the API */
module.exports = async (api, mongoUri) => {
  const client = await MongoClient.connect(mongoUri);
  await client.db().dropDatabase();
  await client.close();

  const call = async (method, path, body, token) => {
    const res = await fetch(api + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`seed ${method} ${path}: ${res.status} ${JSON.stringify(json)}`);
    return json;
  };

  const admin = (await call('POST', '/auth/admin/register', { name: 'Admin', email: 'admin@test.com', password: 'admin123' })).token;
  const user = (await call('POST', '/auth/user/register', { firstName: 'Test', lastName: 'User', email: 'user@test.com', password: 'user123', mobile: '9876543210', gender: 'Male' })).token;
  for (const name of ['T-Shirts', 'Jeans']) await call('POST', '/categories', { name, status: 'ACTIVE' }, admin);

  const product = (name, color, image, price, stock, extra = {}) =>
    call('POST', '/products', {
      name, color, image, price, stock,
      category: extra.category || 'T-Shirts',
      description: `A soft ${color.toLowerCase()} ${name.toLowerCase()} for everyday wear.`,
      brand: 'DopeShope',
      seller: 'dopeshope pvt. ltd.',
      ...extra,
    }, admin);

  const white = await product('Classic Tee', 'White', 'assets/images/product2.png', 499, { XS: 0, S: 2, M: 8, L: 8, XL: 3, XXL: 0 }, { images: ['assets/images/product.png', 'assets/images/product3.png'] });
  const black = await product('Classic Tee', 'Black', 'assets/images/product3.png', 499, { XS: 4, S: 4, M: 1, L: 6, XL: 6, XXL: 2 });
  const orange = await product('Classic Tee', 'Orange', 'assets/images/product.png', 499, { XS: 0, S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
  const jeans = await product('Relaxed Jeans', 'Blue', 'assets/images/product5.png', 1999, { S: 5, M: 5, L: 5 }, { category: 'Jeans' });

  await call('POST', '/coupons', { code: 'WELCOME10', type: 'PERCENT', value: 10, minOrder: 500, maxDiscount: 200, description: '10% off your first order' }, admin);
  await call('POST', '/coupons', { code: 'FLAT150', type: 'FLAT', value: 150, minOrder: 1500 }, admin);
  await call('POST', '/addresses', { fullName: 'Test User', street: '12 Main Road', city: 'New Delhi', state: 'Delhi', postalCode: '110001', mobile: '9876543210', type: 'Home' }, user);

  return { adminToken: admin, userToken: user, ids: { white: white._id, black: black._id, orange: orange._id, jeans: jeans._id } };
};
