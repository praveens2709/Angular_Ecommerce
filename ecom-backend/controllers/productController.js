const Product = require('../models/Products');

// Function to calculate discount and MRP
const calculateDiscountAndMRP = (price) => {
  let discount = 0;
  if (price < 500) {
    discount = 10;
  } else if (price >= 500 && price < 1000) {
    discount = 20;
  } else {
    discount = 40;
  }
  const mrp = Math.round(price / (1 - discount / 100));
  return { discount, mrp };
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add new product
exports.addProduct = async (req, res) => {
  try {
    let { name, category, price, inventoryStatus, description, image, brand, seller } = req.body;
    const { discount, mrp } = calculateDiscountAndMRP(price);

    const newProduct = new Product({
      name,
      category,
      price,
      inventoryStatus,
      description,
      image,
      brand,
      seller,
      discount,
      mrp,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Product ID is required' });

    let { price } = req.body;
    const { discount, mrp } = calculateDiscountAndMRP(price);

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...req.body, discount, mrp },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Product ID is required' });

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
};
