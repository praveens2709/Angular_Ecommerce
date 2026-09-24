const mongoose = require("mongoose");
const { startDb, stopDb, clearDb, api, registerAdmin, registerUser, auth, createProduct, createAddress } = require("./helpers");
const Product = require("../models/Products");
const Order = require("../models/Order");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const setup = async () => {
  const admin = await registerAdmin();
  const user = await registerUser();
  const product = await createProduct(admin);
  const address = await createAddress(user.token);
  const order = (items, extra = {}) =>
    api().post("/api/orders").set(auth(user.token)).send({ addressId: address._id, items, ...extra });
  return { admin, user, product, address, order };
};

test("order prices come from the database, not the request", async () => {
  const { product, order } = await setup();
  const res = await order([{ productId: product._id, size: "M", quantity: 2, price: 1 }], { totalAmount: 1 });
  expect(res.status).toBe(201);
  expect(res.body[0].totalAmount).toBe(1000);
  expect(res.body[0].products[0].price).toBe(500);
});

test("stock is reserved, blocks overselling, and returns on cancel", async () => {
  const { product, order, user } = await setup();

  const tooMany = await order([{ productId: product._id, size: "S", quantity: 3 }]);
  expect(tooMany.status).toBe(409);
  expect(tooMany.body.message).toMatch(/Only 2 left/);

  const ok = await order([{ productId: product._id, size: "S", quantity: 2 }]);
  expect(ok.status).toBe(201);
  expect((await Product.findById(product._id)).stock.S).toBe(0);

  const soldOut = await order([{ productId: product._id, size: "S", quantity: 1 }]);
  expect(soldOut.status).toBe(409);

  const cancel = await api().patch(`/api/orders/${ok.body[0]._id}/cancel`).set(auth(user.token));
  expect(cancel.status).toBe(200);
  expect((await Product.findById(product._id)).stock.S).toBe(2);
});

test("a failed line releases stock already reserved for other lines", async () => {
  const { product, order } = await setup();
  const res = await order([
    { productId: product._id, size: "M", quantity: 2 },
    { productId: product._id, size: "XS", quantity: 1 },
  ]);
  expect(res.status).toBe(409);
  expect((await Product.findById(product._id)).stock.M).toBe(5);
  expect(await Order.countDocuments()).toBe(0);
});

test("inventory status follows stock", async () => {
  const admin = await registerAdmin();
  const low = await createProduct(admin, { stock: { M: 3 } });
  expect(low.inventoryStatus).toBe("LOWSTOCK");
  const none = await createProduct(admin, { stock: { M: 0 } });
  expect(none.inventoryStatus).toBe("OUTOFSTOCK");
  const plenty = await createProduct(admin, { stock: { M: 50 } });
  expect(plenty.inventoryStatus).toBe("INSTOCK");
});

test("coupons are validated on the server and split across lines", async () => {
  const { admin, product, order } = await setup();
  await api().post("/api/coupons").set(auth(admin)).send({ code: "save10", type: "PERCENT", value: 10, minOrder: 800 });

  const tooSmall = await order([{ productId: product._id, size: "M", quantity: 1 }], { couponCode: "SAVE10" });
  expect(tooSmall.status).toBe(400);

  const other = await createProduct(admin, { name: "Hoodie", price: 1000 });
  const res = await order(
    [
      { productId: product._id, size: "M", quantity: 1 },
      { productId: other._id, size: "M", quantity: 1 },
    ],
    { couponCode: "save10" }
  );
  expect(res.status).toBe(201);
  const totals = res.body.map((o) => o.totalAmount);
  expect(totals.reduce((a, b) => a + b, 0)).toBe(1350);
  expect(res.body.every((o) => o.couponCode === "SAVE10")).toBe(true);
});

test("order status follows the allowed lifecycle and is tracked", async () => {
  const { admin, product, order } = await setup();
  const created = await order([{ productId: product._id, size: "M", quantity: 1 }]);
  const id = created.body[0]._id;
  const setStatus = (status) => api().put(`/api/orders/${id}`).set(auth(admin)).send({ status });

  expect((await setStatus("Delivered")).status).toBe(400);
  expect((await setStatus("Shipped")).status).toBe(200);
  expect((await setStatus("Pending")).status).toBe(400);
  const delivered = await setStatus("Delivered");
  expect(delivered.status).toBe(200);
  expect(delivered.body.statusHistory.map((h) => h.status)).toEqual(["Pending", "Shipped", "Delivered"]);
  expect(delivered.body.deliveredAt).toBeTruthy();
});

test("shoppers can only cancel before shipping", async () => {
  const { admin, user, product, order } = await setup();
  const created = await order([{ productId: product._id, size: "M", quantity: 1 }]);
  const id = created.body[0]._id;
  await api().put(`/api/orders/${id}`).set(auth(admin)).send({ status: "Shipped" });
  expect((await api().patch(`/api/orders/${id}/cancel`).set(auth(user.token))).status).toBe(400);
});

