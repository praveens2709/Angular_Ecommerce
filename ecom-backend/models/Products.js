const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  { XS: Number, S: Number, M: Number, L: Number, XL: Number, XXL: Number },
  { _id: false }
);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  inventoryStatus: { type: String, enum: ['INSTOCK', 'LOWSTOCK', 'OUTOFSTOCK'], default: 'INSTOCK' },
  description: { type: String, required: true },
  image: { type: String, required: true },
  // Extra gallery photos (the main `image` is always shown first)
  images: { type: [String], default: [] },
  color: { type: String, trim: true },
  // Units per size; when absent the product is untracked and inventoryStatus is set by hand
  stock: { type: stockSchema, default: undefined },
  brand: { type: String, required: true },
  seller: { type: String, required: true },
  discount: { type: Number, required: true },
  mrp: { type: Number, required: true },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
});


// Colour variants are looked up by name + category
productSchema.index({ name: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
