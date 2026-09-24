const mongoose = require('mongoose');
const Card = require('../models/Card');

const CARD_TYPES = ['VISA', 'MasterCard', 'Discover', 'RuPay', 'Amex'];

/** Luhn checksum: catches typos in card numbers */
const passesLuhn = (number) => {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
};

const validateExpiry = (month, year) => {
  if (!/^(0[1-9]|1[0-2])$/.test(month || '')) return 'Invalid expiry month';
  if (!/^\d{2}$/.test(year || '')) return 'Invalid expiry year';
  const now = new Date();
  const expiry = new Date(2000 + Number(year), Number(month), 1); // first day after expiry month
  if (expiry <= now) return 'This card has expired';
  return null;
};

// Logged-in user's saved cards (last 4 digits only)
exports.getUserCards = async (req, res) => {
  try {
    res.status(200).json(await Card.find({ userId: req.user._id }).sort({ createdAt: 1 }));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cards' });
  }
};

// The full number is validated, then discarded: only the last 4 digits are stored
exports.addCard = async (req, res) => {
  try {
    const { cardHolderName, expiryMonth, expiryYear, cardType } = req.body;
    const cardNumber = String(req.body.cardNumber || '').replace(/\s/g, '');

    if (!cardHolderName || !String(cardHolderName).trim()) return res.status(400).json({ message: 'Cardholder name is required' });
    if (!/^\d{13,19}$/.test(cardNumber) || !passesLuhn(cardNumber)) return res.status(400).json({ message: 'Invalid card number' });
    const expiryError = validateExpiry(expiryMonth, expiryYear);
    if (expiryError) return res.status(400).json({ message: expiryError });
    if (!CARD_TYPES.includes(cardType)) return res.status(400).json({ message: 'Card type is required' });

    const last4 = cardNumber.slice(-4);
    if (await Card.exists({ userId: req.user._id, last4, expiryMonth, expiryYear })) {
      return res.status(400).json({ message: 'This card is already saved' });
    }

    const card = await Card.create({
      userId: req.user._id,
      cardHolderName: String(cardHolderName).trim(),
      last4,
      expiryMonth,
      expiryYear,
      cardType,
    });
    res.status(201).json({ message: 'Card added successfully', card });
  } catch (error) {
    res.status(500).json({ message: 'Error adding card' });
  }
};

// Only the name and expiry can change; a different number means a different card
exports.updateCard = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.cardId)) return res.status(404).json({ message: 'Card not found' });
    const update = {};
    if (req.body.cardHolderName !== undefined) update.cardHolderName = String(req.body.cardHolderName).trim();
    if (req.body.expiryMonth !== undefined || req.body.expiryYear !== undefined) {
      const expiryError = validateExpiry(req.body.expiryMonth, req.body.expiryYear);
      if (expiryError) return res.status(400).json({ message: expiryError });
      update.expiryMonth = req.body.expiryMonth;
      update.expiryYear = req.body.expiryYear;
    }
    const updatedCard = await Card.findOneAndUpdate({ _id: req.params.cardId, userId: req.user._id }, update, { new: true });
    if (!updatedCard) return res.status(404).json({ message: 'Card not found' });
    res.status(200).json({ message: 'Card updated successfully', updatedCard });
  } catch (error) {
    res.status(500).json({ message: 'Error updating card' });
  }
};

// Delete one of the user's own cards
exports.deleteCard = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.cardId)) return res.status(404).json({ message: 'Card not found' });
    const deletedCard = await Card.findOneAndDelete({ _id: req.params.cardId, userId: req.user._id });
    if (!deletedCard) return res.status(404).json({ message: 'Card not found' });
    res.status(200).json({ message: 'Card deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting card' });
  }
};

exports.passesLuhn = passesLuhn;
