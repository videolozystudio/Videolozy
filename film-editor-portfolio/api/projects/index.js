// =============================================================================
// api/projects/index.js — GET all projects / POST create project
// Vercel Serverless Function
//
// Optimizations applied:
//   [1] Redis-backed rate limiter (replaces in-memory Map)
//   [2] Cursor-based pagination (replaces offset-based .range())
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "../lib/rateLimiter.js";

// ---------------------------------------------------------------------------
// Supabase Client Factory
// ---------------------------------------------------------------------------
function getServerClient(useServiceRole = false) {
  const url = process.env.SUPABASE_URL;
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY;

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

  if (!token) throw new Error("Missing authorization token.");

  const anonClient = getServerClient(false);
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) throw new Error("Invalid or expired token.");
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

  if (error || !data) throw new Error("Insufficient permissions. Admin access required.");
  return true;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(204).end();

  // [FIX 1] Redis rate limiter — works across all Vercel instances / cold starts
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
        // [FIX 2] cursor = sort_order of the last item seen (replaces offset)
        cursor   = null,
        order    = "sort_order",
      } = req.query;

      const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
      const supabase = getServerClient(false);

      let query = supabase
        .from("projects")
        .select(
          "id, title, description, category, video_provider, video_id, " +
          "thumbnail_url, client_name, year, view_count, is_featured, sort_order, created_at"
        )
        .order(order, { ascending: true })
        .limit(pageSize);

      // Cursor: only fetch rows after the last seen sort_order value
      if (cursor !== null && cursor !== "") {
        query = query.gt(order, parseInt(cursor, 10));
      }

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Return the next cursor so the client knows where to resume
      const nextCursor = data.length === pageSize
        ? (data[data.length - 1]?.[order] ?? null)
        : null;

      return res.status(200).json({
        data,
        count:      data.length,
        nextCursor, // null means no more pages
      });
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

      const payload = {
        title:          String(title).trim().slice(0, 200),
        description:    String(body.description || "").trim(),
        category:       ["commercial", "short-film", "music-video", "documentary"].includes(category)
                          ? category : null,
        video_provider: ["youtube", "vimeo"].includes(video_provider) ? video_provider : null,
        video_id:       String(video_id).trim(),
        thumbnail_url:  String(body.thumbnail_url || "").trim(),
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
    const status = err.message?.includes("Missing authorization") ? 401
                 : err.message?.includes("Invalid or expired")    ? 401
                 : err.message?.includes("Insufficient permissions") ? 403
                 : 500;

    return res.status(status).json({ error: err.message || "Internal server error." });
  }
}
