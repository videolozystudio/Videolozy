// =============================================================================
// api/lib/errorHandler.js — Safe, centralized API error handler
//
// Goal: never leak internal details (DB schema, table names, stack traces)
// to the client in a 500-class response.
//
// OWASP A09 — Security Logging and Monitoring Failures
// =============================================================================

/**
 * Known "safe" error message prefixes that are intentionally user-facing.
 * These originate from our own application logic, not from internal systems.
 */
const SAFE_PREFIXES = [
  "Missing authorization",
  "Invalid or expired token",
  "Insufficient permissions",
  "Missing required fields",
  "Invalid category value",
  "Invalid video_provider value",
  "Invalid year",
  "Invalid or missing project ID",
  "Invalid project ID",
  "Invalid request body",
  "Method not allowed",
  "Origin not allowed",
  "Project not found",
  "Too many requests",
  "Too many authentication attempts",
];

/**
 * Determines the appropriate HTTP status code from a known error.
 * @param {Error & { status?: number, cause?: { code?: string, message?: string }, code?: string }} err
 * @returns {number}
 */
function resolveStatus(err) {
  if (err.status) return err.status;

  const msg = err.message ?? "";
  const causeCode = err?.cause?.code ?? err?.code ?? "";

  // Check for DNS failure / database unreachable / fetch failed
  if (causeCode === "ENOTFOUND" || causeCode === "ECONNREFUSED" || msg.includes("fetch failed")) {
    return 503;
  }

  if (msg.includes("Missing authorization") || msg.includes("Invalid or expired token")) return 401;
  if (msg.includes("Insufficient permissions")) return 403;
  if (msg.includes("Project not found")) return 404;
  if (msg.includes("Method not allowed")) return 405;
  if (msg.includes("Too many")) return 429;

  return 500;
}

/**
 * Returns true if the error message is safe to expose to the client as-is.
 * @param {string} message
 */
function isSafeMessage(message) {
  return SAFE_PREFIXES.some((prefix) => message.startsWith(prefix));
}

/**
 * Sends a safe, structured JSON error response.
 * For 500-class errors, logs internally and returns a generic message.
 *
 * @param {import("http").ServerResponse} res
 * @param {Error & { status?: number, cause?: any, code?: string }} err
 * @param {string} [context]  — label for server-side logs (e.g. "projects/index.js")
 */
export function sendError(res, err, context = "api") {
  const status  = resolveStatus(err);
  const message = err.message ?? "Unknown error";

  if (status === 503) {
    console.warn(
      `[${context}] Service Unavailable (503): Database connection failed (${err?.cause?.message || err.message}). ` +
      `Check if your Supabase project is active/unpaused at https://supabase.com/dashboard`
    );
    return res.status(503).json({
      error: "Database service temporarily unavailable. The database may be paused or unreachable.",
    });
  }

  if (status >= 500) {
    // Log full details server-side (visible in Vercel Runtime Logs)
    console.error(`[${context}] Internal error (${status}):`, err);

    // Return a GENERIC message — do NOT expose internal details
    return res.status(status).json({ error: "Internal server error." });
  }

  // For 4xx errors, check if the message is safe to return
  const clientMessage = isSafeMessage(message)
    ? message
    : "Request could not be processed.";

  return res.status(status).json({ error: clientMessage });
}

