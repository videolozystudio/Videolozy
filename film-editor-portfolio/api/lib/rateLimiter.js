// =============================================================================
// api/lib/rateLimiter.js — Redis-backed sliding-window rate limiter
//
// Uses Upstash Redis INCR + EXPIRE to track request counts per IP.
// Window:  60 seconds
// Limit:   100 requests per window
//
// Usage:
//   import { checkRateLimit } from "../lib/rateLimiter.js";
//   const limited = await checkRateLimit(req, res);
//   if (limited) return; // response already sent
// =============================================================================

import { getRedis } from "./redis.js";

const RATE_LIMIT  = 100;   // max requests per window
const RATE_WINDOW = 60;    // seconds

/**
 * Checks the request against a Redis sliding-window rate limit.
 *
 * @param {Request}  req  - Vercel/Node IncomingMessage
 * @param {Response} res  - Vercel/Node ServerResponse
 * @returns {Promise<boolean>} true if the request was rate-limited (429 already sent),
 *                             false if it is within limits and should proceed.
 */
export async function checkRateLimit(req, res) {
  // Extract the real client IP (Vercel sets x-forwarded-for)
  const ip  = (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim()
            || req.socket?.remoteAddress
            || "unknown";

  const key = `rl:${ip}`;

  try {
    const redis   = getRedis();
    const current = await redis.incr(key);

    // Set TTL only on the very first request in this window
    if (current === 1) {
      await redis.expire(key, RATE_WINDOW);
    }

    if (current > RATE_LIMIT) {
      res.status(429).json({
        error: "Too many requests. Please wait a moment and try again.",
        retryAfter: RATE_WINDOW,
      });
      return true; // request was limited
    }

    // Expose rate-limit headers so the client can self-throttle
    res.setHeader("X-RateLimit-Limit",     String(RATE_LIMIT));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - current)));

    return false; // request is within limits

  } catch (err) {
    // If Redis is unreachable, fail open (don't block legitimate traffic)
    console.error("[rateLimiter] Redis error — failing open:", err.message);
    return false;
  }
}
