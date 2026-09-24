const { getStoreInfo } = require('./store');

/** Remote regions where couriers take longer */
const FAR_STATES = new Set([
  'arunachal pradesh', 'assam', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'tripura', 'sikkim',
  'jammu and kashmir', 'jammu & kashmir', 'ladakh', 'andaman and nicobar islands', 'andaman & nicobar islands', 'lakshadweep',
]);

const cache = new Map();
const CACHE_MS = 24 * 60 * 60 * 1000;
const PINCODE_API = 'https://api.postalpincode.in/pincode/';

/**
 * Looks a pincode up in India Post's directory (free, no key).
 * Returns { valid, city, state } or { valid: null } when the directory can't be reached.
 */
const lookupPincode = async (pincode) => {
  // Tests and offline setups skip the network lookup (treated as "couldn't check")
  if (process.env.NODE_ENV === 'test' || process.env.PINCODE_LOOKUP === 'off') return { valid: null };
  const hit = cache.get(pincode);
  if (hit && hit.expires > Date.now()) return hit.value;

  let value;
  try {
    const res = await fetch(PINCODE_API + pincode, { signal: AbortSignal.timeout(4000) });
    const [body] = await res.json();
    const office = body?.Status === 'Success' ? body.PostOffice?.[0] : null;
    value = office ? { valid: true, city: office.District, state: office.State } : { valid: false };
  } catch {
    return { valid: null }; // directory unavailable: don't cache, don't block the shopper
  }
  cache.set(pincode, { value, expires: Date.now() + CACHE_MS });
  if (cache.size > 5000) cache.delete(cache.keys().next().value);
  return value;
};

/** Courier days from the warehouse (STORE_PINCODE / STORE_STATE) */
const deliveryDays = (pincode, state) => {
  const store = getStoreInfo();
  if (store.pincode && pincode.slice(0, 3) === store.pincode.slice(0, 3)) return 2;
  if (store.state && state && store.state.toLowerCase() === state.toLowerCase()) return 3;
  if (state && FAR_STATES.has(state.toLowerCase())) return 7;
  return 5;
};

const nonServiceable = () =>
  new Set((process.env.NON_SERVICEABLE_PINCODES || '').split(',').map((p) => p.trim()).filter(Boolean));

exports.checkDelivery = async (pincode) => {
  if (!/^[1-9]\d{5}$/.test(pincode)) return { pincode, valid: false, deliverable: false, message: 'Enter a valid 6-digit pincode' };

  const found = await lookupPincode(pincode);
  if (found.valid === false) return { pincode, valid: false, deliverable: false, message: "We couldn't find this pincode" };
  if (nonServiceable().has(pincode)) {
    return { pincode, valid: true, deliverable: false, city: found.city, state: found.state, message: "Sorry, we don't deliver here yet" };
  }
  return {
    pincode,
    valid: true,
    verified: found.valid === true,
    deliverable: true,
    city: found.city || null,
    state: found.state || null,
    days: deliveryDays(pincode, found.state),
    cod: true,
  };
};

exports.lookupPincode = lookupPincode;
exports.deliveryDays = deliveryDays;
