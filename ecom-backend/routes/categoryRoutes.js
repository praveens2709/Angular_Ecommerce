const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

router.get('/count/:categoryName', categoryController.getCategoryProductCount);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.post("/", categoryController.addCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
