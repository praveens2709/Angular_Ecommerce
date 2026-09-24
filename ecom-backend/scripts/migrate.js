/**
 * One-time data migration (safe to re-run):
 *  - cards: replace the stored full card number with its last 4 digits
 *  - orders: backfill statusHistory so old orders show a tracking timeline
 *
 * Usage: node scripts/migrate.js            (uses MONGODB_URI from .env)
 *        node scripts/migrate.js --dry-run  (report only)
 */
require("dotenv").config();
const mongoose = require("mongoose");

const dryRun = process.argv.includes("--dry-run");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const cards = await db.collection("cards").find({ cardNumber: { $exists: true } }).toArray();
  console.log(`Cards with a stored full number: ${cards.length}`);
  for (const card of cards) {
    const last4 = String(card.cardNumber).replace(/\D/g, "").slice(-4);
    if (!dryRun) {
      await db.collection("cards").updateOne({ _id: card._id }, { $set: { last4 }, $unset: { cardNumber: "" } });
    }
  }

  const orders = await db.collection("orders").find({ statusHistory: { $exists: false } }).toArray();
  console.log(`Orders without a status history: ${orders.length}`);
  for (const order of orders) {
    const at = order.orderDate || order._id.getTimestamp();
    const history = [{ status: "Pending", at }];
    if (order.status && order.status !== "Pending") history.push({ status: order.status, at });
    if (!dryRun) {
      await db.collection("orders").updateOne(
        { _id: order._id },
        { $set: { statusHistory: history, ...(order.status === "Delivered" ? { deliveredAt: at } : {}) } }
      );
    }
  }

  console.log(dryRun ? "Dry run: nothing changed." : "Migration complete.");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
