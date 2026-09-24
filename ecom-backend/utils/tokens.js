const jwt = require("jsonwebtoken");

// Shoppers stay signed in for a week; admin sessions are short-lived
const EXPIRY = {
  user: process.env.USER_TOKEN_EXPIRY || "7d",
  admin: process.env.ADMIN_TOKEN_EXPIRY || "12h",
};

exports.signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: EXPIRY[role] || "1d" });
