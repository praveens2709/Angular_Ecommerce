const mongoose = require('mongoose');
const Product = require('../models/Products');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { parsePaging } = require('../utils/pagination');
const { searchProducts, invalidateSearchIndex } = require('../utils/search');
const { normalizeStock, deriveInventoryStatus, calculateDiscountAndMRP } = require('../utils/catalog');

const SORTS = {
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  newest: { _id: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
  discount: { discount: -1, _id: -1 },
};

/** "0-500,10000-" -> [{price:{$gte:0,$lte:500}}, {price:{$gte:10000}}] */
const priceClauses = (value) =>
  String(value)
    .split(',')
    .map((range) => {
      const [minRaw, maxRaw] = range.split('-');
      const min = Number(minRaw) || 0;
      const max = maxRaw === undefined || maxRaw === '' ? Infinity : Number(maxRaw);
      return { price: Number.isFinite(max) ? { $gte: min, $lte: max } : { $gte: min } };
    });

/** Mongo filter for a list query; `matches` are the search hits (id -> relevance) when searching */
const buildFilter = (query, matches) => {
  const filter = {};
  const and = [];
  if (matches) and.push({ _id: { $in: [...matches.keys()] } });
  if (query.category) filter.category = { $in: String(query.category).split(',').filter(Boolean) };
  if (query.price) and.push({ $or: priceClauses(query.price) });
  if (query.inStock === 'true') filter.inventoryStatus = { $ne: 'OUTOFSTOCK' };
  if (and.length) filter.$and = and;
  return filter;
};

/** Shared by add/update: cleans stock, images and pricing fields from a form body */
const applyProductFields = (body, existing) => {
  const update = {};
  const fields = ['name', 'category', 'price', 'inventoryStatus', 'description', 'image', 'brand', 'seller', 'color'];
  for (const field of fields) if (body[field] !== undefined) update[field] = body[field];

  if (body.images !== undefined) {
    update.images = (Array.isArray(body.images) ? body.images : []).filter((url) => typeof url === 'string' && url).slice(0, 8);
  }
  if (body.stock !== undefined) {
    const stock = normalizeStock(body.stock);
    update.stock = stock;
    if (stock) update.inventoryStatus = deriveInventoryStatus(stock);
  } else if (existing?.stock) {
    // Tracked products get their status from stock, not from the form
    delete update.inventoryStatus;
  }
  if (update.price !== undefined) {
    update.price = Number(update.price);
    Object.assign(update, calculateDiscountAndMRP(update.price));
  }
  return update;
};

// List products: plain array by default, { items, total, page, limit } when paged
exports.getAllProducts = async (req, res) => {
  try {
    // Forgiving search (spacing, plurals, synonyms, typos) picks the matching ids
    const matches = String(req.query.q ?? '').trim() ? await searchProducts(String(req.query.q)) : null;
    const filter = buildFilter(req.query, matches);
    const sort = SORTS[req.query.sort] || { _id: 1 };
    const paging = parsePaging(req.query);

    // Searching without a chosen sort: best matches first
    if (matches && !SORTS[req.query.sort]) {
      const found = await Product.find(filter);
      found.sort((a, b) => matches.get(String(b._id)) - matches.get(String(a._id)) || (String(a._id) < String(b._id) ? -1 : 1));
      if (!paging) return res.json(found);
      return res.json({ items: found.slice(paging.skip, paging.skip + paging.limit), total: found.length, page: paging.page, limit: paging.limit });
    }

    if (!paging) return res.json(await Product.find(filter).sort(sort));

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(paging.skip).limit(paging.limit),
      Product.countDocuments(filter),
    ]);
    res.json({ items, total, page: paging.page, limit: paging.limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Colour variants: same name + category
exports.getVariants = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(await Product.find({ name: product.name, category: product.category }).sort({ _id: 1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new product
exports.addProduct = async (req, res) => {
  try {
    const update = applyProductFields(req.body);
    const saved = await new Product(update).save();
    invalidateSearchIndex();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const update = applyProductFields(req.body, existing);
    const unset = update.stock === undefined && 'stock' in update ? { stock: 1 } : undefined;
    if (unset) delete update.stock;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      unset ? { $set: update, $unset: unset } : update,
      { new: true, runValidators: true }
    );
    invalidateSearchIndex();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
    invalidateSearchIndex();
    await Review.deleteMany({ productId: deletedProduct._id });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Reviews ----------

const refreshRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  });
};

exports.getReviews = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Product not found' });
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 }).limit(100);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// One review per user per product; posting again updates it
exports.upsertReview = async (req, res) => {
  try {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim().slice(0, 1000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (!mongoose.isValidObjectId(req.params.id) || !(await Product.exists({ _id: req.params.id }))) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const verifiedPurchase = !!(await Order.exists({
      userId: req.user._id,
      'products.productId': req.params.id,
      status: { $in: ['Delivered', 'Return Requested', 'Return Rejected'] },
    }));

    const review = await Review.findOneAndUpdate(
      { productId: req.params.id, userId: req.user._id },
      { rating, comment, userName: req.user.fullName, verifiedPurchase },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await refreshRating(req.params.id);
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMyReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ productId: req.params.id, userId: req.user._id });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    await refreshRating(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.buildFilter = buildFilter;
