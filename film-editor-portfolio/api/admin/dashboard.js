// =============================================================================
// api/admin/dashboard.js — GET aggregated dashboard stats
// Admin-only endpoint
//
// Optimization applied:
//   [3] All aggregation pushed to Supabase SQL (4 parallel queries)
//       Previously: loaded ALL rows into Node memory, then sorted/reduced in JS
//       Now:        COUNT, SUM, ORDER BY, GROUP BY done in Postgres
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
    const db = getServiceClient();

    // [FIX 3] Run all 4 aggregations in parallel — zero in-memory sorting or reducing
    const [
      aggregateResult,
      mostViewedResult,
      recentResult,
      byCategoryResult,
      analyticsResult,
    ] = await Promise.all([

      // (1) Totals: COUNT(*), SUM(view_count), COUNT(*) FILTER (WHERE is_featured)
      //     Postgres does this in a single table scan, not loaded into Node memory.
      db.rpc("get_project_aggregates"),

      // (2) Most viewed: single row via ORDER BY + LIMIT in SQL
      db
        .from("projects")
        .select("id, title, view_count")
        .order("view_count", { ascending: false })
        .limit(1)
        .single(),

      // (3) Recent 5: single query, sorted in SQL
      db
        .from("projects")
        .select("id, title, category, view_count, is_featured, created_at")
        .order("created_at", { ascending: false })
        .limit(5),

      // (4) Category breakdown: GROUP BY done in SQL via a view/rpc
      db.rpc("get_projects_by_category"),

      // (5) 7-day and 30-day analytics from materialized view
      db
        .from("project_analytics_summary")
        .select("views_last_7d, views_last_30d"),
    ]);

    // Safely extract results (rpc returns null data if function doesn't exist yet)
    const agg        = aggregateResult.data   ?? { total: 0, featured: 0, total_views: 0 };
    const mostViewed = mostViewedResult.data  ?? null;
    const recent     = recentResult.data      ?? [];
    const byCategory = byCategoryResult.data  ?? [];
    const analytics  = analyticsResult.data   ?? [];

    // Sum analytics rows (this is a small dataset: max ~4 category rows)
    const views7d  = analytics.reduce((s, a) => s + (a.views_last_7d  || 0), 0);
    const views30d = analytics.reduce((s, a) => s + (a.views_last_30d || 0), 0);

    // Convert byCategory array to { category: count } object for backward compat
    const byCategoryMap = Object.fromEntries(
      byCategory.map((r) => [r.category, r.count])
    );

    return res.status(200).json({
      data: {
        total:      agg.total    ?? 0,
        featured:   agg.featured ?? 0,
        totalViews: agg.total_views ?? 0,
        views7d,
        views30d,
        mostViewed: mostViewed
          ? { id: mostViewed.id, title: mostViewed.title, views: mostViewed.view_count }
          : null,
        recentProjects: recent.map((p) => ({
          id:          p.id,
          title:       p.title,
          category:    p.category,
          view_count:  p.view_count,
          is_featured: p.is_featured,
          created_at:  p.created_at,
        })),
        byCategory: byCategoryMap,
      },
    });

  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Internal server error." });
  }
}
