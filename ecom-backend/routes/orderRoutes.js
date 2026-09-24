const express = require('express');
const router = express.Router();
const { requireUser, requireAdmin } = require("../middleware/authMiddleware");
const orderController = require('../controllers/orderController');

// Admin
router.get('/', requireAdmin, orderController.getAllOrders);
router.put('/:id', requireAdmin, orderController.updateOrderStatus);
router.delete('/:id', requireAdmin, orderController.deleteOrder);

// Shopper
router.get('/my', requireUser, orderController.getMyOrders);
router.post('/', requireUser, orderController.createOrder);
router.patch('/:id/cancel', requireUser, orderController.cancelMyOrder);
router.post('/:id/return', requireUser, orderController.requestReturn);

// Owner or admin (checked in the controller)
router.get('/order/:id', orderController.getOrderById);
router.get('/:id/invoice', orderController.getInvoice);

module.exports = router;
