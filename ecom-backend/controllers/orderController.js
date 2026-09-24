const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Products');
const Address = require('../models/Address');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const { decodeToken } = require('../middleware/authMiddleware');
const Admin = require('../models/Admin');
const { SIZES, isStockTracked, deriveInventoryStatus } = require('../utils/catalog');
const { parsePaging, escapeRegex } = require('../utils/pagination');
const emails = require('../utils/emails');
const Counter = require('../models/Counter');
const { writeInvoice, financialYear } = require('../utils/invoice');

const MAX_QTY_PER_ITEM = 10;
const RETURN_WINDOW_DAYS = 7;
const PAYMENT_METHODS = ['COD', 'UPI', 'CARD'];

/** Which statuses an admin may move an order to */
const ADMIN_TRANSITIONS = {
  Pending: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered', 'Cancelled'],
  'Return Requested': ['Returned', 'Return Rejected'],
};

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sendError = (res, error, fallback) => {
  if (error instanceof OrderError) return res.status(error.status).json({ message: error.message });
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
};

// ---------- Stock ----------

const syncInventoryStatus = async (product) => {
  if (!product || !isStockTracked(product)) return;
  const status = deriveInventoryStatus(product.stock);
  if (product.inventoryStatus !== status) {
    await Product.updateOne({ _id: product._id }, { inventoryStatus: status });
  }
};

/** Atomically take `quantity` of `size`; returns false when there isn't enough */
const reserveStock = async (productId, size, quantity) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, [`stock.${size}`]: { $gte: quantity } },
    { $inc: { [`stock.${size}`]: -quantity } },
    { new: true }
  );
  if (!product) return false;
  await syncInventoryStatus(product);
  return true;
};

const releaseStock = async (productId, size, quantity) => {
  const product = await Product.findById(productId);
  if (!product || !isStockTracked(product) || !size) return;
  const updated = await Product.findByIdAndUpdate(
    productId,
    { $inc: { [`stock.${size}`]: quantity } },
    { new: true }
  );
  await syncInventoryStatus(updated);
};

const restockOrder = (order) =>
  Promise.all(order.products.map((p) => releaseStock(p.productId, p.size, p.quantity)));

// ---------- Helpers ----------

const pushStatus = (order, status, note) => {
  order.status = status;
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status, at: new Date(), note });
  if (status === 'Delivered') order.deliveredAt = new Date();
};

const notifyStatus = async (order) => {
  const populated = order.populated?.('userId') ? order : await order.populate('userId', 'fullName email');
  const user = populated.userId;
  if (user?.email) emails.orderStatusChanged(user.email, user.fullName, order);
};

/** Merge duplicate product+size lines and validate quantities */
const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) throw new OrderError(400, 'Your order has no items');
  if (items.length > 20) throw new OrderError(400, 'Too many items in one order');

  const merged = new Map();
  for (const item of items) {
    const quantity = Number(item?.quantity);
    if (!mongoose.isValidObjectId(item?.productId)) throw new OrderError(400, 'Invalid product in order');
    if (!Number.isInteger(quantity) || quantity < 1) throw new OrderError(400, 'Invalid quantity');
    const size = item.size ? String(item.size) : null;
    if (size && !SIZES.includes(size)) throw new OrderError(400, `Unknown size ${size}`);

    const key = `${item.productId}:${size}`;
    const existing = merged.get(key);
    merged.set(key, { productId: String(item.productId), size, quantity: (existing?.quantity || 0) + quantity });
  }
  for (const item of merged.values()) {
    if (item.quantity > MAX_QTY_PER_ITEM) throw new OrderError(400, `You can order up to ${MAX_QTY_PER_ITEM} of each item`);
  }
  return [...merged.values()];
};

/** Split a coupon discount across order lines in proportion to their value */
const splitDiscount = (lineTotals, discount) => {
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  let remaining = discount;
  return lineTotals.map((line, index) => {
    if (index === lineTotals.length - 1) return remaining;
    const share = subtotal ? Math.round((discount * line) / subtotal) : 0;
    remaining -= share;
    return share;
  });
};

const canViewOrder = async (req, order) => {
  const decoded = decodeToken(req);
  if (!decoded) return false;
  if (decoded.role === 'admin') return !!(await Admin.exists({ _id: decoded.id }));
  return decoded.role === 'user' && String(order.userId?._id || order.userId) === String(decoded.id);
};

// ---------- Handlers ----------

