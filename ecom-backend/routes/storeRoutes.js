const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { requireAdmin } = require('../middleware/authMiddleware');
const rateLimit = require('../utils/rateLimit');

const contactLimiter = rateLimit({ max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 5, windowMs: 60 * 60 * 1000, message: 'Too many messages. Please try again later.' });

router.get('/info', storeController.getStore);
router.get('/pincode/:pincode', storeController.getPincode);
router.post('/contact', contactLimiter, storeController.submitContact);
router.get('/messages', requireAdmin, storeController.listMessages);
router.patch('/messages/:id', requireAdmin, storeController.updateMessage);

module.exports = router;
