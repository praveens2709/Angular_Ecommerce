const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { requireUser } = require('../middleware/authMiddleware');

// All routes act on the logged-in user's own cards
router.use(requireUser);
router.get('/', cardController.getUserCards);
router.post('/', cardController.addCard);
router.put('/:cardId', cardController.updateCard);
router.delete('/:cardId', cardController.deleteCard);

module.exports = router;
