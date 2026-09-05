// =============================================================================
// api/lib/redis.js — Upstash Redis Singleton
// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env.
// =============================================================================

import { Redis } from "@upstash/redis";

let _redis;

/**
 * Returns a shared Upstash Redis client instance.
 * Throws a descriptive error if env vars are missing.
 */
export function getRedis() {
  if (_redis) return _redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "[redis] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars."
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}
