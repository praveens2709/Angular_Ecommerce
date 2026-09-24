const express = require("express");
const authController = require("../controllers/authController");
const rateLimit = require("../utils/rateLimit");

const router = express.Router();
// AUTH_RATE_LIMIT_MAX raises the per-IP limit (e.g. for automated tests)
const limitMax = Number(process.env.AUTH_RATE_LIMIT_MAX) || 0;
const loginLimiter = rateLimit({ max: limitMax || 10 });
const resetLimiter = rateLimit({ max: limitMax || 5, message: "Too many reset requests. Please try again later." });

// Admin Routes (registration is closed once an admin exists; see controller)
router.post("/admin/register", loginLimiter, authController.registerAdmin);
router.post("/admin/login", loginLimiter, authController.loginAdmin);

// Public User Routes
router.post("/user/register", loginLimiter, authController.registerUser);
router.post("/user/login", loginLimiter, authController.loginUser);
router.post("/user/forgot-password", resetLimiter, authController.forgotPassword);
router.post("/user/reset-password", resetLimiter, authController.resetPassword);

module.exports = router;
