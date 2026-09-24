const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Products');

// Wishlisted products (skips products that were deleted since)
exports.getWishlist = async (req, res) => {
  try {
    const entries = await Wishlist.find({ userId: req.user._id }).sort({ createdAt: -1 }).populate('productId');
    res.json(entries.filter((e) => e.productId).map((e) => e.productId));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId) || !(await Product.exists({ _id: productId }))) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await Wishlist.updateOne({ userId: req.user._id, productId }, {}, { upsert: true });
    res.status(201).json({ message: 'Added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update wishlist' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    await Wishlist.deleteOne({ userId: req.user._id, productId: req.params.productId });
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update wishlist' });
  }
};
