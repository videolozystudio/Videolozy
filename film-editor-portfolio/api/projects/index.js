// =============================================================================
// api/projects/index.js — GET all projects / POST create project
// Vercel Serverless Function
// =============================================================================

import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using SERVICE ROLE KEY (bypasses RLS for admin ops)
// This key NEVER leaves the server — it is only used here in Vercel functions.
function getServerClient(useServiceRole = false) {
  const url     = process.env.SUPABASE_URL;
  const key     = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Verify the incoming request has a valid Supabase JWT.
 * Returns the authenticated user or throws.
 */
async function authenticate(req) {
  const authHeader = req.headers["authorization"] || "";
  const token      = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) throw new Error("Missing authorization token.");

  // Use anon client to verify token (Supabase handles JWT validation)
  const anonClient = getServerClient(false);
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) throw new Error("Invalid or expired token.");
  return user;
}

/**
 * Check the authenticated user is in the admin_users table.
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

// Rate limiting — simple in-memory store (use Upstash Redis in production)
const requestCounts = new Map();
const RATE_LIMIT    = 60;  // requests per window
const RATE_WINDOW   = 60 * 1000; // 1 minute

function checkRateLimit(ip) {
  const now  = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW) {
    requestCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
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

  // Rate limiting
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  try {
    // ------------------------------------------------------------------
    // GET /api/projects — Public: fetch all projects
    // ------------------------------------------------------------------
    if (req.method === "GET") {
      const { category, limit = "100", offset = "0", order = "sort_order" } = req.query;

      const supabase = getServerClient(false);
      let query = supabase
        .from("projects")
        .select("id, title, description, category, video_provider, video_id, thumbnail_url, client_name, year, view_count, is_featured, sort_order, created_at")
        .order(order, { ascending: true })
        .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ data, count: data.length });
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

      // Validate required fields
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

      if (!payload.category) return res.status(400).json({ error: "Invalid category value." });
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
                 : err.message?.includes("Invalid or expired") ? 401
                 : err.message?.includes("Insufficient permissions") ? 403
                 : 500;

    return res.status(status).json({ error: err.message || "Internal server error." });
  }
}
