-- =============================================================================
-- Supabase Migration: 001_initial_schema.sql
-- Film Editor Portfolio — Complete Database Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor or via supabase CLI:
--   supabase db push
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- TABLE: projects
-- Stores all portfolio video projects
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT        NOT NULL DEFAULT '',
  category        TEXT        NOT NULL CHECK (category IN ('commercial', 'short-film', 'music-video', 'documentary')),
  video_provider  TEXT        NOT NULL CHECK (video_provider IN ('youtube', 'vimeo')),
  video_id        TEXT        NOT NULL CHECK (char_length(video_id) > 0),
  thumbnail_url   TEXT        NOT NULL DEFAULT '',
  client_name     TEXT        NOT NULL DEFAULT '',
  year            INTEGER     NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  view_count      INTEGER     NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.projects IS 'Portfolio video projects — publicly readable, admin-only writes';

-- =============================================================================
-- TABLE: admin_users
-- Maps Supabase Auth users to admin role
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_user_id_unique UNIQUE (user_id)
);

COMMENT ON TABLE public.admin_users IS 'Admin user registry — only users in this table have write access';

-- =============================================================================
-- TABLE: analytics_aggregates
-- Daily view counts per project (updated by API on each view)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_aggregates (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID    NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  daily_views INTEGER NOT NULL DEFAULT 0 CHECK (daily_views >= 0),
  total_views INTEGER NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  CONSTRAINT analytics_aggregates_project_date_unique UNIQUE (project_id, date)
);

