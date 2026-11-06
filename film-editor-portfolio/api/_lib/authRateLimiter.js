// =============================================================================
// api/lib/authRateLimiter.js — Strict Redis-backed auth rate limiter
//
// Far stricter than the general API rate limiter:
//   Window:  10 minutes (600 s)
//   Limit:   5 attempts per IP per window
//
// On breach: returns 429 with Retry-After header and short-circuits the request.
//
// OWASP A07 — Identification and Authentication Failures
// =============================================================================

import { getRedis } from "./redis.js";

const AUTH_LIMIT  = 5;    // max attempts per window
const AUTH_WINDOW = 600;  // 10 minutes in seconds

/**
 * Applies a strict rate limit for authentication-sensitive endpoints.
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse}  res
 * @param {string} [namespace="auth"] — differentiates keys for different endpoints
 * @returns {Promise<boolean>} true = rate-limited (429 already sent), false = proceed
 */
export async function checkAuthRateLimit(req, res, namespace = "auth") {
  const ip = (req.headers["x-forwarded-for"] ?? "")
               .split(",")[0]
               .trim() || req.socket?.remoteAddress || "unknown";

  const key = `rl:${namespace}:${ip}`;

  try {
    const redis   = getRedis();
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, AUTH_WINDOW);
    }

    if (current > AUTH_LIMIT) {
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : AUTH_WINDOW;

      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:      "Too many authentication attempts. Please try again later.",
        retryAfter,
      });
      return true; // blocked
    }

    // Expose remaining attempts so clients can show feedback
    res.setHeader("X-Auth-Remaining", String(Math.max(0, AUTH_LIMIT - current)));

    return false; // proceed

  } catch (err) {
    // Redis unavailable — fail open (don't lock out users during an outage)
    // but still log the failure for monitoring
    console.error("[authRateLimiter] Redis error — failing open:", err.message);
    return false;
  }
}
