-- =============================================================================
-- Supabase Migration: 003_contact_inquiries.sql
-- 1. Removes seed/demo project rows
-- 2. Creates contact_inquiries table with RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: Remove seed data from projects table
-- Safe to run — only deletes rows whose client_name matches seed data exactly.
-- -----------------------------------------------------------------------------
DELETE FROM public.projects
WHERE client_name IN (
  'Videolozy Showcase',
  'Nike',
  'Luna Wave / Atlantic Records',
  'BBC Natural History Unit',
  'Aurum Timepieces'
);

-- =============================================================================
-- PART 2: contact_inquiries table
-- Stores form submissions from the "Start a Project" modal on the public site.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email      TEXT        NOT NULL CHECK (char_length(email) BETWEEN 3 AND 300),
  phone      TEXT        NOT NULL DEFAULT '',
  call_time  TEXT        NOT NULL DEFAULT '',
  query      TEXT        NOT NULL DEFAULT '',
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contact_inquiries IS
  'Client enquiries submitted via the Start a Project modal on the public site';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at
  ON public.contact_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_is_read
  ON public.contact_inquiries (is_read);

-- =============================================================================
-- RLS for contact_inquiries
-- =============================================================================
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (anon/authenticated) can INSERT a new inquiry
DROP POLICY IF EXISTS "inquiries_public_insert" ON public.contact_inquiries;
CREATE POLICY "inquiries_public_insert"
  ON public.contact_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Only admins can SELECT inquiries
DROP POLICY IF EXISTS "inquiries_admin_select" ON public.contact_inquiries;
CREATE POLICY "inquiries_admin_select"
  ON public.contact_inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can UPDATE inquiries (e.g., mark as read)
DROP POLICY IF EXISTS "inquiries_admin_update" ON public.contact_inquiries;
CREATE POLICY "inquiries_admin_update"
  ON public.contact_inquiries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can DELETE inquiries
DROP POLICY IF EXISTS "inquiries_admin_delete" ON public.contact_inquiries;
CREATE POLICY "inquiries_admin_delete"
  ON public.contact_inquiries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- Enable Realtime on contact_inquiries (for admin live notifications)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_inquiries;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS public.contact_inquiries CASCADE;
