-- =============================================================================
-- Supabase Migration: 002_dashboard_aggregation_functions.sql
--
-- Adds two SQL functions used by api/admin/dashboard.js [Fix 3]
-- These replace in-memory JavaScript Array.sort() / Array.reduce() calls
-- with server-side SQL aggregation.
--
-- Run in Supabase SQL Editor or via: supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FUNCTION: get_project_aggregates
-- Returns total project count, featured count, and total view_count sum.
-- Single table scan — Postgres executes this far faster than loading all rows
-- into Node.js memory and reducing them.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_project_aggregates()
RETURNS TABLE (
  total       BIGINT,
  featured    BIGINT,
  total_views BIGINT
) AS $$
SELECT
  COUNT(*)                                    AS total,
  COUNT(*) FILTER (WHERE is_featured = TRUE)  AS featured,
  COALESCE(SUM(view_count), 0)               AS total_views
FROM public.projects;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_project_aggregates IS
  'Returns aggregate counts for the admin dashboard (total, featured, total_views).';

GRANT EXECUTE ON FUNCTION public.get_project_aggregates TO authenticated;


-- -----------------------------------------------------------------------------
-- FUNCTION: get_projects_by_category
-- Returns one row per category with the project count in that category.
-- Replaces an Array.reduce() groupBy in JavaScript.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_projects_by_category()
RETURNS TABLE (
  category TEXT,
  count    BIGINT
) AS $$
SELECT
  category,
  COUNT(*) AS count
FROM public.projects
GROUP BY category
ORDER BY count DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_projects_by_category IS
  'Returns per-category project counts for the admin dashboard.';

GRANT EXECUTE ON FUNCTION public.get_projects_by_category TO authenticated;
