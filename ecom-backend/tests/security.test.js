const { startDb, stopDb, clearDb, api, registerAdmin, registerUser, auth, createProduct, createAddress } = require("./helpers");
const jwt = require("jsonwebtoken");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("admin-only endpoints reject anonymous and shopper requests", () => {
  const adminOnly = [
    ["post", "/api/products"],
    ["put", "/api/products/000000000000000000000000"],
    ["delete", "/api/products/000000000000000000000000"],
    ["post", "/api/categories"],
    ["put", "/api/categories/000000000000000000000000"],
    ["delete", "/api/categories/000000000000000000000000"],
    ["get", "/api/orders"],
    ["put", "/api/orders/000000000000000000000000"],
    ["delete", "/api/orders/000000000000000000000000"],
    ["get", "/api/users"],
    ["post", "/api/users"],
    ["get", "/api/dashboard"],
    ["get", "/api/coupons"],
    ["post", "/api/coupons"],
    ["post", "/api/uploads"],
  ];

  test.each(adminOnly)("%s %s", async (method, url) => {
    const { token } = await registerUser();
    const anon = await api()[method](url).send({});
    const shopper = await api()[method](url).set(auth(token)).send({});
    expect(anon.status).toBe(401);
    expect(shopper.status).toBe(403);
  });
});

test("admin registration closes once an admin exists", async () => {
  const first = await api().post("/api/auth/admin/register").send({ name: "A", email: "a@test.com", password: "admin123" });
  expect(first.status).toBe(201);

  const stranger = await api().post("/api/auth/admin/register").send({ name: "B", email: "b@test.com", password: "admin123" });
  expect(stranger.status).toBe(403);

  const byAdmin = await api()
    .post("/api/auth/admin/register")
    .set(auth(first.body.token))
    .send({ name: "C", email: "c@test.com", password: "admin123" });
  expect(byAdmin.status).toBe(201);
});

test("tokens expire and forged tokens are rejected", async () => {
  const { token, id } = await registerUser();
  expect(jwt.decode(token).exp).toBeDefined();

  const expired = jwt.sign({ id, role: "user" }, process.env.JWT_SECRET, { expiresIn: -10 });
  expect((await api().get("/api/cart").set(auth(expired))).status).toBe(401);

  const forged = jwt.sign({ id, role: "user" }, "wrong-secret");
  expect((await api().get("/api/cart").set(auth(forged))).status).toBe(401);

  // A shopper token can't be relabelled as an admin token without the secret
  const [h, , s] = token.split(".");
  const fakeAdmin = `${h}.${Buffer.from(JSON.stringify({ id, role: "admin" })).toString("base64url")}.${s}`;
  expect((await api().get("/api/dashboard").set(auth(fakeAdmin))).status).toBe(403);
});

test("a logged-in shopper can't use admin endpoints", async () => {
  const { token } = await registerUser("shopper@test.com");
  const asShopper = (req) => req.set(auth(token));

  expect((await asShopper(api().get("/api/dashboard"))).status).toBe(403);
  expect((await asShopper(api().get("/api/orders"))).status).toBe(403);
  expect((await asShopper(api().get("/api/users"))).status).toBe(403);
  expect((await asShopper(api().get("/api/coupons"))).status).toBe(403);
  expect((await asShopper(api().get("/api/store/messages"))).status).toBe(403);
  expect((await asShopper(api().post("/api/products").send({ name: "X", price: 1 }))).status).toBe(403);
  expect((await asShopper(api().post("/api/categories").send({ name: "X" }))).status).toBe(403);
  // Nor create an admin account for themselves once one exists
  await api().post("/api/auth/admin/register").send({ name: "A", email: "owner@test.com", password: "admin123" });
  expect((await asShopper(api().post("/api/auth/admin/register").send({ name: "S", email: "s@test.com", password: "admin123" }))).status).toBe(403);
});

test("users can only read and edit their own account", async () => {
  const alice = await registerUser("alice@test.com");
  const bob = await registerUser("bob@test.com");

  expect((await api().get(`/api/users/${alice.id}`).set(auth(alice.token))).status).toBe(200);
  expect((await api().get(`/api/users/${alice.id}`).set(auth(bob.token))).status).toBe(403);
  expect((await api().put(`/api/users/${alice.id}`).set(auth(bob.token)).send({ fullName: "Hacked" })).status).toBe(403);
  expect((await api().delete(`/api/users/${alice.id}`).set(auth(bob.token))).status).toBe(403);

  // Shoppers can't re-enable or disable accounts themselves
  await api().put(`/api/users/${alice.id}`).set(auth(alice.token)).send({ active: false });
  const me = await api().get(`/api/users/${alice.id}`).set(auth(alice.token));
  expect(me.body.active).toBe(true);
  expect(me.body.password).toBeUndefined();
});

