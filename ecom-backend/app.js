const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { UPLOAD_DIR } = require("./controllers/uploadController");

const app = express();

// Hosts like Render/Railway sit behind a proxy: needed for real client IPs (rate limits) and https links
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

// CLIENT_ORIGINS="https://shop.example.com,https://admin.example.com" restricts CORS; unset allows any origin (dev)
const origins = (process.env.CLIENT_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
if (!origins.length && process.env.NODE_ENV === "production") {
  console.warn("⚠️  CLIENT_ORIGINS is not set: the API accepts requests from any website");
}
app.use(cors(origins.length ? { origin: origins } : undefined));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
  });
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.disable("x-powered-by");

app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", index: false }));

// Uptime checks from the host
app.get("/api/health", (req, res) => res.json({ ok: true, db: require("mongoose").connection.readyState === 1 }));

// Catalogue changes by the admin refresh the pre-rendered storefront (see utils/siteRebuild.js).
// Reviews are left out: pages fetch live ratings after they load.
const { scheduleSiteRebuild } = require("./utils/siteRebuild");
app.use(["/api/products", "/api/categories"], (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !/\/reviews/.test(req.path)) {
    res.on("finish", () => res.statusCode < 400 && scheduleSiteRebuild(`${req.method} ${req.baseUrl}${req.path}`));
  }
  next();
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/addresses", require("./routes/addressRoutes"));
app.use("/api/cards", require("./routes/cardRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/store", require("./routes/storeRoutes"));

app.use("/api", (req, res) => res.status(404).json({ message: "Not found" }));

// Malformed JSON and other unhandled errors
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  if (error.type === "entity.too.large") return res.status(413).json({ message: "Request is too large" });
  console.error(error);
  res.status(500).json({ message: "Something went wrong" });
});

module.exports = app;
