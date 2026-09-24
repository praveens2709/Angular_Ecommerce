/** Returns null when the caller didn't ask for paging (keeps old array responses working) */
exports.parsePaging = (query, { defaultLimit = 12, maxLimit = 100 } = {}) => {
  if (query.page === undefined && query.limit === undefined) return null;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

exports.escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
