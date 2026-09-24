const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/', requireAdmin, dashboardController.getDashboardStats);

module.exports = router;
