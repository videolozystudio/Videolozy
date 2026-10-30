// =============================================================================
// api/lib/supabaseUrl.js — Sanitizes and normalizes the Supabase URL
//
// Prevents PGRST125 ("Invalid path specified in request URL") if SUPABASE_URL
// was accidentally configured with trailing slashes, /rest/v1, /auth/v1, or quotes.
// =============================================================================

export function sanitizeSupabaseUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  let u = raw.trim().replace(/^["']|["']$/g, "");
  u = u.replace(/\/+$/, "");
  u = u.replace(/\/(rest|auth|storage)\/v\d+.*$/i, "");
  return u.replace(/\/+$/, "");
}

export function getSanitizedSupabaseUrl() {
  return sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
}
