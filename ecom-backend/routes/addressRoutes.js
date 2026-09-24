const express = require("express");
const router = express.Router();
const addressController = require("../controllers/addressController");
const { requireUser } = require("../middleware/authMiddleware");

// All routes act on the logged-in user's own addresses
router.use(requireUser);
router.get("/", addressController.getAddresses);
router.post("/", addressController.addAddress);
router.put("/:addressId", addressController.updateAddress);
router.delete("/:addressId", addressController.deleteAddress);

module.exports = router;
