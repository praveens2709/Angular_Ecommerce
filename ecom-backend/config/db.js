const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB Connection Error ❌", error.message);
    if (/port number|bad auth|URI malformed/i.test(error.message)) {
      console.error(
        "Check MONGODB_URI: use the Atlas *database user* credentials, and URL-encode " +
        "special characters in the username/password (e.g. '@' -> '%40')."
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
