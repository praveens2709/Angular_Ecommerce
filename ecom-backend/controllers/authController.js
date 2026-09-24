const crypto = require("crypto");
const Admin = require("../models/Admin");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { signToken } = require("../utils/tokens");
const { decodeToken } = require("../middleware/authMiddleware");
const emails = require("../utils/emails");
const { escapeRegex } = require("../utils/pagination");

// Older accounts may have been saved with mixed-case emails
const emailQuery = (email) => ({ email: new RegExp(`^${escapeRegex(String(email || "").trim())}$`, "i") });

const MIN_PASSWORD = 6;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Register Admin: open only while no admin exists; after that an admin must create new ones
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });

    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      const decoded = decodeToken(req);
      const caller = decoded?.role === "admin" ? await Admin.findById(decoded.id) : null;
      if (!caller) return res.status(403).json({ message: "Only an existing admin can create new admin accounts" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await Admin.findOne(emailQuery(normalizedEmail))) return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ name, email: normalizedEmail, password: hashedPassword });

    res.status(201).json({ message: "Admin registered successfully", token: signToken(admin._id, "admin") });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = email ? await Admin.findOne(emailQuery(email)) : null;
    if (!admin || !(await bcrypt.compare(String(password || ""), admin.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      token: signToken(admin._id, "admin"),
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Register Public User
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, mobile, gender } = req.body;
    if (!firstName || !email || !password || !mobile) {
      return res.status(400).json({ message: "First name, email, password and mobile are required" });
    }
    if (password.length < MIN_PASSWORD) return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });

    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.findOne(emailQuery(normalizedEmail))) return res.status(400).json({ message: "User already exists" });

    const fullName = `${firstName} ${lastName || ""}`.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      fullName,
      email: normalizedEmail,
      mobile,
      gender,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User registered successfully", token: signToken(user._id, "user") });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public User Login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = email ? await User.findOne(emailQuery(email)) : null;
    if (!user || !(await bcrypt.compare(String(password || ""), user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.active === false) return res.status(403).json({ message: "This account has been disabled" });

    res.json({
      message: "Login successful",
      token: signToken(user._id, "user"),
      user: { id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Always answers the same way so the endpoint can't be used to check which emails exist
exports.forgotPassword = async (req, res) => {
  const reply = { message: "If an account exists for that email, a reset link has been sent." };
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne(emailQuery(email));
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      emails.passwordReset(user, token);
    }
    res.json(reply);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });

    const user = await User.findOne({
      resetPasswordToken: hashToken(String(token)),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");
    if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired" });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
