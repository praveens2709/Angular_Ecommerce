const express = require("express");
const router = express.Router();
const addressController = require("../controllers/addressController");

// Routes for managing addresses
router.get("/:userId", addressController.getAddresses);
router.post("/", addressController.addAddress);
router.put("/:addressId", addressController.updateAddress);
router.delete("/:addressId", addressController.deleteAddress);

module.exports = router;
