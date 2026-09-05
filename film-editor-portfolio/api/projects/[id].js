// =============================================================================
// api/projects/[id].js — GET single / PUT update / DELETE project
// Vercel Serverless Function
// =============================================================================

import { createClient } from "@supabase/supabase-js";

function getServerClient(useServiceRole = false) {
  return createClient(
    process.env.SUPABASE_URL,
    useServiceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
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
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(204).end();

  const { id } = req.query;

  // Validate UUID format
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID_RE.test(id)) {
    return res.status(400).json({ error: "Invalid or missing project ID." });
  }

  try {
    // ------------------------------------------------------------------
    // GET /api/projects/:id — Public
    // ------------------------------------------------------------------
    if (req.method === "GET") {
      const { data, error } = await getServerClient(false)
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error?.code === "PGRST116") return res.status(404).json({ error: "Project not found." });
      if (error) throw error;

      return res.status(200).json({ data });
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

      // Sanitize
      if (payload.title)          payload.title = String(payload.title).trim().slice(0, 200);
      if (payload.description)    payload.description = String(payload.description).trim();
      if (payload.video_id)       payload.video_id = String(payload.video_id).trim();
      if (payload.thumbnail_url)  payload.thumbnail_url = String(payload.thumbnail_url).trim();
      if (payload.client_name)    payload.client_name = String(payload.client_name).trim().slice(0, 100);
      if (payload.year)           payload.year = parseInt(payload.year, 10);
      if (payload.sort_order !== undefined) payload.sort_order = parseInt(payload.sort_order, 10) || 0;
      if (payload.is_featured !== undefined) payload.is_featured = Boolean(payload.is_featured);

      // Validate enum fields if present
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
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Internal server error." });
  }
}
