const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { requireUser, requireAdmin } = require('../middleware/authMiddleware');

router.get('/active', couponController.getActiveCoupons);
router.post('/validate', requireUser, couponController.validateCoupon);

router.get('/', requireAdmin, couponController.listCoupons);
router.post('/', requireAdmin, couponController.createCoupon);
router.put('/:id', requireAdmin, couponController.updateCoupon);
router.delete('/:id', requireAdmin, couponController.deleteCoupon);

module.exports = router;
