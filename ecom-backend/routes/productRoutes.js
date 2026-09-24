const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAdmin, requireUser } = require('../middleware/authMiddleware');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/variants', productController.getVariants);
router.get('/:id/reviews', productController.getReviews);
router.post('/:id/reviews', requireUser, productController.upsertReview);
router.delete('/:id/reviews/mine', requireUser, productController.deleteMyReview);
router.post('/', requireAdmin, productController.addProduct);
router.put('/:id', requireAdmin, productController.updateProduct);
router.delete('/:id', requireAdmin, productController.deleteProduct);

module.exports = router;
