const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardHolderName: { type: String, required: true },
  cardNumber: { type: String, required: true },
  expiryMonth: { type: String, required: true },
  expiryYear: { type: String, required: true },
  cardType: { type: String, enum: ['VISA', 'MasterCard', 'Discover'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);
