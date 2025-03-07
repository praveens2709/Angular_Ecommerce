const User = require("../models/User");
const bcrypt = require("bcryptjs");

// 🔹 Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Add new user
exports.addUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, mobile, gender } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName}`;

    const newUser = new User({
      firstName,
      lastName,
      fullName,
      email,
      password: hashedPassword,
      mobile,
      gender,
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Edit user
exports.editUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, gender, active } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.fullName = `${user.firstName} ${user.lastName}`;
    user.email = email || user.email;
    user.mobile = mobile || user.mobile;
    user.gender = gender || user.gender;
    user.active = active !== undefined ? active : user.active;

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
