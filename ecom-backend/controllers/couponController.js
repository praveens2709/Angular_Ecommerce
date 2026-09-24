const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');

const FIELDS = ['code', 'description', 'type', 'value', 'minOrder', 'maxDiscount', 'expiresAt', 'active'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]));

const validateCoupon = (data) => {
  if (data.type === 'PERCENT' && (data.value <= 0 || data.value > 90)) return 'Percentage must be between 1 and 90';
  if (data.type === 'FLAT' && data.value <= 0) return 'Flat discount must be more than 0';
  return null;
};

// Shopper: check a code against their bag subtotal
exports.validateCoupon = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal) || 0;
    if (!code) return res.status(400).json({ message: 'Enter a coupon code' });

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    const result = coupon.evaluate(subtotal);
    if (result.error) return res.status(400).json({ message: result.error });

    res.json({
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      maxDiscount: coupon.maxDiscount,
      discount: result.discount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not apply coupon' });
  }
};

// Shopper: coupons currently usable (shown as suggestions in the bag)
exports.getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    })
      .select('code description type value minOrder maxDiscount expiresAt')
      .sort({ minOrder: 1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load coupons' });
  }
};

// ---------- Admin CRUD ----------

exports.listCoupons = async (req, res) => {
  try {
    res.json(await Coupon.find().sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const data = pick(req.body);
    const error = validateCoupon(data);
    if (error) return res.status(400).json({ message: error });
    res.status(201).json(await Coupon.create(data));
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'A coupon with that code already exists' });
    res.status(400).json({ message: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Coupon not found' });
    const data = pick(req.body);
    const existing = await Coupon.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Coupon not found' });
    const error = validateCoupon({ type: data.type ?? existing.type, value: data.value ?? existing.value });
    if (error) return res.status(400).json({ message: error });
    res.json(await Coupon.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }));
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'A coupon with that code already exists' });
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
