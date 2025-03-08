const mongoose = require("mongoose");
const Cart = require("../models/Cart");

// Get all cart items for a user
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItems = await Cart.find({ userId });
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch cart items", error });
    }
};

// Add a new item to the cart
exports.addToCart = async (req, res) => {
    try {
        const { _id: productId, basePrice, baseMRP, ...productData } = req.body;
        const userId = req.user?.id;

        if (!userId) return res.status(400).json({ message: "User authentication required" });
        if (!productId) return res.status(400).json({ message: "Product ID is required" });
        if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: "Invalid Product ID" });

        const cartItem = await Cart.findOne({ userId, productId });

        if (cartItem) {
            cartItem.quantity++;
            cartItem.price = cartItem.basePrice * cartItem.quantity;
            cartItem.mrp = cartItem.baseMRP * cartItem.quantity;
        } else {
            await new Cart({
                userId,
                productId,
                basePrice: basePrice ?? productData.price,
                baseMRP: baseMRP ?? productData.mrp,
                quantity: 1,
                isSelected: true,
                ...productData
            }).save();
        }

        res.json(cartItem || { message: "Item added to cart" });

    } catch (error) {
        res.status(500).json({ message: "Failed to add item to cart", error: error.message });
    }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity, isSelected } = req.body;
        const cartItemId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
            return res.status(400).json({ message: "Invalid Cart Item ID" });
        }

        const cartItem = await Cart.findById(cartItemId);

        if (!cartItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        if (quantity !== undefined) {
            cartItem.quantity = quantity;
            cartItem.price = cartItem.basePrice * quantity;
            cartItem.mrp = cartItem.baseMRP * quantity;
        }

        if (isSelected !== undefined) {
            cartItem.isSelected = isSelected;
        }

        await cartItem.save();
        res.json(cartItem);
    } catch (error) {
        res.status(500).json({ message: "Failed to update cart item", error });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const cartItemId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
            return res.status(400).json({ message: "Invalid Cart Item ID" });
        }

        await Cart.findByIdAndDelete(cartItemId);
        res.json({ message: "Item removed from cart" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove item", error });
    }
};

// Remove all items from the cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id;
        await Cart.deleteMany({ userId });
        res.json({ message: "Cart cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear cart", error });
    }
};