COMMENT ON TABLE public.analytics_aggregates IS 'Daily view aggregates per project for analytics dashboard';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Projects: common filter/sort columns
CREATE INDEX IF NOT EXISTS idx_projects_category     ON public.projects (category);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order   ON public.projects (sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_projects_view_count   ON public.projects (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_projects_year         ON public.projects (year DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_at   ON public.projects (created_at DESC);

-- Partial index: only featured projects (small, very fast)
CREATE INDEX IF NOT EXISTS idx_projects_featured
  ON public.projects (sort_order ASC)
  WHERE is_featured = TRUE;

-- Full-text search using pg_trgm GIN indexes
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm
  ON public.projects USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_projects_description_trgm
  ON public.projects USING GIN (description gin_trgm_ops);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON public.analytics_aggregates (project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date       ON public.analytics_aggregates (date DESC);

-- Admin users
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users (user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on projects row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- RPC: increment_view_count
-- Atomically increments projects.view_count and upserts analytics_aggregates
-- Called from the API — does NOT require admin role
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_view_count(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Increment total view count on projects
  UPDATE public.projects
  SET view_count = view_count + 1
  WHERE id = p_project_id;

  -- Upsert daily analytics row
  INSERT INTO public.analytics_aggregates (project_id, date, daily_views, total_views)
  VALUES (p_project_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (project_id, date) DO UPDATE
    SET daily_views = analytics_aggregates.daily_views + 1,
        total_views = analytics_aggregates.total_views + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_view_count IS
  'Atomically increments view_count on a project and records daily analytics';

GRANT EXECUTE ON FUNCTION public.increment_view_count TO anon, authenticated;

-- =============================================================================
-- MATERIALIZED VIEW: project_analytics_summary
-- Aggregated per-project stats — refresh daily via cron or admin action
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.project_analytics_summary AS
SELECT
  p.id,
  p.title,
  p.category,
  p.is_featured,
  p.view_count,
  COALESCE(SUM(a.daily_views) FILTER (WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'), 0)  AS views_last_7d,
  COALESCE(SUM(a.daily_views) FILTER (WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'), 0) AS views_last_30d,
  COUNT(DISTINCT a.date) AS days_with_views
FROM public.projects p
LEFT JOIN public.analytics_aggregates a ON a.project_id = p.id
GROUP BY p.id, p.title, p.category, p.is_featured, p.view_count;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_analytics_summary_id
  ON public.project_analytics_summary (id);

COMMENT ON MATERIALIZED VIEW public.project_analytics_summary IS
  'Pre-aggregated analytics per project. Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY public.project_analytics_summary';

-- Function to refresh the materialized view (called from admin API)
CREATE OR REPLACE FUNCTION public.refresh_analytics_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.project_analytics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.refresh_analytics_summary TO authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_aggregates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- projects policies
-- ---------------------------------------------------------
-- Anyone can read projects (public portfolio)
DROP POLICY IF EXISTS "projects_public_select" ON public.projects;
CREATE POLICY "projects_public_select"
  ON public.projects FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Only admins can insert/update/delete projects
DROP POLICY IF EXISTS "projects_admin_insert" ON public.projects;
CREATE POLICY "projects_admin_insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects_admin_update" ON public.projects;
CREATE POLICY "projects_admin_update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects_admin_delete" ON public.projects;
CREATE POLICY "projects_admin_delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------
-- admin_users policies
-- ---------------------------------------------------------
-- Admins can see other admins; regular users see nothing
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
CREATE POLICY "admin_users_select"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------
-- analytics_aggregates policies
-- ---------------------------------------------------------
-- Public can read aggregated stats (for view counters)
DROP POLICY IF EXISTS "analytics_public_select" ON public.analytics_aggregates;
CREATE POLICY "analytics_public_select"
  ON public.analytics_aggregates FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Only admins can manually insert/update analytics rows
DROP POLICY IF EXISTS "analytics_admin_write" ON public.analytics_aggregates;
CREATE POLICY "analytics_admin_write"
  ON public.analytics_aggregates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- SEED DATA (optional — remove before production)
-- =============================================================================
-- Insert sample projects to verify the schema works
INSERT INTO public.projects
  (title, description, category, video_provider, video_id, thumbnail_url, client_name, year, is_featured, sort_order)
VALUES
  (
    'India''s Got Latent — Show Edit',
    'Official comedy show edit featuring fast multi-camera cuts, live audio balancing, and kinetic graphics.',
    'commercial', 'youtube', 'VJ9VC9OqdAA',
    'https://img.youtube.com/vi/VJ9VC9OqdAA/hqdefault.jpg',
    'Samay Raina', 2024, TRUE, 1
  ),
  (
    'Ye Dil Tum Bin Kahi — Romantic Narrative',
    'A dreamlike romantic sequence cut to classic melody. Pacing and color grading tuned for deep emotional connection.',
    'short-film', 'youtube', 'AGFlQ4ViDCA',
    'https://img.youtube.com/vi/AGFlQ4ViDCA/hqdefault.jpg',
    'Saregama Music', 2024, TRUE, 2
  ),
  (
    'Meri Sanson Mein Basa Hai — Music Video',
    'Official music video cut featuring Rahat Fateh Ali Khan & Kavya Limaye. Rhythm-driven cuts matched to vocal crescendo.',
    'music-video', 'youtube', 'RLETBH5_NpY',
    'https://img.youtube.com/vi/RLETBH5_NpY/hqdefault.jpg',
    'Boundless Melodies', 2024, TRUE, 3
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROLLBACK SCRIPT
-- =============================================================================
-- To roll back this migration, run the following:
--
-- DROP MATERIALIZED VIEW IF EXISTS public.project_analytics_summary CASCADE;
-- DROP FUNCTION IF EXISTS public.refresh_analytics_summary() CASCADE;
-- DROP FUNCTION IF EXISTS public.increment_view_count(UUID) CASCADE;
-- DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
-- DROP TABLE IF EXISTS public.analytics_aggregates CASCADE;
-- DROP TABLE IF EXISTS public.admin_users CASCADE;
-- DROP TABLE IF EXISTS public.projects CASCADE;
-- DROP EXTENSION IF EXISTS pg_trgm;
-- =============================================================================
