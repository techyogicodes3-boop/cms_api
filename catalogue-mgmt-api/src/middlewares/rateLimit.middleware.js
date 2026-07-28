const attempts = new Map();

function getClientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || request.info.remoteAddress || "").split(",")[0];
  const email = request.payload?.email ? String(request.payload.email).trim().toLowerCase() : "unknown";
  return `${ip}:${email}`;
}

function prune(now) {
  for (const [key, value] of attempts.entries()) {
    if (value.resetAt <= now) attempts.delete(key);
  }
}

exports.authRateLimit = ({ limit = 10, windowMs = 15 * 60 * 1000 } = {}) => (request, h) => {
  const now = Date.now();
  prune(now);

  const key = getClientKey(request);
  const current = attempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (current.count >= limit) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return h
      .response({ success: false, message: "Too many attempts. Please try again later." })
      .code(429)
      .header("Retry-After", String(Math.max(retryAfter, 1)))
      .takeover();
  }

  attempts.set(key, { count: current.count + 1, resetAt: current.resetAt });
  return h.continue;
};
