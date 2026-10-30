// =============================================================================
// api/projects/index.js — GET all projects / POST create project
// Vercel Serverless Function
//
// Security hardening applied (OWASP Top 10):
//   [A01] CORS locked to known origins for write methods (via cors.js)
//   [A03] Parameterized queries via Supabase SDK — SQL injection safe
//   [A04] Input validation: URL format, enum whitelist, length caps, year range
//   [A07] Redis-backed rate limiter (replaces in-memory Map)
//   [A09] Centralized safe error handler — no internal leaks on 500s
//   [A10] thumbnail_url restricted to known video CDN hostnames (SSRF prevention)
// =============================================================================

import { createClient }           from "@supabase/supabase-js";
import { checkRateLimit }         from "../lib/rateLimiter.js";
import { applyCors }              from "../lib/cors.js";
import { sendError }              from "../lib/errorHandler.js";
import { DEFAULT_PROJECTS }       from "../lib/defaultProjects.js";
import { getSanitizedSupabaseUrl } from "../lib/supabaseUrl.js";

// ---------------------------------------------------------------------------
// Allowed thumbnail URL hostnames (SSRF guard — A10)
// Only YouTube and Vimeo CDN hostnames are valid thumbnail sources.
// ---------------------------------------------------------------------------
const ALLOWED_THUMBNAIL_HOSTS = new Set([
  "img.youtube.com",
  "i.ytimg.com",
  "i.vimeocdn.com",
  "vumbnail.com",
]);

/**
 * Validates that thumbnail_url is a safe, https URL pointing to a known CDN.
 * Returns a sanitized string or null if invalid/empty.
 * @param {string} raw
 * @returns {string|null}
 */
function validateThumbnailUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed === "") return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null; // must be HTTPS
    if (!ALLOWED_THUMBNAIL_HOSTS.has(url.hostname)) return null; // must be known CDN
    return trimmed;
  } catch {
    return null; // unparseable URL
  }
}

