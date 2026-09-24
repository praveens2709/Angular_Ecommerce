const mongoose = require('mongoose');

// Only non-sensitive details are kept: never the full card number or CVV
const CardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardHolderName: { type: String, required: true },
  last4: { type: String, required: true, match: /^\d{4}$/ },
  expiryMonth: { type: String, required: true },
  expiryYear: { type: String, required: true },
  cardType: { type: String, enum: ['VISA', 'MasterCard', 'Discover', 'RuPay', 'Amex'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Card', CardSchema);
