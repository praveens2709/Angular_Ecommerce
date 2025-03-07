const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const orderController = require('../controllers/orderController');

// Get all orders (Admin)
router.get('/', orderController.getAllOrders);

// Get a single order by orderId
router.get('/order/:id', orderController.getOrderById);

// Get orders for a specific user (Public)
router.get('/:userId', orderController.getOrdersByUserId);

// Create a new order
router.post('/',authMiddleware, orderController.createOrder);

// Update order status
router.put('/:id', orderController.updateOrderStatus);

// Delete an order
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
