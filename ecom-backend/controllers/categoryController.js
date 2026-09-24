const Category = require('../models/Category');
const Product = require('../models/Products');

// Get product count for a category
exports.getCategoryProductCount = async (req, res) => {
  try {
    const { categoryName } = req.params;

    if (!categoryName) return res.status(400).json({ message: "Category name is required" });

    const productCount = await Product.countDocuments({ category: categoryName });

    res.json({ count: productCount });
  } catch (error) {
    console.error("Error fetching product count:", error);
    res.status(500).json({ message: error.message });
  }
};

// Categories with product counts and a sample image, in one query
exports.getCategorySummary = async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { status: 'ACTIVE' };
    const [categories, stats] = await Promise.all([
      Category.find(filter).lean(),
      Product.aggregate([
        { $sort: { _id: 1 } },
        { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: '$image' } } },
      ]),
    ]);
    const byName = new Map(stats.map((s) => [s._id, s]));
    res.json(categories.map((c) => ({ ...c, count: byName.get(c.name)?.count || 0, image: byName.get(c.name)?.image || null })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new category
exports.addCategory = async (req, res) => {
  try {
    const { name, status } = req.body;
    const newCategory = new Category({ name, status });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Category ID is required' });

    const previous = await Category.findById(id);
    if (!previous) return res.status(404).json({ message: 'Category not found' });

    const { name, status } = req.body;
    const updatedCategory = await Category.findByIdAndUpdate(id, { name, status }, {
      new: true,
      runValidators: true
    });

    if (name && name !== previous.name) {
      await Product.updateMany({ category: previous.name }, { category: name });
    }

    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Category ID is required' });

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const inUse = await Product.countDocuments({ category: category.name });
    if (inUse > 0) {
      return res.status(400).json({ message: `Move or delete the ${inUse} product(s) in this category first` });
    }

    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) return res.status(404).json({ message: 'Category not found' });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: error.message });
  }
};
