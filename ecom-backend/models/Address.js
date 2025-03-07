const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, default: 'India' },
  mobile: { type: String, required: true },
  type: { type: String, enum: ['Home', 'Work'], default: 'Home' },
}, { timestamps: true });

module.exports = mongoose.model('Address', AddressSchema);
