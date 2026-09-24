const mongoose = require('mongoose');

const STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Returned', 'Return Rejected'];

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  // Items checked out together share a groupId (one confirmation email)
  groupId: { type: String, index: true },
  orderDate: { type: Date, default: Date.now },
  subtotal: { type: Number },
  couponCode: { type: String },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: STATUSES, default: 'Pending' },
  statusHistory: [
    {
      _id: false,
      status: { type: String, enum: STATUSES },
      at: { type: Date, default: Date.now },
      note: String,
    },
  ],
  deliveredAt: { type: Date },
  returnRequest: {
    type: { type: String, enum: ['Return', 'Exchange'] },
    reason: String,
    exchangeSize: String,
    requestedAt: Date,
    resolvedAt: Date,
  },
  invoiceNumber: { type: String },
  invoiceDate: { type: Date },
  paymentMethod: { type: String, default: 'COD' },
  paymentId: { type: String },
  shippingAddress: {
    fullName: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    mobile: String,
  },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      productName: { type: String, required: true },
      storeName: { type: String, required: true },
      size: { type: String },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      image: { type: String }
    }
  ]
});

module.exports = mongoose.model('Order', OrderSchema);
module.exports.STATUSES = STATUSES;
