const { startDb, stopDb, clearDb, api, registerAdmin, registerUser, auth, createProduct, createAddress } = require("./helpers");
const Order = require("../models/Order");
const { buildLines } = require("../utils/invoice");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const binary = (res, cb) => {
  const chunks = [];
  res.on("data", (c) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

test("invoice PDF covers the whole checkout, numbers once, and is private", async () => {
  const admin = await registerAdmin();
  const user = await registerUser();
  const other = await registerUser("other@test.com");
  const tee = await createProduct(admin);
  const hoodie = await createProduct(admin, { name: "Hoodie", price: 3000 });
  const address = await createAddress(user.token);
  const orders = (
    await api().post("/api/orders").set(auth(user.token)).send({
      addressId: address._id,
      items: [
        { productId: tee._id, size: "M", quantity: 2 },
        { productId: hoodie._id, size: "L", quantity: 1 },
      ],
    })
  ).body;

  const res = await api().get(`/api/orders/${orders[0]._id}/invoice`).set(auth(user.token)).buffer(true).parse(binary);
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toBe("application/pdf");
  expect(res.body.subarray(0, 4).toString()).toBe("%PDF");

  const numbered = await Order.find({ _id: { $in: orders.map((o) => o._id) } });
  const number = numbered[0].invoiceNumber;
  expect(number).toMatch(/^DS\/\d{4}-\d{2}\/00001$/);
  expect(numbered.every((o) => o.invoiceNumber === number)).toBe(true);

  // Same number on re-download, from either line of the checkout
  await api().get(`/api/orders/${orders[1]._id}/invoice`).set(auth(user.token));
  expect((await Order.findById(orders[1]._id)).invoiceNumber).toBe(number);

  expect((await api().get(`/api/orders/${orders[0]._id}/invoice`).set(auth(other.token))).status).toBe(403);
  expect((await api().get(`/api/orders/${orders[0]._id}/invoice`)).status).toBe(403);
  expect((await api().get(`/api/orders/${orders[0]._id}/invoice`).set(auth(admin))).status).toBe(200);
});

test("GST split: 5% up to Rs.2500 per piece, 18% above; CGST+SGST in-state, IGST otherwise", () => {
  const order = (price, quantity) => ({ totalAmount: price * quantity, discount: 0, products: [{ productName: "X", price, quantity }] });
  const [cheap, pricey] = buildLines([order(1050, 2), order(3000, 1)], true);
  expect(cheap.rate).toBe(5);
  expect(cheap.taxable).toBe(2000);
  expect(cheap.cgst + cheap.sgst).toBe(100);
  expect(pricey.rate).toBe(18);
  expect(pricey.taxable).toBeCloseTo(2542.37, 2);

  const [interstate] = buildLines([order(1050, 1)], false);
  expect(interstate.igst).toBe(50);
  expect(interstate.cgst).toBe(0);
});

test("contact form validates, stores the message, and admins can resolve it", async () => {
  const admin = await registerAdmin();
  expect((await api().post("/api/store/contact").send({ name: "A", email: "bad", message: "hi" })).status).toBe(400);
  const ok = await api().post("/api/store/contact").send({ name: "Asha", email: "asha@test.com", subject: "Order", message: "Where is my order?" });
  expect(ok.status).toBe(201);

  expect((await api().get("/api/store/messages")).status).toBe(401);
  const list = await api().get("/api/store/messages").set(auth(admin));
  expect(list.body.unread).toBe(1);
  const id = list.body.items[0]._id;
  await api().patch(`/api/store/messages/${id}`).set(auth(admin)).send({ status: "Resolved" });
  expect((await api().get("/api/store/messages").set(auth(admin))).body.unread).toBe(0);
});

test("store info comes from env and hides unset fields", async () => {
  process.env.STORE_EMAIL = "help@shop.test";
  const res = await api().get("/api/store/info");
  expect(res.body.email).toBe("help@shop.test");
  expect(res.body.gstin).toBeNull();
  delete process.env.STORE_EMAIL;
});

test("pincode format is checked without calling out in tests", async () => {
  expect((await api().get("/api/store/pincode/12")).status).toBe(404);
  const ok = await api().get("/api/store/pincode/110001");
  expect(ok.body).toEqual(expect.objectContaining({ valid: true, deliverable: true, verified: false, days: 5 }));
});

test("uploads are shrunk and converted to WebP when Cloudinary isn't configured", async () => {
  const sharp = require("sharp");
  const fs = require("fs");
  const path = require("path");
  const admin = await registerAdmin();
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#992603" } }).png().toBuffer();

  const res = await api().post("/api/uploads").set(auth(admin)).attach("images", big, { filename: "big.png", contentType: "image/png" });
  expect(res.status).toBe(201);
  const url = res.body.urls[0];
  expect(url).toMatch(/\/uploads\/.+\.webp$/);

  const file = path.join(__dirname, "..", "uploads", url.split("/uploads/")[1]);
  const meta = await sharp(file).metadata();
  expect(meta.format).toBe("webp");
  expect(meta.width).toBe(1600);
  fs.unlinkSync(file);

  const bad = await api().post("/api/uploads").set(auth(admin)).attach("images", Buffer.from("hello"), { filename: "x.txt", contentType: "text/plain" });
  expect(bad.status).toBe(400);
});

test("health check", async () => {
  const res = await api().get("/api/health");
  expect(res.body).toEqual({ ok: true, db: true });
});

test("catalogue changes trigger one storefront rebuild; reviews and failures don't", async () => {
  const http = require("http");
  const hits = [];
  const hookServer = http.createServer((req, res) => {
    hits.push(req.method);
    res.end("ok");
  });
  await new Promise((resolve) => hookServer.listen(0, resolve));
  process.env.SITE_REBUILD_HOOK_URL = `http://127.0.0.1:${hookServer.address().port}/hook`;
  process.env.SITE_REBUILD_DELAY_MS = "150";
  const waitForHook = () => new Promise((resolve) => setTimeout(resolve, 600));

  try {
    const admin = await registerAdmin();
    const user = await registerUser();
    // A burst of admin edits -> a single rebuild
    const tee = await createProduct(admin);
    await api().put(`/api/products/${tee._id}`).set(auth(admin)).send({ ...tee, price: 450 });
    await api().post("/api/categories").set(auth(admin)).send({ name: "Hoodies", status: "ACTIVE" });
    await waitForHook();
    expect(hits).toEqual(["POST"]);

    // Reviews and rejected requests don't rebuild
    hits.length = 0;
    await api().post(`/api/products/${tee._id}/reviews`).set(auth(user.token)).send({ rating: 5, comment: "Great" });
    await api().post("/api/products").set(auth(user.token)).send({ name: "Not allowed" });
    await waitForHook();
    expect(hits).toEqual([]);
  } finally {
    delete process.env.SITE_REBUILD_HOOK_URL;
    delete process.env.SITE_REBUILD_DELAY_MS;
    await new Promise((resolve) => hookServer.close(resolve));
  }
});
