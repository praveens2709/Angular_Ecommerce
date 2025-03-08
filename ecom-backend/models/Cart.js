const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  inventoryStatus: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  brand: { type: String, required: true },
  seller: { type: String, required: true },
  discount: { type: Number, required: true },
  mrp: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  basePrice: { type: Number, required: true },
  baseMRP: { type: Number, required: true },
  isSelected: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);
