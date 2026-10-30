-- =====================================================================
-- EdTech CRM & Inquiry System - database schema
-- Idempotent: safe to run any number of times (`npm run db:setup` in backend/).
-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase runs 15+).
-- =====================================================================

-- Admin accounts for the custom bcrypt + JWT auth (Supabase Auth is NOT used).
CREATE TABLE IF NOT EXISTS admins (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Inquiries submitted through the public form.
CREATE TABLE IF NOT EXISTS inquiries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type  text        NOT NULL CHECK (user_type IN ('Parent', 'Student', 'School')),
  category   text        NOT NULL CHECK (category IN ('Scholarship', 'Concert', 'Admission', 'General Query')),
  name       text        NOT NULL,
  email      text        NOT NULL,
  phone      text        NOT NULL,
  message    text        NOT NULL,
  status     text        NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the dashboard filters and the default "newest first" ordering.
CREATE INDEX IF NOT EXISTS idx_inquiries_category   ON inquiries (category);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_type  ON inquiries (user_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);

-- Row Level Security ON with NO policies: Supabase's auto-generated public
-- REST/GraphQL APIs (anon / authenticated roles) can neither read nor write
-- these tables. The Express backend connects as the table owner, which RLS
-- does not restrict, so it keeps full access.
ALTER TABLE admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
