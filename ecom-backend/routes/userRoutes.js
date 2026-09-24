const express = require("express");
const userController = require("../controllers/userController");
const { requireAdmin, requireSelfOrAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAdmin, userController.getUsers);
router.get("/:id", requireSelfOrAdmin("id"), userController.getUserById);
router.post("/", requireAdmin, userController.addUser);
router.put("/:id", requireSelfOrAdmin("id"), userController.editUser);
router.delete("/:id", requireSelfOrAdmin("id"), userController.deleteUser);

module.exports = router;
