const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, maxlength: 200 },
  subject: { type: String, trim: true, maxlength: 150 },
  orderId: { type: String, trim: true, maxlength: 40 },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ['New', 'Resolved'], default: 'New' },
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
