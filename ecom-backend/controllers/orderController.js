const Order = require('../models/Order');
const mongoose = require("mongoose");

// Get all orders (for admin panel)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('userId', 'fullName email');
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error });
  }
};

// Get a single order by orderId
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(orderId).populate("userId", "fullName email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Error fetching order", error });
  }
};

// Get user-specific orders (for frontend public)
exports.getOrdersByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const orders = await Order.find({ userId })
      .populate("userId", "fullName email");

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Error fetching user orders", error });
  }
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fullName, id } = req.user;

    if (!fullName) {
      return res.status(400).json({ message: "User fullName is missing" });
    }

    // Create separate order entries for each product
    const orders = await Promise.all(req.body.products.map(async (product) => {
      const newOrder = new Order({
        userId: id,
        customerName: fullName,
        status: "Pending",
        products: [product], // Each order contains only one product
        totalAmount: product.price * product.quantity,
      });
      return await newOrder.save();
    }));

    res.status(201).json(orders);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Error creating order", error });
  }
};

// Update an existing order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: req.body.status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Error updating order", error });
  }
};

// Delete an existing order
exports.deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Error deleting order", error });
  }
};
