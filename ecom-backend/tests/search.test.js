const { startDb, stopDb, clearDb, api, registerAdmin, createProduct, auth } = require("./helpers");
const { distance } = require("../utils/search");

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const names = async (q, extra = "") =>
  (await api().get(`/api/products?q=${encodeURIComponent(q)}${extra}`)).body.map((p) => p.name).sort();

const seed = async () => {
  const admin = await registerAdmin();
  await createProduct(admin, { name: "Classic Raglan Crew Neck Tee", category: "T-Shirts", color: "Burnt Orange" });
  await createProduct(admin, { name: "Oxford Button-Down Shirt", category: "Shirts", color: "White" });
  await createProduct(admin, { name: "Cargo Shorts", category: "Shorts", color: "Khaki" });
  await createProduct(admin, { name: "Graphic Hoodie", category: "Hoodies", color: "Grey" });
  await createProduct(admin, { name: "Denim Jacket", category: "Jackets", color: "Blue" });
  return admin;
};

test("spacing, hyphens, plurals and synonyms don't matter", async () => {
  await seed();
  for (const q of ["tshirt", "t shirt", "t-shirt", "T-Shirts", "tshirts", "tee", "tees"]) {
    expect(await names(q)).toEqual(["Classic Raglan Crew Neck Tee"]);
  }
  expect(await names("hoodies")).toEqual(["Graphic Hoodie"]);
  expect(await names("gray")).toEqual(["Graphic Hoodie"]);
});

test("typos still find the product, but only when nothing matches exactly", async () => {
  await seed();
  expect(await names("tshrit")).toEqual(["Classic Raglan Crew Neck Tee"]);
  expect(await names("hoddie")).toEqual(["Graphic Hoodie"]);
  expect(await names("jaket")).toEqual(["Denim Jacket"]);
  // "shirt" is one letter from "short": real matches win, so shorts stay out
  expect(await names("shirt")).toEqual(["Classic Raglan Crew Neck Tee", "Oxford Button-Down Shirt"]);
  expect(await names("short")).toEqual(["Cargo Shorts"]);
  expect(await names("xyzzy")).toEqual([]);
});

test("every word must match, and search combines with filters and paging", async () => {
  await seed();
  expect(await names("orange tee")).toEqual(["Classic Raglan Crew Neck Tee"]);
  expect(await names("blue tee")).toEqual([]);
  expect(await names("shirt", "&category=Shirts")).toEqual(["Oxford Button-Down Shirt"]);

  const page = (await api().get("/api/products?q=shirt&page=1&limit=1")).body;
  expect(page.total).toBe(2);
  expect(page.items).toHaveLength(1);
});

test("best match first when no sort is chosen; a chosen sort is kept", async () => {
  const admin = await registerAdmin();
  await createProduct(admin, { name: "Hoodie Tee", category: "T-Shirts", price: 400 });
  await createProduct(admin, { name: "Graphic Hoodie", category: "Hoodies", price: 900 });
  const best = (await api().get("/api/products?q=hoodie&page=1&limit=5")).body.items.map((p) => p.name);
  expect(best).toHaveLength(2);
  const byPrice = (await api().get("/api/products?q=hoodie&sort=price_desc")).body.map((p) => p.name);
  expect(byPrice).toEqual(["Graphic Hoodie", "Hoodie Tee"]);
});

test("new and renamed products are searchable straight away", async () => {
  const admin = await seed();
  expect(await names("kurta")).toEqual([]);
  const kurta = await createProduct(admin, { name: "Cotton Kurta", category: "Ethnic" });
  expect(await names("kurta")).toEqual(["Cotton Kurta"]);
  await api().put(`/api/products/${kurta._id}`).set(auth(admin)).send({ name: "Linen Kurta" });
  expect(await names("linen")).toEqual(["Linen Kurta"]);
});

test("typo distance counts a swapped pair as one", () => {
  expect(distance("tshrit", "tshirt", 2)).toBe(1);
  expect(distance("hoddie", "hoodie", 2)).toBe(1);
  expect(distance("abc", "xyz", 1)).toBeGreaterThan(1);
});