// Admin: all orders (paged when ?page= is given; filter by ?status= and ?q=)
exports.getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    if (req.query.q) {
      const q = String(req.query.q).trim();
      filter.$or = [{ customerName: new RegExp(escapeRegex(q), 'i') }];
      if (mongoose.isValidObjectId(q)) filter.$or.push({ _id: q });
    }
    const query = () => Order.find(filter).sort({ orderDate: -1 }).populate('userId', 'fullName email');
    const paging = parsePaging(req.query, { defaultLimit: 10 });
    if (!paging) return res.json(await query());

    const [items, total] = await Promise.all([
      query().skip(paging.skip).limit(paging.limit),
      Order.countDocuments(filter),
    ]);
    res.json({ items, total, page: paging.page, limit: paging.limit });
  } catch (error) {
    sendError(res, error, 'Error fetching orders');
  }
};

// Owner or admin
exports.getOrderById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findById(req.params.id).populate('userId', 'fullName email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!(await canViewOrder(req, order))) return res.status(403).json({ message: 'You can only view your own orders' });
    res.json(order);
  } catch (error) {
    sendError(res, error, 'Error fetching order');
  }
};

// Logged-in shopper's orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    sendError(res, error, 'Error fetching your orders');
  }
};

// Prices, stock and coupon are all decided here, never trusted from the browser
exports.createOrder = async (req, res) => {
  const reserved = [];
  try {
    const items = normalizeItems(req.body.items);
    const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'COD';

    if (!mongoose.isValidObjectId(req.body.addressId)) throw new OrderError(400, 'Please select a delivery address');
    const address = await Address.findOne({ _id: req.body.addressId, userId: req.user._id });
    if (!address) throw new OrderError(400, 'Please select a delivery address');

    const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    // Validate every line before touching stock
    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) throw new OrderError(400, 'One of the items is no longer available');
      if (isStockTracked(product)) {
        if (!item.size) throw new OrderError(400, `Please choose a size for ${product.name}`);
      } else if (product.inventoryStatus === 'OUTOFSTOCK') {
        throw new OrderError(409, `${product.name} is out of stock`);
      }
    }

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!isStockTracked(product)) continue;
      if (!(await reserveStock(product._id, item.size, item.quantity))) {
        const left = Number(product.stock?.[item.size]) || 0;
        throw new OrderError(
          409,
          left > 0
            ? `Only ${left} left of ${product.name} (${item.size})`
            : `${product.name} (${item.size}) is out of stock`
        );
      }
      reserved.push(item);
    }

    const lineTotals = items.map((item) => byId.get(item.productId).price * item.quantity);
    const subtotal = lineTotals.reduce((a, b) => a + b, 0);

    let couponCode;
    let discount = 0;
    if (req.body.couponCode) {
      const coupon = await Coupon.findOne({ code: String(req.body.couponCode).trim().toUpperCase() });
      if (!coupon) throw new OrderError(400, 'Invalid coupon code');
      const result = coupon.evaluate(subtotal);
      if (result.error) throw new OrderError(400, result.error);
      couponCode = coupon.code;
      discount = result.discount;
    }
    const shares = splitDiscount(lineTotals, discount);

    const groupId = crypto.randomBytes(8).toString('hex');
    const now = new Date();
    const orders = await Order.insertMany(
      items.map((item, index) => {
        const product = byId.get(item.productId);
        return {
          userId: req.user._id,
          customerName: req.user.fullName,
          groupId,
          orderDate: now,
          status: 'Pending',
          statusHistory: [{ status: 'Pending', at: now }],
          paymentMethod,
          paymentId: req.body.paymentId,
          couponCode,
          subtotal: lineTotals[index],
          discount: shares[index],
          totalAmount: lineTotals[index] - shares[index],
          shippingAddress: {
            fullName: address.fullName,
            street: address.street,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            mobile: address.mobile,
          },
          products: [
            {
              productId: product._id,
              productName: product.name,
              storeName: product.brand,
              size: item.size || undefined,
              quantity: item.quantity,
              price: product.price,
              image: product.image,
            },
          ],
        };
      })
    );

    // Ordered lines leave the bag
    await Cart.deleteMany({
      userId: req.user._id,
      $or: items.map((item) => ({ productId: item.productId, size: item.size || null })),
    });

    emails.orderPlaced(req.user, orders);
    res.status(201).json(orders);
  } catch (error) {
    await Promise.all(reserved.map((item) => releaseStock(item.productId, item.size, item.quantity)));
    sendError(res, error, 'Error creating order');
  }
};

// Admin: move an order along its lifecycle
exports.updateOrderStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const next = req.body.status;
    const allowed = ADMIN_TRANSITIONS[order.status] || [];
    if (!allowed.includes(next)) {
      return res.status(400).json({ message: `Can't change an order from ${order.status} to ${next}` });
    }

    let replacement;
    if (next === 'Returned' && order.returnRequest?.type === 'Exchange') {
      replacement = await createExchangeOrder(order);
    }
    if (next === 'Cancelled' || next === 'Returned') await restockOrder(order);
    if (order.returnRequest && (next === 'Returned' || next === 'Return Rejected')) {
      order.returnRequest.resolvedAt = new Date();
    }

    pushStatus(order, next, replacement ? `Exchange order ${replacement._id} created` : req.body.note);
    await order.save();
    notifyStatus(order);

    res.status(200).json(order);
  } catch (error) {
    sendError(res, error, 'Error updating order');
  }
};