// ---------------------------------------------------------------------------
// Supabase Client Factory
// ---------------------------------------------------------------------------
function getServerClient(useServiceRole = false) {
  const url = getSanitizedSupabaseUrl();
  const key = (useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY)?.trim().replace(/^["']|["']$/g, "");

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Verify the incoming request has a valid Supabase JWT.
 * Returns the authenticated user or throws.
 */
async function authenticate(req) {
  const authHeader = req.headers["authorization"] || "";
  const token      = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) throw Object.assign(new Error("Missing authorization token."), { status: 401 });

  const anonClient = getServerClient(false);
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) throw Object.assign(new Error("Invalid or expired token."), { status: 401 });
  return user;
}

/**
 * Verify the authenticated user is in the admin_users table.
 */
async function requireAdmin(user) {
  const serviceClient = getServerClient(true);
  const { data, error } = await serviceClient
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) throw Object.assign(new Error("Insufficient permissions. Admin access required."), { status: 403 });
  return true;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  // [A01] CORS — open for GET, restricted for POST
  const blocked = applyCors(req, res, { allowedMethods: "GET, POST, OPTIONS" });
  if (blocked) return;

  // [A07] General rate limiter
  const limited = await checkRateLimit(req, res);
  if (limited) return;

  try {
    // ------------------------------------------------------------------
    // GET /api/projects — Public: fetch projects (cursor-based pagination)
    // ------------------------------------------------------------------
    if (req.method === "GET") {
      const {
        category,
        limit    = "12",
        cursor   = null,
        order    = "sort_order",
      } = req.query;

      // [A04] Validate order column against allowlist to prevent column injection
      const ALLOWED_ORDER_COLS = new Set(["sort_order", "created_at", "view_count", "year"]);
      const safeOrder = ALLOWED_ORDER_COLS.has(order) ? order : "sort_order";

      const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
      const supabase = getServerClient(false);

      let query = supabase
        .from("projects")
        .select(
          "id, title, description, category, video_provider, video_id, " +
          "thumbnail_url, client_name, year, view_count, is_featured, sort_order, created_at"
        )
        .order(safeOrder, { ascending: true })
        .limit(pageSize);

      // Cursor: only fetch rows after the last seen sort_order value
      if (cursor !== null && cursor !== "") {
        query = query.gt(safeOrder, parseInt(cursor, 10));
      }

      if (category && category !== "all") {
        // [A04] Validate category against allowlist before using as filter
        const VALID_CATEGORIES = ["commercial", "short-film", "music-video", "documentary"];
        if (!VALID_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: "Invalid category value." });
        }
        query = query.eq("category", category);
      }

      try {
        const { data, error } = await query;
        if (error) throw error;

        const nextCursor = data.length === pageSize
          ? (data[data.length - 1]?.[safeOrder] ?? null)
          : null;

        return res.status(200).json({
          data,
          count:      data.length,
          nextCursor,
        });
      } catch (dbErr) {
        const isNetworkErr =
          dbErr?.message?.includes("fetch failed") ||
          dbErr?.cause?.code === "ENOTFOUND" ||
          dbErr?.code === "ENOTFOUND" ||
          dbErr?.code === "PGRST125";

        if (isNetworkErr) {
          console.warn(
            `[api/projects/index.js] Supabase database issue (${dbErr?.code || ""}: ${dbErr?.cause?.message || dbErr.message}). ` +
            `Serving fallback showcase projects.`
          );

          res.setHeader("X-Database-Fallback", "true");
          const filtered = (category && category !== "all")
            ? DEFAULT_PROJECTS.filter((p) => p.category === category)
            : DEFAULT_PROJECTS;

          return res.status(200).json({
            data:       filtered.slice(0, pageSize),
            count:      filtered.length,
            nextCursor: null,
            fallback:   true,
          });
        }

        throw dbErr;
      }
    }

    // ------------------------------------------------------------------
    // POST /api/projects — Admin only: create project
    // ------------------------------------------------------------------
    if (req.method === "POST") {
      const user = await authenticate(req);
      await requireAdmin(user);

      const body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid request body." });
      }

      const { title, category, video_provider, video_id, year } = body;
      if (!title || !category || !video_provider || !video_id || !year) {
        return res.status(400).json({
          error: "Missing required fields: title, category, video_provider, video_id, year",
        });
      }

      // [A10] Validate thumbnail URL against allowed CDN hostnames
      const thumbnailUrl = validateThumbnailUrl(body.thumbnail_url);
      if (thumbnailUrl === null) {
        return res.status(400).json({
          error: "Invalid thumbnail_url. Must be an https:// URL from a supported video CDN.",
        });
      }

      const payload = {
        title:          String(title).trim().slice(0, 200),
        description:    String(body.description || "").trim().slice(0, 5000),
        category:       ["commercial", "short-film", "music-video", "documentary"].includes(category)
                          ? category : null,
        video_provider: ["youtube", "vimeo"].includes(video_provider) ? video_provider : null,
        video_id:       String(video_id).trim().slice(0, 100),
        thumbnail_url:  thumbnailUrl,
        client_name:    String(body.client_name || "").trim().slice(0, 100),
        year:           parseInt(year, 10),
        is_featured:    Boolean(body.is_featured),
        sort_order:     parseInt(body.sort_order, 10) || 0,
      };

      if (!payload.category)       return res.status(400).json({ error: "Invalid category value." });
      if (!payload.video_provider) return res.status(400).json({ error: "Invalid video_provider value." });
      if (payload.year < 1990 || payload.year > 2100) return res.status(400).json({ error: "Invalid year." });

      const serviceClient = getServerClient(true);
      const { data, error } = await serviceClient
        .from("projects")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ data });
    }

    return res.status(405).json({ error: "Method not allowed." });

  } catch (err) {
    // [A09] Safe centralized error handler
    return sendError(res, err, "api/projects/index.js");
  }
}
