// =============================================================================
// api/admin/login-log.js — POST: Log admin login attempts
//
// Security hardening applied (OWASP Top 10):
//   [A04] Email format validation — prevents log injection & enumeration via
//         malformed email payloads
//   [A07] Auth-specific rate limiter — 5 requests per 10 min per IP
//         prevents this endpoint from being used as an enumeration oracle
//   [A09] Sanitized logging — raw user input never interpolated into log strings
//         without explicit truncation/sanitization
// =============================================================================

import { checkAuthRateLimit } from "../lib/authRateLimiter.js";

// [A04] Basic email format regex — RFC 5321 simplified
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// [A09] Max lengths for log fields to prevent log flooding
const MAX_EMAIL_LEN = 320;
const MAX_ERROR_LEN = 200;

export default async function handler(req, res) {
  // [A07] Rate limit — 5 attempts per 10 min per IP
  const limited = await checkAuthRateLimit(req, res, "login-log");
  if (limited) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, success, errorMessage } = req.body ?? {};

    // [A04] Validate and sanitize email before logging
    const rawEmail    = typeof email === "string" ? email.trim().slice(0, MAX_EMAIL_LEN) : "";
    const safeEmail   = rawEmail && EMAIL_RE.test(rawEmail)
      ? rawEmail
      : "(invalid format)"; // do not log malformed emails verbatim

    // [A09] Sanitize errorMessage — strip newlines to prevent log injection
    const rawError  = typeof errorMessage === "string" ? errorMessage : "";
    const safeError = rawError
      .replace(/[\r\n\t]/g, " ")  // log injection prevention
      .trim()
      .slice(0, MAX_ERROR_LEN);

    // Extract IP safely
    const ip        = (req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || "unknown")
                        .split(",")[0]
                        .trim()
                        .slice(0, 45); // max IPv6 length

    const userAgent = (req.headers["user-agent"] || "unknown").slice(0, 200);
    const isSuccess = success === true;
    const timestamp = new Date().toISOString();
    const status    = isSuccess ? "SUCCESSFUL" : "FAILED";

    // [A09] Structured log — fields quoted to prevent injection
    const logFields = `ts="${timestamp}" ip="${ip}" email="${safeEmail}" status="${status}" ua="${userAgent}" err="${safeError || "none"}"`;

    if (isSuccess) {
      console.log(`[ADMIN_LOGIN] ${logFields}`);
    } else {
      console.warn(`[ADMIN_LOGIN] ${logFields}`);
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    // [A09] Do NOT expose internal error details
    console.error("[login-log] Internal error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