/** Approved exchange: ship the new size as a free replacement order */
const createExchangeOrder = async (order) => {
  const line = order.products[0];
  const size = order.returnRequest.exchangeSize;
  const product = await Product.findById(line.productId);
  if (!product) throw new OrderError(409, 'The product no longer exists, so it can only be returned');

  if (isStockTracked(product) && !(await reserveStock(product._id, size, line.quantity))) {
    throw new OrderError(409, `Size ${size} is out of stock; approve it as a return or wait for restock`);
  }
  const now = new Date();
  return Order.create({
    userId: order.userId,
    customerName: order.customerName,
    groupId: order.groupId,
    orderDate: now,
    status: 'Pending',
    statusHistory: [{ status: 'Pending', at: now, note: `Exchange for order ${order._id}` }],
    paymentMethod: order.paymentMethod,
    subtotal: 0,
    discount: 0,
    totalAmount: 0,
    shippingAddress: order.shippingAddress,
    products: [{ ...line.toObject(), _id: undefined, size, price: 0 }],
  });
};

// Shopper cancels their own order before it ships
exports.cancelMyOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Only orders that haven\'t shipped yet can be cancelled' });
    }

    await restockOrder(order);
    pushStatus(order, 'Cancelled', 'Cancelled by customer');
    await order.save();
    notifyStatus(order);
    res.json(order);
  } catch (error) {
    sendError(res, error, 'Error cancelling order');
  }
};

// Shopper asks to return or exchange a delivered item
exports.requestReturn = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'Delivered') return res.status(400).json({ message: 'Only delivered orders can be returned' });

    const deliveredAt = order.deliveredAt || order.orderDate;
    const deadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > deadline) return res.status(400).json({ message: `The ${RETURN_WINDOW_DAYS}-day return window has closed` });

    const type = req.body.type === 'Exchange' ? 'Exchange' : 'Return';
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ message: 'Please tell us why you are returning this item' });

    let exchangeSize;
    if (type === 'Exchange') {
      exchangeSize = String(req.body.exchangeSize || '');
      if (!SIZES.includes(exchangeSize)) return res.status(400).json({ message: 'Choose the size you want instead' });
      if (exchangeSize === order.products[0].size) return res.status(400).json({ message: 'Choose a different size' });
    }

    order.returnRequest = { type, reason, exchangeSize, requestedAt: new Date() };
    pushStatus(order, 'Return Requested', `${type}: ${reason}`);
    await order.save();
    notifyStatus(order);
    res.json(order);
  } catch (error) {
    sendError(res, error, 'Error requesting return');
  }
};

// Admin: delete an order (restocks it if it was still active)
exports.deleteOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'Order not found' });
    if (['Pending', 'Shipped'].includes(deletedOrder.status)) await restockOrder(deletedOrder);
    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    sendError(res, error, 'Error deleting order');
  }
};

// Owner or admin: GST invoice (PDF) for the checkout this order belongs to
exports.getInvoice = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!(await canViewOrder(req, order))) return res.status(403).json({ message: 'You can only view your own orders' });

    // Every item bought together goes on one invoice; cancelled items are left off
    const group = order.groupId
      ? await Order.find({ groupId: order.groupId, userId: order.userId }).sort({ _id: 1 })
      : [order];
    const billable = group.filter((o) => o.status !== 'Cancelled' && o.totalAmount > 0);
    if (billable.length === 0) return res.status(400).json({ message: 'There is nothing to invoice for this order' });

    let invoiceNumber = billable.find((o) => o.invoiceNumber)?.invoiceNumber;
    let invoiceDate = billable.find((o) => o.invoiceDate)?.invoiceDate;
    if (!invoiceNumber) {
      invoiceDate = new Date();
      const fy = financialYear(invoiceDate);
      const seq = await Counter.next(`invoice-${fy}`);
      invoiceNumber = `${(process.env.INVOICE_PREFIX || 'DS').toUpperCase()}/${fy}/${String(seq).padStart(5, '0')}`;
      await Order.updateMany({ _id: { $in: group.map((o) => o._id) } }, { invoiceNumber, invoiceDate });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber.replace(/\//g, '-')}.pdf"`);
    writeInvoice(res, { orders: billable, invoiceNumber, invoiceDate });
  } catch (error) {
    sendError(res, error, 'Could not create invoice');
  }
};

exports.RETURN_WINDOW_DAYS = RETURN_WINDOW_DAYS;
