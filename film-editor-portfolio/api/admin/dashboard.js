// =============================================================================
// api/admin/dashboard.js — GET aggregated dashboard stats
// Admin-only endpoint
// =============================================================================

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

async function authenticate(req) {
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw Object.assign(new Error("Missing authorization token."), { status: 401 });

  const anonClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error } = await anonClient.auth.getUser(token);
  if (error || !user) throw Object.assign(new Error("Invalid or expired token."), { status: 401 });

  // Verify admin
  const { data: adminRecord } = await getServiceClient()
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!adminRecord) throw Object.assign(new Error("Insufficient permissions."), { status: 403 });
  return user;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });

  try {
    await authenticate(req);

    const serviceClient = getServiceClient();

    // Fetch raw project stats
    const { data: projects, error: projectsError } = await serviceClient
      .from("projects")
      .select("id, title, view_count, is_featured, category, created_at");

    if (projectsError) throw projectsError;

    // Fetch analytics from materialized view (if available) or aggregates table
    const { data: analytics } = await serviceClient
      .from("project_analytics_summary")
      .select("id, views_last_7d, views_last_30d")
      .limit(projects.length);

    // Build analytics map
    const analyticsMap = {};
    (analytics || []).forEach((a) => { analyticsMap[a.id] = a; });

    // Compute stats
    const total       = projects.length;
    const featured    = projects.filter((p) => p.is_featured).length;
    const totalViews  = projects.reduce((s, p) => s + (p.view_count || 0), 0);
    const sorted      = [...projects].sort((a, b) => b.view_count - a.view_count);
    const mostViewed  = sorted[0] || null;
    const recentProjects = [...projects]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Category breakdown
    const byCategory = projects.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});

    // 7-day and 30-day totals from materialized view
    const views7d  = Object.values(analyticsMap).reduce((s, a) => s + (a.views_last_7d || 0), 0);
    const views30d = Object.values(analyticsMap).reduce((s, a) => s + (a.views_last_30d || 0), 0);

    return res.status(200).json({
      data: {
        total,
        featured,
        totalViews,
        views7d,
        views30d,
        mostViewed: mostViewed ? { id: mostViewed.id, title: mostViewed.title, views: mostViewed.view_count } : null,
        recentProjects: recentProjects.map((p) => ({
          id:         p.id,
          title:      p.title,
          category:   p.category,
          view_count: p.view_count,
          is_featured: p.is_featured,
          created_at: p.created_at,
        })),
        byCategory,
      },
    });

  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Internal server error." });
  }
}