test("addresses, cards, orders and cart are private to their owner", async () => {
  const admin = await registerAdmin();
  const alice = await registerUser("alice@test.com");
  const bob = await registerUser("bob@test.com");
  const product = await createProduct(admin);
  const address = await createAddress(alice.token);

  // Bob can't see or touch Alice's address
  expect((await api().get("/api/addresses").set(auth(bob.token))).body).toHaveLength(0);
  expect((await api().put(`/api/addresses/${address._id}`).set(auth(bob.token)).send({ city: "X" })).status).toBe(404);
  expect((await api().delete(`/api/addresses/${address._id}`).set(auth(bob.token))).status).toBe(404);

  // Bob can't use Alice's address for his order
  const bobOrder = await api()
    .post("/api/orders")
    .set(auth(bob.token))
    .send({ addressId: address._id, items: [{ productId: product._id, size: "M", quantity: 1 }] });
  expect(bobOrder.status).toBe(400);

  const order = await api()
    .post("/api/orders")
    .set(auth(alice.token))
    .send({ addressId: address._id, items: [{ productId: product._id, size: "M", quantity: 1 }] });
  expect(order.status).toBe(201);
  const orderId = order.body[0]._id;

  expect((await api().get(`/api/orders/order/${orderId}`).set(auth(bob.token))).status).toBe(403);
  expect((await api().get(`/api/orders/order/${orderId}`)).status).toBe(403);
  expect((await api().get(`/api/orders/order/${orderId}`).set(auth(alice.token))).status).toBe(200);
  expect((await api().get(`/api/orders/order/${orderId}`).set(auth(admin))).status).toBe(200);
  expect((await api().patch(`/api/orders/${orderId}/cancel`).set(auth(bob.token))).status).toBe(404);
  expect((await api().get("/api/orders/my").set(auth(bob.token))).body).toHaveLength(0);

  // Cart items
  const cart = await api().post("/api/cart").set(auth(alice.token)).send({ _id: product._id, size: "L" });
  expect((await api().delete(`/api/cart/${cart.body._id}`).set(auth(bob.token))).status).toBe(200);
  expect((await api().get("/api/cart").set(auth(alice.token))).body).toHaveLength(1);
});

test("cards keep only the last 4 digits", async () => {
  const { token } = await registerUser();
  const bad = await api().post("/api/cards").set(auth(token))
    .send({ cardHolderName: "Test", cardNumber: "4111111111111112", expiryMonth: "12", expiryYear: "39", cardType: "VISA" });
  expect(bad.status).toBe(400);

  const res = await api().post("/api/cards").set(auth(token))
    .send({ cardHolderName: "Test", cardNumber: "4111 1111 1111 1111", expiryMonth: "12", expiryYear: "39", cardType: "VISA" });
  expect(res.status).toBe(201);
  expect(res.body.card.last4).toBe("1111");
  expect(res.body.card.cardNumber).toBeUndefined();

  const stored = await require("mongoose").connection.db.collection("cards").findOne({});
  expect(stored.cardNumber).toBeUndefined();
  expect(JSON.stringify(stored)).not.toContain("4111111111111111");
});

test("password reset works once and doesn't reveal which emails exist", async () => {
  const { outbox } = require("../utils/mailer");
  await registerUser("reset@test.com");
  outbox.length = 0;

  const unknown = await api().post("/api/auth/user/forgot-password").send({ email: "nobody@test.com" });
  const known = await api().post("/api/auth/user/forgot-password").send({ email: "RESET@test.com" });
  expect(unknown.status).toBe(200);
  expect(known.body).toEqual(unknown.body);
  // Emails are sent in the background after the response
  for (let i = 0; i < 50 && outbox.length === 0; i++) await new Promise((r) => setTimeout(r, 20));
  expect(outbox).toHaveLength(1);

  const token = outbox[0].text.match(/token=([a-f0-9]+)/)[1];
  expect((await api().post("/api/auth/user/reset-password").send({ token, password: "newpass1" })).status).toBe(200);
  expect((await api().post("/api/auth/user/reset-password").send({ token, password: "again12" })).status).toBe(400);

  expect((await api().post("/api/auth/user/login").send({ email: "reset@test.com", password: "user123" })).status).toBe(401);
  expect((await api().post("/api/auth/user/login").send({ email: "reset@test.com", password: "newpass1" })).status).toBe(200);
});

test("a password reset signs out old sessions; disabled users can't read orders or invoices", async () => {
  const crypto = require("crypto");
  const User = require("../models/User");
  const { token, id } = await registerUser("reset@test.com");
  expect((await api().get("/api/cart").set(auth(token))).status).toBe(200);

  // Reset the password through the real flow (token stored hashed)
  const raw = "reset-token-123";
  await User.updateOne({ _id: id }, {
    resetPasswordToken: crypto.createHash("sha256").update(raw).digest("hex"),
    resetPasswordExpires: new Date(Date.now() + 60000),
  });
  await new Promise((r) => setTimeout(r, 1100)); // tokens are second-precision
  const reset = await api().post("/api/auth/user/reset-password").send({ token: raw, password: "newpass123" });
  expect(reset.status).toBe(200);
  expect((await api().get("/api/cart").set(auth(token))).status).toBe(401);

  const login = await api().post("/api/auth/user/login").send({ email: "reset@test.com", password: "newpass123" });
  expect(login.status).toBe(200);
  expect((await api().get("/api/cart").set(auth(login.body.token))).status).toBe(200);

  // Disabled: own profile and invoices are refused too
  await User.updateOne({ _id: id }, { active: false });
  expect((await api().get(`/api/users/${id}`).set(auth(login.body.token))).status).toBe(403);
});
