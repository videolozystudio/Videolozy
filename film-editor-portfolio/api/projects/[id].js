// =============================================================================
// api/projects/[id].js — GET single / PUT update / DELETE project
// Vercel Serverless Function
//
// Security hardening applied (OWASP Top 10):
//   [A01] CORS locked to known origins for write methods (via cors.js)
//   [A03] Parameterized queries via Supabase SDK — SQL injection safe
//   [A04] Input validation: URL format, enum whitelist, length caps
//   [A09] Centralized safe error handler — no internal leaks on 500s
//   [A10] thumbnail_url restricted to known video CDN hostnames (SSRF prevention)
// =============================================================================

import { createClient }           from "@supabase/supabase-js";
import { applyCors }              from "../lib/cors.js";
import { sendError }              from "../lib/errorHandler.js";
import { DEFAULT_PROJECTS }       from "../lib/defaultProjects.js";
import { getSanitizedSupabaseUrl } from "../lib/supabaseUrl.js";

// ---------------------------------------------------------------------------
// Allowed thumbnail URL hostnames (SSRF guard — A10)
// ---------------------------------------------------------------------------
const ALLOWED_THUMBNAIL_HOSTS = new Set([
  "img.youtube.com",
  "i.ytimg.com",
  "i.vimeocdn.com",
  "vumbnail.com",
]);

/**
 * Validates that thumbnail_url is a safe, https URL pointing to a known CDN.
 * @param {string} raw
 * @returns {string|null}
 */
function validateThumbnailUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed === "") return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_THUMBNAIL_HOSTS.has(url.hostname)) return null;
    return trimmed;
  } catch {
    return null;
  }
}

function getServerClient(useServiceRole = false) {
  const url = getSanitizedSupabaseUrl();
  const key = (useServiceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY)
    ?.trim().replace(/^["']|["']$/g, "");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authenticate(req) {
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw Object.assign(new Error("Missing authorization token."), { status: 401 });

  const { data: { user }, error } = await getServerClient(false).auth.getUser(token);
  if (error || !user) throw Object.assign(new Error("Invalid or expired token."), { status: 401 });
  return user;
}

async function requireAdmin(user) {
  const { data, error } = await getServerClient(true)
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (error || !data) throw Object.assign(new Error("Insufficient permissions."), { status: 403 });
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  // [A01] CORS — open for GET, restricted for PUT/DELETE
  const blocked = applyCors(req, res, { allowedMethods: "GET, PUT, DELETE, OPTIONS" });
  if (blocked) return;

  const { id } = req.query;

  // [A04] Validate UUID format or demo showcase ID
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isDemo = typeof id === "string" && id.startsWith("demo-showcase-");
  if (!id || (!UUID_RE.test(id) && !isDemo)) {
    return res.status(400).json({ error: "Invalid or missing project ID." });
  }

  try {
    // ------------------------------------------------------------------
    // GET /api/projects/:id — Public
    // ------------------------------------------------------------------
    if (req.method === "GET") {
      if (isDemo) {
        const demo = DEFAULT_PROJECTS.find((p) => p.id === id);
        if (demo) return res.status(200).json({ data: demo });
        return res.status(404).json({ error: "Project not found." });
      }

      try {
        const { data, error } = await getServerClient(false)
          .from("projects")
          .select("*")
          .eq("id", id)
          .single();

        if (error?.code === "PGRST116") return res.status(404).json({ error: "Project not found." });
        if (error) throw error;

        return res.status(200).json({ data });
      } catch (dbErr) {
        const isNetworkErr =
          dbErr?.message?.includes("fetch failed") ||
          dbErr?.cause?.code === "ENOTFOUND" ||
          dbErr?.code === "ENOTFOUND";

        if (isNetworkErr) {
          const demo = DEFAULT_PROJECTS.find((p) => p.id === id);
          if (demo) return res.status(200).json({ data: demo, fallback: true });
        }
        throw dbErr;
      }
    }

    // ------------------------------------------------------------------
    // PUT /api/projects/:id — Admin only
    // ------------------------------------------------------------------
    if (req.method === "PUT") {
      const user = await authenticate(req);
      await requireAdmin(user);

      const body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Invalid request body." });
      }

      // Build update payload — only include provided fields
      const allowed = [
        "title", "description", "category", "video_provider",
        "video_id", "thumbnail_url", "client_name", "year",
        "is_featured", "sort_order"
      ];

      const payload = {};
      for (const key of allowed) {
        if (body[key] !== undefined) {
          payload[key] = body[key];
        }
      }

      // [A04] Sanitize and validate all fields
      if (payload.title !== undefined)       payload.title = String(payload.title).trim().slice(0, 200);
      if (payload.description !== undefined) payload.description = String(payload.description).trim().slice(0, 5000);
      if (payload.video_id !== undefined)    payload.video_id = String(payload.video_id).trim().slice(0, 100);
      if (payload.client_name !== undefined) payload.client_name = String(payload.client_name).trim().slice(0, 100);
      if (payload.year !== undefined)        payload.year = parseInt(payload.year, 10);
      if (payload.sort_order !== undefined)  payload.sort_order = parseInt(payload.sort_order, 10) || 0;
      if (payload.is_featured !== undefined) payload.is_featured = Boolean(payload.is_featured);

      // [A10] Validate thumbnail URL
      if (payload.thumbnail_url !== undefined) {
        const safeUrl = validateThumbnailUrl(payload.thumbnail_url);
        if (safeUrl === null) {
          return res.status(400).json({
            error: "Invalid thumbnail_url. Must be an https:// URL from a supported video CDN.",
          });
        }
        payload.thumbnail_url = safeUrl;
      }

      // [A04] Validate enum fields if present
      if (payload.category && !["commercial", "short-film", "music-video", "documentary"].includes(payload.category)) {
        return res.status(400).json({ error: "Invalid category value." });
      }
      if (payload.video_provider && !["youtube", "vimeo"].includes(payload.video_provider)) {
        return res.status(400).json({ error: "Invalid video_provider value." });
      }
      if (payload.year && (payload.year < 1990 || payload.year > 2100)) {
        return res.status(400).json({ error: "Invalid year." });
      }

      const { data, error } = await getServerClient(true)
        .from("projects")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error?.code === "PGRST116") return res.status(404).json({ error: "Project not found." });
      if (error) throw error;

      return res.status(200).json({ data });
    }

    // ------------------------------------------------------------------
    // DELETE /api/projects/:id — Admin only
    // ------------------------------------------------------------------
    if (req.method === "DELETE") {
      const user = await authenticate(req);
      await requireAdmin(user);

      const { error } = await getServerClient(true)
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({ message: "Project deleted successfully." });
    }

    return res.status(405).json({ error: "Method not allowed." });

  } catch (err) {
    // [A09] Safe centralized error handler
    return sendError(res, err, "api/projects/[id].js");
  }
}
