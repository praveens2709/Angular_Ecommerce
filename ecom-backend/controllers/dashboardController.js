const Product = require('../models/Products');
const Category = require('../models/Category');
const User = require('../models/User');
const Order = require('../models/Order');
const { SIZES } = require('../utils/catalog');

// Orders that count as revenue
const REVENUE_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Return Requested', 'Return Rejected'];
// An approved exchange ends as "Returned" but the sale stands (the replacement is free)
const IS_REVENUE = { $or: [{ status: { $in: REVENUE_STATUSES } }, { status: 'Returned', 'returnRequest.type': 'Exchange' }] };
const DAYS = 14;
// Day buckets follow the shop's timezone (default: the server's), not UTC
const TIMEZONE = () => process.env.SHOP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const dayKey = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

exports.getDashboardStats = async (req, res) => {
  try {
    // A little over 14 days back; buckets outside the window are simply ignored
    const since = new Date(Date.now() - (DAYS + 1) * 24 * 60 * 60 * 1000);

    const [productStats, categoryStats, userStats, statusCounts, revenue, daily, topProducts, lowStock] = await Promise.all([
      Product.aggregate([{ $group: { _id: '$inventoryStatus', count: { $sum: 1 } } }]),
      Category.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$active', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: IS_REVENUE },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { orderDate: { $gte: since }, ...IS_REVENUE } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate', timezone: TIMEZONE() } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: IS_REVENUE },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.productId',
            name: { $first: '$products.productName' },
            image: { $first: '$products.image' },
            quantity: { $sum: '$products.quantity' },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),
      Product.find({ stock: { $exists: true } }).select('name image stock inventoryStatus').lean(),
    ]);

    const count = (rows, key) => rows.find((r) => r._id === key)?.count || 0;
    const sum = (rows) => rows.reduce((a, r) => a + r.count, 0);

    // Fill in days with no orders so the chart has a continuous axis
    const byDay = new Map(daily.map((d) => [d._id, d]));
    const series = Array.from({ length: DAYS }, (_, i) => {
      const key = dayKey(new Date(Date.now() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000));
      return { date: key, revenue: byDay.get(key)?.revenue || 0, orders: byDay.get(key)?.orders || 0 };
    });

    const lowStockSizes = lowStock
      .map((p) => ({
        _id: p._id,
        name: p.name,
        image: p.image,
        sizes: SIZES.filter((s) => typeof p.stock?.[s] === 'number' && p.stock[s] <= 5).map((s) => ({ size: s, left: p.stock[s] })),
      }))
      .filter((p) => p.sizes.length > 0)
      .slice(0, 8);

    res.json({
      products: {
        total: sum(productStats),
        instock: count(productStats, 'INSTOCK'),
        lowstock: count(productStats, 'LOWSTOCK'),
        outOfStock: count(productStats, 'OUTOFSTOCK'),
      },
      categories: {
        total: sum(categoryStats),
        active: count(categoryStats, 'ACTIVE'),
        inactive: count(categoryStats, 'INACTIVE'),
      },
      users: {
        total: sum(userStats),
        active: userStats.filter((r) => r._id !== false).reduce((a, r) => a + r.count, 0),
        inactive: count(userStats, false),
      },
      orders: {
        total: sum(statusCounts),
        pending: count(statusCounts, 'Pending'),
        completed: count(statusCounts, 'Delivered'),
        byStatus: Object.fromEntries(statusCounts.map((r) => [r._id, r.count])),
      },
      revenue: {
        total: revenue[0]?.total || 0,
        orders: revenue[0]?.orders || 0,
        averageOrder: revenue[0]?.orders ? Math.round(revenue[0].total / revenue[0].orders) : 0,
      },
      daily: series,
      topProducts,
      lowStock: lowStockSizes,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
