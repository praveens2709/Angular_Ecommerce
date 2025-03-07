const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

router.get('/:userId', cardController.getUserCards);
router.post('/', cardController.addCard);
router.put('/:cardId', cardController.updateCard);
router.delete('/:cardId', cardController.deleteCard);

module.exports = router;
