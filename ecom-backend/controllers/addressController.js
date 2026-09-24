const mongoose = require("mongoose");
const Address = require("../models/Address");
const { lookupPincode } = require("../utils/pincode");

const FIELDS = ["fullName", "street", "city", "state", "postalCode", "mobile", "type", "country"];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Logged-in user's addresses
exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching addresses" });
  }
};

// Add a new address
exports.addAddress = async (req, res) => {
  try {
    const data = pick(req.body);
    const required = ["fullName", "street", "city", "state", "postalCode", "mobile", "type"];
    if (required.some((f) => !data[f])) return res.status(400).json({ message: "All fields are required." });
    if (!/^\d{6}$/.test(String(data.postalCode))) return res.status(400).json({ message: "Pincode must be 6 digits" });
    if (!/^\d{10}$/.test(String(data.mobile))) return res.status(400).json({ message: "Mobile number must be 10 digits" });
    if ((await lookupPincode(String(data.postalCode))).valid === false) {
      return res.status(400).json({ message: "We couldn't find this pincode. Please check it." });
    }

    const { street, city, state, postalCode, mobile } = data;
    if (await Address.findOne({ userId: req.user._id, street, city, state, postalCode, mobile })) {
      return res.status(400).json({ message: "This address already exists." });
    }
    const newAddress = await Address.create({ ...data, userId: req.user._id });
    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: "Error adding address" });
  }
};

// Update one of the user's own addresses
exports.updateAddress = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.addressId)) return res.status(404).json({ message: "Address not found" });
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: req.params.addressId, userId: req.user._id },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!updatedAddress) return res.status(404).json({ message: "Address not found" });
    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: "Error updating address" });
  }
};

// Delete one of the user's own addresses
exports.deleteAddress = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.addressId)) return res.status(404).json({ message: "Address not found" });
    const deletedAddress = await Address.findOneAndDelete({ _id: req.params.addressId, userId: req.user._id });
    if (!deletedAddress) return res.status(404).json({ message: "Address not found" });
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting address" });
  }
};
