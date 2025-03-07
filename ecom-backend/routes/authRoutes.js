const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

// Admin Routes
router.post("/admin/register", authController.registerAdmin);
router.post("/admin/login", authController.loginAdmin);

// Public User Routes
router.post("/user/register", authController.registerUser);
router.post("/user/login", authController.loginUser);

module.exports = router;
