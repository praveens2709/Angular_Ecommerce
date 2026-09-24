/** Small in-memory limiter for login/reset endpoints (per IP + route) */
module.exports = ({ windowMs = 15 * 60 * 1000, max = 10, message = "Too many attempts. Please try again later." } = {}) => {
  const hits = new Map();

  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
};
