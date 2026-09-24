const mongoose = require("mongoose");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Card = require("../models/Card");
const Wishlist = require("../models/Wishlist");
const bcrypt = require("bcryptjs");
const { parsePaging, escapeRegex } = require("../utils/pagination");

// 🔹 Admin: all users (paged when ?page= is given; ?q= searches, ?gender= filters)
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.q) {
      const pattern = new RegExp(escapeRegex(String(req.query.q).trim()), "i");
      filter.$or = [{ fullName: pattern }, { email: pattern }, { mobile: pattern }];
    }
    if (req.query.gender) filter.gender = req.query.gender;

    const query = () => User.find(filter).select("-password").sort({ createdAt: -1 });
    const paging = parsePaging(req.query, { defaultLimit: 10 });
    if (!paging) return res.json(await query());

    const [items, total] = await Promise.all([query().skip(paging.skip).limit(paging.limit), User.countDocuments(filter)]);
    res.json({ items, total, page: paging.page, limit: paging.limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Self or admin
exports.getUserById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "User not found" });
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Admin: add new user
exports.addUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, mobile, gender } = req.body;
    if (!firstName || !email || !password || !mobile) return res.status(400).json({ message: "Missing required fields" });

    const existingUser = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName || ""}`.trim();

    const newUser = await User.create({ firstName, lastName, fullName, email, password: hashedPassword, mobile, gender });
    const { password: _, ...safeUser } = newUser.toObject();
    res.status(201).json({ message: "User created successfully", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Self or admin; only admins can enable/disable accounts
exports.editUser = async (req, res) => {
  try {
    const { fullName, email, mobile, gender, active, dateOfBirth } = req.body;
    let { firstName, lastName } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // The profile form edits a single fullName field; split it into first/last
    if (fullName && !firstName && !lastName) {
      const [first, ...rest] = fullName.trim().split(/\s+/);
      firstName = first;
      lastName = rest.join(" ");
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const taken = await User.exists({ _id: { $ne: user._id }, email: new RegExp(`^${escapeRegex(email)}$`, "i") });
      if (taken) return res.status(400).json({ message: "That email is already used by another account" });
    }
    if (mobile !== undefined && !/^\d{10}$/.test(String(mobile))) {
      return res.status(400).json({ message: "Mobile number must be 10 digits" });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName !== undefined ? lastName : user.lastName;
    user.fullName = `${user.firstName} ${user.lastName}`.trim();
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    user.gender = gender || user.gender;
    if (req.admin && active !== undefined) user.active = !!active;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth || null;

    await user.save();
    const { password, ...safeUser } = user.toObject();
    res.json({ message: "User updated successfully", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Self or admin; also removes the user's cart, addresses, cards and wishlist
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await Promise.all([
      Cart.deleteMany({ userId: user._id }),
      Address.deleteMany({ userId: user._id }),
      Card.deleteMany({ userId: user._id }),
      Wishlist.deleteMany({ userId: user._id }),
    ]);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
