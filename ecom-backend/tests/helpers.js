const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const app = require("../app");

let mongo;

const startDb = async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
};

const stopDb = async () => {
  await mongoose.disconnect();
  await mongo?.stop();
};

const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
};

const api = () => request(app);

const registerAdmin = async (email = "admin@test.com") => {
  const res = await api().post("/api/auth/admin/register").send({ name: "Admin", email, password: "admin123" });
  return res.body.token;
};

const registerUser = async (email = "user@test.com") => {
  const res = await api()
    .post("/api/auth/user/register")
    .send({ firstName: "Test", lastName: "User", email, password: "user123", mobile: "9876543210", gender: "Male" });
  const id = JSON.parse(Buffer.from(res.body.token.split(".")[1], "base64url").toString()).id;
  return { token: res.body.token, id };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const createProduct = async (adminToken, overrides = {}) => {
  const res = await api()
    .post("/api/products")
    .set(auth(adminToken))
    .send({
      name: "Tee",
      category: "Shirts",
      price: 500,
      description: "A comfortable tee for everyday wear.",
      image: "assets/images/product.png",
      brand: "DopeShope",
      seller: "dopeshope",
      stock: { XS: 0, S: 2, M: 5, L: 5, XL: 5, XXL: 0 },
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`createProduct failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
};

const createAddress = async (userToken) => {
  const res = await api()
    .post("/api/addresses")
    .set(auth(userToken))
    .send({ fullName: "Test User", street: "1 Main Rd", city: "Delhi", state: "Delhi", postalCode: "110001", mobile: "9876543210", type: "Home" });
  return res.body;
};

module.exports = { startDb, stopDb, clearDb, api, registerAdmin, registerUser, auth, createProduct, createAddress };