test("returns within 7 days restock; exchanges create a replacement order", async () => {
  const { admin, user, product, order } = await setup();
  const deliver = async () => {
    const created = await order([{ productId: product._id, size: "M", quantity: 1 }]);
    const id = created.body[0]._id;
    await api().put(`/api/orders/${id}`).set(auth(admin)).send({ status: "Shipped" });
    await api().put(`/api/orders/${id}`).set(auth(admin)).send({ status: "Delivered" });
    return id;
  };

  // Return
  const returnId = await deliver();
  expect((await Product.findById(product._id)).stock.M).toBe(4);
  const noReason = await api().post(`/api/orders/${returnId}/return`).set(auth(user.token)).send({ type: "Return" });
  expect(noReason.status).toBe(400);
  const requested = await api().post(`/api/orders/${returnId}/return`).set(auth(user.token)).send({ type: "Return", reason: "Too big" });
  expect(requested.body.status).toBe("Return Requested");
  await api().put(`/api/orders/${returnId}`).set(auth(admin)).send({ status: "Returned" });
  expect((await Product.findById(product._id)).stock.M).toBe(5);

  // Exchange M -> L
  const exchangeId = await deliver();
  await api().post(`/api/orders/${exchangeId}/return`).set(auth(user.token)).send({ type: "Exchange", reason: "Too small", exchangeSize: "L" });
  const approved = await api().put(`/api/orders/${exchangeId}`).set(auth(admin)).send({ status: "Returned" });
  expect(approved.status).toBe(200);
  const replacement = await Order.findOne({ _id: { $ne: exchangeId }, "products.size": "L" });
  expect(replacement.totalAmount).toBe(0);
  const stock = (await Product.findById(product._id)).stock;
  expect(stock.M).toBe(5);
  expect(stock.L).toBe(4);

  // Outside the window
  const lateId = await deliver();
  await Order.updateOne({ _id: lateId }, { deliveredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) });
  const late = await api().post(`/api/orders/${lateId}/return`).set(auth(user.token)).send({ type: "Return", reason: "Late" });
  expect(late.status).toBe(400);
});

test("ordered items leave the bag; cart uses live prices and caps quantity at stock", async () => {
  const { admin, user, product, order } = await setup();
  await api().post("/api/cart").set(auth(user.token)).send({ _id: product._id, size: "S", price: 1 });
  await api().post("/api/cart").set(auth(user.token)).send({ _id: product._id, size: "S" });
  const third = await api().post("/api/cart").set(auth(user.token)).send({ _id: product._id, size: "S" });
  expect(third.status).toBe(409);

  await api().put(`/api/products/${product._id}`).set(auth(admin)).send({ price: 600 });
  const cart = await api().get("/api/cart").set(auth(user.token));
  expect(cart.body[0].price).toBe(1200);

  await order([{ productId: product._id, size: "S", quantity: 2 }]);
  expect((await api().get("/api/cart").set(auth(user.token))).body).toHaveLength(0);
});

test("reviews update the product rating and are one per user", async () => {
  const { user, product } = await setup();
  const other = await registerUser("other@test.com");
  await api().post(`/api/products/${product._id}/reviews`).set(auth(user.token)).send({ rating: 5, comment: "Great" });
  await api().post(`/api/products/${product._id}/reviews`).set(auth(user.token)).send({ rating: 4, comment: "Good" });
  await api().post(`/api/products/${product._id}/reviews`).set(auth(other.token)).send({ rating: 2 });
  expect((await api().post(`/api/products/${product._id}/reviews`).set(auth(other.token)).send({ rating: 9 })).status).toBe(400);

  const updated = await Product.findById(product._id);
  expect(updated.ratingCount).toBe(2);
  expect(updated.ratingAvg).toBe(3);
});

test("product search, filters and paging", async () => {
  const admin = await registerAdmin();
  for (const [name, price, category] of [["Red Tee", 300, "Shirts"], ["Blue Jeans", 1500, "Jeans"], ["Black Tee", 800, "Shirts"]]) {
    await createProduct(admin, { name, price, category });
  }
  const page = await api().get("/api/products?page=1&limit=2&sort=price_asc");
  expect(page.body.total).toBe(3);
  expect(page.body.items.map((p) => p.name)).toEqual(["Red Tee", "Black Tee"]);

  expect((await api().get("/api/products?q=tee")).body).toHaveLength(2);
  expect((await api().get("/api/products?category=Jeans")).body).toHaveLength(1);
  expect((await api().get("/api/products?price=0-500,1000-")).body.map((p) => p.name).sort()).toEqual(["Blue Jeans", "Red Tee"]);
  expect((await api().get("/api/products?q=.*")).body).toHaveLength(0);
});

test("dashboard counts today's orders in today's bucket", async () => {
  const { admin, product, order } = await setup();
  await order([{ productId: product._id, size: "M", quantity: 2 }]);
  const res = await api().get("/api/dashboard").set(auth(admin));
  expect(res.status).toBe(200);
  expect(res.body.daily).toHaveLength(14);
  const today = res.body.daily[13];
  expect(today.orders).toBe(1);
  expect(today.revenue).toBe(1000);
  expect(res.body.revenue.total).toBe(1000);
  expect(res.body.topProducts[0].quantity).toBe(2);
});
