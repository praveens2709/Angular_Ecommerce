const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Ensure this is the correct User model

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization");
  console.log("Token received:", token); // Debugging

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    console.log("Decoded user:", decoded); // Debugging

    // 🟢 Fetch user details from the database
    const user = await User.findById(decoded.id).select("fullName email");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user; // Attach full user object to request
    console.log("Authenticated User:", req.user); // Debugging
    next();
  } catch (error) {
    console.log("Invalid token");
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;
