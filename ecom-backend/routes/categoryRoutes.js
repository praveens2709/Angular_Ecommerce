const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { requireAdmin } = require("../middleware/authMiddleware");

router.get("/summary", categoryController.getCategorySummary);
router.get('/count/:categoryName', categoryController.getCategoryProductCount);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.post("/", requireAdmin, categoryController.addCategory);
router.put("/:id", requireAdmin, categoryController.updateCategory);
router.delete("/:id", requireAdmin, categoryController.deleteCategory);

module.exports = router;
