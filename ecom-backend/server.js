const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");
const app = require("./app");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing ❌");
  process.exit(1);
}

connectDB();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} 🚀`)
);
