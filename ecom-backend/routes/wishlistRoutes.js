const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { requireUser } = require('../middleware/authMiddleware');

router.use(requireUser);
router.get('/', wishlistController.getWishlist);
router.post('/:productId', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;
