const Product = require('../models/Products');
const Category = require('../models/Category');

let User, Order;
try {
  User = require('../models/User');
  Order = require('../models/Order');
} catch (error) {
  console.warn('User or Order model not found, skipping them.');
}

exports.getDashboardStats = async (req, res) => {
  try {
    const [products, categories, users, orders] = await Promise.all([
      Product ? Product.find() : Promise.resolve([]),
      Category ? Category.find() : Promise.resolve([]),
      User ? User.find() : Promise.resolve([]),
      Order ? Order.find() : Promise.resolve([]),
    ]);

    const dashboardData = {
      products: products.length > 0 ? {
        total: products.length,
        instock: products.filter(p => p.inventoryStatus === 'INSTOCK').length,
        lowstock: products.filter(p => p.inventoryStatus === 'LOWSTOCK').length,
        outOfStock: products.filter(p => p.inventoryStatus === 'OUTOFSTOCK').length,
      } : { total: 0, instock: 0, lowstock: 0, outOfStock: 0 }, // Default values

      categories: categories.length > 0 ? {
        total: categories.length,
        active: categories.filter(c => c.status === 'ACTIVE').length,
        inactive: categories.filter(c => c.status === 'INACTIVE').length,
      } : { total: 0, active: 0, inactive: 0 }, // Default values

      users: users.length > 0 ? {
        total: users.length,
        active: users.filter(u => u.active).length,
        inactive: users.filter(u => !u.active).length,
      } : { total: 0, active: 0, inactive: 0 }, // Default values

      orders: orders.length > 0 ? {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        completed: orders.filter(o => o.status === 'COMPLETED').length,
      } : { total: 0, pending: 0, completed: 0 }, // Default values
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
