/**
 * Business details, set once in .env and shown on policy pages, the Contact page and invoices.
 * Anything left empty is returned as null and simply hidden by the storefront.
 */
const env = (key) => (process.env[key] || '').trim() || null;

exports.getStoreInfo = () => ({
  name: env('STORE_NAME') || 'DopeShope',
  legalName: env('STORE_LEGAL_NAME'),
  email: env('STORE_EMAIL'),
  phone: env('STORE_PHONE'),
  address: env('STORE_ADDRESS'),
  city: env('STORE_CITY'),
  state: env('STORE_STATE'),
  pincode: env('STORE_PINCODE'),
  gstin: env('STORE_GSTIN'),
  supportHours: env('STORE_SUPPORT_HOURS') || 'Mon–Sat, 10am–6pm IST',
  returnWindowDays: 7,
  website: env('CLIENT_URL'),
});

/** Fields a live store should fill in before launch */
exports.missingStoreFields = () => {
  const info = exports.getStoreInfo();
  return ['legalName', 'email', 'phone', 'address', 'state', 'pincode'].filter((k) => !info[k]);
};
