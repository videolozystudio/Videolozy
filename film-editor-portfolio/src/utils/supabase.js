// =============================================================================
// src/utils/supabase.js — Supabase Client & Helper Functions
// Browser-safe: uses only SUPABASE_ANON_KEY (never the service role key)
// =============================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ---------------------------------------------------------------------------
// Client Initialization
// These values are injected into the page via the base layout's data attributes.
// ---------------------------------------------------------------------------
const SUPABASE_URL     = document.documentElement.dataset.supabaseUrl     || "";
const SUPABASE_ANON_KEY = document.documentElement.dataset.supabaseAnonKey || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[Supabase] Missing configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
    storageKey:        "filmreel_admin_session",
  },
  global: {
    headers: { "x-client-info": "filmreel-portfolio/1.0" },
  },
});

// ---------------------------------------------------------------------------
// Auth Helpers
// ---------------------------------------------------------------------------

/**
 * Sign in with email and password.
 * @returns {{ data: Session|null, error: Error|null }}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the currently authenticated session (or null).
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Require authentication — redirect to login if no valid session.
 * Call this at the top of every admin page script.
 */
export async function requireAuth(redirectUrl = "/admin/login/") {
  const { session } = await getSession();
  if (!session) {
    window.location.replace(redirectUrl);
    return null;
  }
  return session;
}

// ---------------------------------------------------------------------------
// Project Helpers (Public reads)
// ---------------------------------------------------------------------------

/**
 * Fetch all projects with optional category filter.
 * @param {string|null} category  — filter by category slug, or null for all
 * @param {object}      opts      — { limit, offset, orderBy, orderDir }
 */
export async function getProjects({ category = null, limit = 100, offset = 0, orderBy = "sort_order", orderDir = "asc" } = {}) {
  let query = supabase
    .from("projects")
    .select("id, title, description, category, video_provider, video_id, thumbnail_url, client_name, year, view_count, is_featured, sort_order, created_at")
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getProjects: ${error.message}`);
  return data || [];
}

/**
 * Fetch a single project by its ID (UUID).
 */
export async function getProjectById(id) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`getProjectById: ${error.message}`);
  return data;
}

/**
 * Search projects by title or description using pg_trgm similarity.
 */
export async function searchProjects(query, limit = 20) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, category, video_provider, video_id, thumbnail_url, client_name, year, view_count, is_featured")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`searchProjects: ${error.message}`);
  return data || [];
}

/**
 * Increment the view count for a project using the server-side RPC.
 * This is idempotent-safe — the RPC handles the atomic increment.
 */
export async function incrementViewCount(projectId) {
  const { error } = await supabase.rpc("increment_view_count", {
    p_project_id: projectId,
  });
  if (error) console.warn(`incrementViewCount: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Admin Project CRUD (require authenticated session)
// ---------------------------------------------------------------------------

/**
 * Create a new project (admin only — enforced by RLS).
 * @param {object} projectData
 */
export async function createProject(projectData) {
  const payload = sanitizeProjectPayload(projectData);

  const { data, error } = await supabase
    .from("projects")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`createProject: ${error.message}`);
  return data;
}

/**
 * Update an existing project by ID (admin only — enforced by RLS).
 */
export async function updateProject(id, projectData) {
  const payload = sanitizeProjectPayload(projectData);

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updateProject: ${error.message}`);
  return data;
}

/**
 * Delete a project by ID (admin only — enforced by RLS).
 */
export async function deleteProject(id) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`deleteProject: ${error.message}`);
  return true;
}

// ---------------------------------------------------------------------------
// Admin Dashboard Stats
// ---------------------------------------------------------------------------

/**
 * Fetch aggregated dashboard statistics.
 * Reads from the projects table directly (materialized view refresh is async).
 */
export async function getDashboardStats() {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, view_count, is_featured, category");

  if (error) throw new Error(`getDashboardStats: ${error.message}`);

  const total     = projects.length;
  const featured  = projects.filter((p) => p.is_featured).length;
  const totalViews = projects.reduce((sum, p) => sum + (p.view_count || 0), 0);
  const mostViewed = projects.sort((a, b) => b.view_count - a.view_count)[0] || null;

  return { total, featured, totalViews, mostViewed };
}

// ---------------------------------------------------------------------------
// Internal Utilities
// ---------------------------------------------------------------------------

/**
 * Sanitize and normalize project form data before sending to Supabase.
 */
function sanitizeProjectPayload(data) {
  return {
    title:          String(data.title || "").trim(),
    description:    String(data.description || "").trim(),
    category:       String(data.category || "commercial"),
    video_provider: String(data.video_provider || "youtube"),
    video_id:       String(data.video_id || "").trim(),
    thumbnail_url:  String(data.thumbnail_url || "").trim(),
    client_name:    String(data.client_name || "").trim(),
    year:           parseInt(data.year, 10) || new Date().getFullYear(),
    is_featured:    Boolean(data.is_featured),
    sort_order:     parseInt(data.sort_order, 10) || 0,
  };
}
