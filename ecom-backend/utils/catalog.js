const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const LOW_STOCK_THRESHOLD = 10;

/** Products created before stock tracking have no `stock`; their status stays manual */
const isStockTracked = (product) =>
  !!product?.stock && SIZES.some((size) => typeof product.stock[size] === "number");

const totalStock = (stock) => SIZES.reduce((sum, size) => sum + (Number(stock?.[size]) || 0), 0);

const deriveInventoryStatus = (stock) => {
  const total = totalStock(stock);
  if (total === 0) return "OUTOFSTOCK";
  if (total <= LOW_STOCK_THRESHOLD) return "LOWSTOCK";
  return "INSTOCK";
};

/** Accepts { XS: "3", M: 5, ... } from forms; returns clean numbers, or undefined if nothing was entered */
const normalizeStock = (raw) => {
  if (!raw || typeof raw !== "object") return undefined;
  const entered = SIZES.filter((size) => raw[size] !== undefined && raw[size] !== null && raw[size] !== "");
  if (entered.length === 0) return undefined;
  return Object.fromEntries(SIZES.map((size) => [size, Math.max(0, Math.floor(Number(raw[size]) || 0))]));
};

const calculateDiscountAndMRP = (price) => {
  let discount;
  if (price < 500) discount = 10;
  else if (price < 1000) discount = 20;
  else discount = 40;
  return { discount, mrp: Math.round(price / (1 - discount / 100)) };
};

module.exports = {
  SIZES,
  LOW_STOCK_THRESHOLD,
  isStockTracked,
  totalStock,
  deriveInventoryStatus,
  normalizeStock,
  calculateDiscountAndMRP,
};
