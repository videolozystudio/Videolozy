// =============================================================================
// api/contact.js — POST: Submit a contact inquiry
//
// Dedicated, hardened endpoint for the "Start a Project" contact form.
// Previously the form may have written directly to Supabase via the anon key.
// This server-side endpoint:
//
// Security hardening applied (OWASP Top 10):
//   [A01] CORS locked to known origins
//   [A03] Parameterized insert via Supabase SDK — SQL injection safe
//   [A04] Full input validation and sanitization with strict length limits
//   [A07] Rate limited — 5 submissions per 10 min per IP (anti-spam)
//   [A09] Safe error handler — no internal leaks on 500s
// =============================================================================

import { createClient }       from "@supabase/supabase-js";
import { applyCors }          from "./lib/cors.js";
import { checkAuthRateLimit } from "./lib/authRateLimiter.js";
import { sendError }          from "./lib/errorHandler.js";

// [A04] Field length limits
const LIMITS = {
  name:      { min: 1,  max: 200 },
  email:     { min: 3,  max: 320 },
  phone:     { min: 0,  max: 20  },
  call_time: { min: 0,  max: 100 },
  query:     { min: 0,  max: 2000 },
};

// [A04] Basic email regex
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// [A04] Basic phone — digits, spaces, +, -, (, ) only
const PHONE_RE = /^[\d\s\+\-\(\)]*$/;

/**
 * Sanitizes a string field: trims whitespace, strips null bytes.
 * @param {unknown} val
 * @param {number}  max
 * @returns {string}
 */
function sanitizeText(val, max) {
  if (typeof val !== "string") return "";
  return val
    .replace(/\0/g, "")      // strip null bytes
    .replace(/[\r\n]{3,}/g, "\n\n") // collapse excessive newlines
    .trim()
    .slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  // [A01] CORS — allow POST from known origins only
  const blocked = applyCors(req, res, { allowedMethods: "POST, OPTIONS" });
  if (blocked) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  // [A07] Rate limit — 5 submissions per 10 min per IP
  const limited = await checkAuthRateLimit(req, res, "contact-form");
  if (limited) return;

  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Invalid request body." });
    }

    // [A04] Sanitize all fields
    const name      = sanitizeText(body.name,      LIMITS.name.max);
    const email     = sanitizeText(body.email,     LIMITS.email.max);
    const phone     = sanitizeText(body.phone,     LIMITS.phone.max);
    const call_time = sanitizeText(body.call_time, LIMITS.call_time.max);
    const query     = sanitizeText(body.query,     LIMITS.query.max);

    // [A04] Validation
    if (name.length < LIMITS.name.min) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (email.length < LIMITS.email.min || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (phone && !PHONE_RE.test(phone)) {
      return res.status(400).json({ error: "Phone number contains invalid characters." });
    }

    // [A03] Parameterized insert via Supabase SDK (not raw SQL)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, // service role for insert (RLS allows anon anyway, but this is explicit)
      { auth: { persistSession: false } }
    );

    const { error } = await supabase
      .from("contact_inquiries")
      .insert([{ name, email, phone, call_time, query }]);

    if (error) throw error;

    return res.status(201).json({ success: true, message: "Your inquiry has been received. We'll be in touch soon!" });

  } catch (err) {
    // [A09] Safe error handler
    return sendError(res, err, "api/contact.js");
  }
}
