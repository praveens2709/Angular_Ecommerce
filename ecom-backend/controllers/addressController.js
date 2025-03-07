const Address = require("../models/Address");

// Get all addresses for a user
exports.getAddresses = async (req, res) => {
  try {
    const { userId } = req.params;
    const addresses = await Address.find({ userId });
    res.status(200).json(addresses);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ error: "Error fetching addresses" });
  }
};

// Add a new address
exports.addAddress = async (req, res) => {
  try {
    const { userId, fullName, street, city, state, postalCode, mobile, type } = req.body;
    // Validate required fields
    if (!userId || !fullName || !street || !city || !state || !postalCode || !mobile || !type) {
      return res.status(400).json({ error: "All fields are required." });
    }
    // Check for duplicate address
    const existingAddress = await Address.findOne({ userId, street, city, state, postalCode, mobile });
    if (existingAddress) {
      return res.status(400).json({ error: "This address already exists." });
    }
    const newAddress = new Address(req.body);
    await newAddress.save();
    res.status(201).json(newAddress);
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ error: "Error adding address" });
  }
};

// Update an address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const updatedAddress = await Address.findByIdAndUpdate(addressId, req.body, { new: true });
    if (!updatedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.status(200).json(updatedAddress);
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ error: "Error updating address" });
  }
};

// Delete an address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const deletedAddress = await Address.findByIdAndDelete(addressId);
    if (!deletedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ error: "Error deleting address" });
  }
};
