const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Products");
const { SIZES, isStockTracked } = require("../utils/catalog");

const MAX_QTY = 10;

/** How many of this product/size can go in the bag */
const availableFor = (product, size) =>
  isStockTracked(product) ? Math.min(MAX_QTY, Number(product.stock?.[size]) || 0) : MAX_QTY;

// Get all cart items for a user, refreshed with current product prices and stock
exports.getCart = async (req, res) => {
  try {
    const cartItems = await Cart.find({ userId: req.user._id });
    const products = await Product.find({ _id: { $in: cartItems.map((c) => c.productId) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const result = [];
    for (const item of cartItems) {
      const product = byId.get(String(item.productId));
      if (!product) {
        // Product was deleted: drop it from the bag
        await Cart.deleteOne({ _id: item._id });
        continue;
      }
      const obj = item.toObject();
      obj.basePrice = product.price;
      obj.baseMRP = product.mrp;
      obj.price = product.price * item.quantity;
      obj.mrp = product.mrp * item.quantity;
      obj.discount = product.discount;
      obj.inventoryStatus = product.inventoryStatus;
      obj.image = product.image;
      obj.maxQuantity = availableFor(product, item.size);
      result.push(obj);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cart items" });
  }
};

// Add a product (by id) to the cart; details always come from the product record
exports.addToCart = async (req, res) => {
  try {
    const productId = req.body._id || req.body.productId;
    const size = req.body.size ? String(req.body.size) : null;

    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: "Invalid Product ID" });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (size && !SIZES.includes(size)) return res.status(400).json({ message: "Invalid size" });
    if (isStockTracked(product) && !size) return res.status(400).json({ message: "Please choose a size" });
    if (product.inventoryStatus === "OUTOFSTOCK") return res.status(409).json({ message: `${product.name} is out of stock` });

    const available = availableFor(product, size);
    let cartItem = await Cart.findOne({ userId: req.user._id, productId, size });
    const nextQty = (cartItem?.quantity || 0) + 1;
    if (nextQty > available) {
      return res.status(409).json({
        message: available === 0 ? `${product.name}${size ? ` (${size})` : ""} is out of stock` : `Only ${available} available`,
      });
    }

    const details = {
      name: product.name,
      category: product.category,
      inventoryStatus: product.inventoryStatus,
      description: product.description,
      image: product.image,
      brand: product.brand,
      seller: product.seller,
      discount: product.discount,
      basePrice: product.price,
      baseMRP: product.mrp,
    };

    if (cartItem) {
      Object.assign(cartItem, details, { quantity: nextQty, price: product.price * nextQty, mrp: product.mrp * nextQty });
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        ...details,
        userId: req.user._id,
        productId,
        size,
        quantity: 1,
        price: product.price,
        mrp: product.mrp,
        isSelected: true,
      });
    }
    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to add item to cart" });
  }
};

// Update quantity / selection of one of the user's own cart items
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity, isSelected } = req.body;
    const cartItemId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(cartItemId)) return res.status(400).json({ message: "Invalid Cart Item ID" });
    const cartItem = await Cart.findOne({ _id: cartItemId, userId: req.user._id });
    if (!cartItem) return res.status(404).json({ message: "Item not found" });

    if (quantity !== undefined) {
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a positive integer" });
      }
      const product = await Product.findById(cartItem.productId);
      const available = product ? availableFor(product, cartItem.size) : 0;
      if (quantity > available) return res.status(409).json({ message: `Only ${available} available` });

      cartItem.quantity = quantity;
      cartItem.basePrice = product.price;
      cartItem.baseMRP = product.mrp;
      cartItem.price = product.price * quantity;
      cartItem.mrp = product.mrp * quantity;
    }
    if (isSelected !== undefined) cartItem.isSelected = !!isSelected;

    await cartItem.save();
    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ message: "Failed to update cart item" });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid Cart Item ID" });
    await Cart.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove item" });
  }
};

// Remove all items from the cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.deleteMany({ userId: req.user._id });
    res.json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear cart" });
  }
};
