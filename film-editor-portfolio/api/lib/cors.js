// =============================================================================
// api/lib/cors.js — Origin-aware CORS helper
//
// Strategy:
//   • Read-only methods (GET, HEAD, OPTIONS): any origin is allowed
//     (public portfolio data, no harm in reading)
//   • Mutating methods (POST, PUT, DELETE, PATCH): only listed origins allowed
//
// OWASP A01 — Broken Access Control
// =============================================================================

/** Origins that are allowed to make credentialed / mutating requests. */
const ALLOWED_ORIGINS = new Set([
  // Production
  "https://videolozy.in",
  "https://www.videolozy.in",
  // Vercel preview deployments (adjust project slug as needed)
  /^https:\/\/film-editor-portfolio[\w-]*\.vercel\.app$/,
  // Local dev
  "http://localhost:8080",
  "http://localhost:3000",
]);

const READ_METHODS  = new Set(["GET", "HEAD", "OPTIONS"]);
const WRITE_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Returns true if the given origin is allowed to make a mutating request.
 * @param {string|undefined} origin
 */
function isOriginAllowed(origin) {
  if (!origin) return false;
  for (const entry of ALLOWED_ORIGINS) {
    if (typeof entry === "string"  && entry === origin) return true;
    if (entry instanceof RegExp   && entry.test(origin))  return true;
  }
  return false;
}

/**
 * Applies CORS headers to a Vercel serverless response.
 *
 * For mutating methods from disallowed origins:
 *   • Returns a 403 JSON response and returns `true` (caller should return).
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse}  res
 * @param {{ allowedMethods?: string }} options
 * @returns {boolean} true = request was blocked (403 already sent), false = proceed
 */
export function applyCors(req, res, { allowedMethods = "GET, OPTIONS" } = {}) {
  const origin = req.headers["origin"] ?? "";
  const method = (req.method ?? "GET").toUpperCase();

  if (READ_METHODS.has(method)) {
    // Public read — open CORS (no credentials)
    res.setHeader("Access-Control-Allow-Origin",  "*");
    res.setHeader("Vary", "Origin");
  } else if (WRITE_METHODS.has(method)) {
    if (isOriginAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin",      origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary",                             "Origin");
    } else {
      // Block unknown origins on mutating requests
      res.status(403).json({ error: "Origin not allowed." });
      return true; // blocked
    }
  }

  res.setHeader("Access-Control-Allow-Methods", allowedMethods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age",       "86400"); // 24 h preflight cache

  // Handle preflight
  if (method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false; // not blocked
}
