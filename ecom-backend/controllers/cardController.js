const Card = require('../models/Card');

// Get all cards for a user
exports.getUserCards = async (req, res) => {
  try {
    const { userId } = req.params;
    const cards = await Card.find({ userId });
    res.status(200).json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Error fetching cards' });
  }
};

// Add a new card with validation
exports.addCard = async (req, res) => {
  try {
    const { userId, cardHolderName, cardNumber, expiryMonth, expiryYear, cardType } = req.body;

    if (!userId) return res.status(400).json({ error: 'User ID is required' });
    if (!cardHolderName) return res.status(400).json({ error: 'Cardholder name is required' });
    if (!cardNumber || !/^\d{16}$/.test(cardNumber)) return res.status(400).json({ error: 'Invalid card number' });
    if (!expiryMonth || !/^(0[1-9]|1[0-2])$/.test(expiryMonth)) return res.status(400).json({ error: 'Invalid expiry month' });
    if (!expiryYear || !/^([2-9][0-9])$/.test(expiryYear)) return res.status(400).json({ error: 'Invalid expiry year' });
    if (!cardType) return res.status(400).json({ error: 'Card type is required' });

    const card = new Card(req.body);
    await card.save();
    res.status(201).json({ message: 'Card added successfully', card });
  } catch (error) {
    console.error('Error adding card:', error);
    res.status(500).json({ error: 'Error adding card' });
  }
};

// Update a card
exports.updateCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const updatedCard = await Card.findByIdAndUpdate(cardId, req.body, { new: true });
    if (!updatedCard) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.status(200).json({ message: 'Card updated successfully', updatedCard });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Error updating card' });
  }
};

// Delete a card
exports.deleteCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const deletedCard = await Card.findByIdAndDelete(cardId);
    if (!deletedCard) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.status(200).json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Error deleting card' });
  }
};
