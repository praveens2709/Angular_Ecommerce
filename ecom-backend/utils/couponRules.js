const Order = require('../models/Order');

/** Orders that "count" for coupon rules: cancelled orders never used the coupon */
const counted = { status: { $ne: 'Cancelled' } };

/**
 * Per-customer and total-use rules of a coupon (the amount rules live in Coupon#evaluate).
 * Returns an error message, or null when this customer may use it.
 */
exports.couponRuleError = async (coupon, userId) => {
  if (coupon.firstOrderOnly && userId && (await Order.exists({ userId, ...counted }))) {
    return 'This coupon is for your first order only';
  }
  if (coupon.oncePerUser && userId && (await Order.exists({ userId, couponCode: coupon.code, ...counted }))) {
    return "You've already used this coupon";
  }
  if (coupon.usageLimit > 0) {
    // One checkout can create several order lines (one per item); count checkouts, not lines
    const uses = (await Order.distinct('groupId', { couponCode: coupon.code, ...counted })).length;
    if (uses >= coupon.usageLimit) return 'This coupon has reached its usage limit';
  }
  return null;
};
