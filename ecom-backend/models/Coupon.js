const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrder: { type: Number, default: 0 },
  // Cap for percentage coupons (0 = no cap)
  maxDiscount: { type: Number, default: 0 },
  // Festival coupons can be set up in advance: usable from startsAt until expiresAt
  startsAt: { type: Date },
  expiresAt: { type: Date },
  active: { type: Boolean, default: true },
  // Only for customers without an earlier (non-cancelled) order
  firstOrderOnly: { type: Boolean, default: false },
  // Each customer can use it once
  oncePerUser: { type: Boolean, default: false },
  // Total checkouts that may use it (0 = unlimited)
  usageLimit: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

/** Discount this coupon gives on `subtotal`, or an error message */
CouponSchema.methods.evaluate = function (subtotal) {
  if (!this.active) return { error: 'This coupon is no longer active' };
  if (this.startsAt && this.startsAt > new Date()) return { error: "This coupon isn't active yet" };
  if (this.expiresAt && this.expiresAt < new Date()) return { error: 'This coupon has expired' };
  if (subtotal < this.minOrder) return { error: `Add items worth ₹${this.minOrder - subtotal} more to use this coupon` };

  let discount = this.type === 'PERCENT' ? (subtotal * this.value) / 100 : this.value;
  if (this.type === 'PERCENT' && this.maxDiscount > 0) discount = Math.min(discount, this.maxDiscount);
  discount = Math.min(Math.round(discount), subtotal);
  return { discount };
};

module.exports = mongoose.model('Coupon', CouponSchema);
