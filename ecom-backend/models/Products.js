const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  inventoryStatus: { type: String, enum: ['INSTOCK', 'LOWSTOCK', 'OUTOFSTOCK'], default: 'INSTOCK' },
  description: { type: String, required: true },
  image: { type: String, required: true },
  brand: { type: String, required: true },
  seller: { type: String, required: true },
  discount: { type: Number, required: true },
  mrp: { type: Number, required: true }
});

module.exports = mongoose.model('Product', productSchema);
