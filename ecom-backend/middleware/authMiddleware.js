const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

/** null = no token sent, undefined = token invalid or expired */
const decodeToken = (req) => {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return undefined;
  }
};

/** The shopper for a token, unless the token predates their last password change */
const loadUser = async (decoded) => {
  if (decoded?.role !== "user") return null;
  const user = await User.findById(decoded.id).select("fullName email mobile active passwordChangedAt");
  if (!user) return null;
  if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000) return null;
  return user;
};

const loadAdmin = async (decoded) =>
  decoded?.role === "admin" ? Admin.findById(decoded.id).select("name email") : null;

/** Logged-in shopper required; sets req.user */
const requireUser = async (req, res, next) => {
  const decoded = decodeToken(req);
  if (decoded === null) return res.status(401).json({ message: "Please log in to continue" });

  const user = await loadUser(decoded).catch(() => null);
  if (!user) return res.status(401).json({ message: "Your session has expired. Please log in again." });
  if (user.active === false) return res.status(403).json({ message: "This account has been disabled" });

  req.user = user;
  next();
};

/** Logged-in admin required; sets req.admin */
const requireAdmin = async (req, res, next) => {
  const decoded = decodeToken(req);
  if (decoded === null) return res.status(401).json({ message: "Admin login required" });

  const admin = await loadAdmin(decoded).catch(() => null);
  if (!admin) return res.status(403).json({ message: "Admin access only" });

  req.admin = admin;
  next();
};

/** Admin, or the shopper whose id is in req.params[param] */
const requireSelfOrAdmin = (param = "id") => async (req, res, next) => {
  const decoded = decodeToken(req);
  if (decoded === null) return res.status(401).json({ message: "Please log in to continue" });

  const admin = await loadAdmin(decoded).catch(() => null);
  if (admin) {
    req.admin = admin;
    return next();
  }
  const user = await loadUser(decoded).catch(() => null);
  if (user && user.active === false) return res.status(403).json({ message: "This account has been disabled" });
  if (user && String(user._id) === req.params[param]) {
    req.user = user;
    return next();
  }
  return res.status(403).json({ message: "You can only access your own account" });
};

module.exports = requireUser;
module.exports.requireUser = requireUser;
module.exports.requireAdmin = requireAdmin;
module.exports.requireSelfOrAdmin = requireSelfOrAdmin;
module.exports.decodeToken = decodeToken;
module.exports.loadUser = loadUser;
