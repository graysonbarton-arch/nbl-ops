-- ============================================================
-- NBL-Ops Supabase Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'UNTITLED',
  subtitle TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft',
  data JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);

-- 2. SHARED ROSTER TABLE
CREATE TABLE IF NOT EXISTS shared_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT DEFAULT '',
  pay_type TEXT DEFAULT 'day',
  rate TEXT DEFAULT '',
  dob TEXT DEFAULT '',
  sky_miles TEXT DEFAULT '',
  ktn TEXT DEFAULT '',
  hilton TEXT DEFAULT '',
  marriott TEXT DEFAULT '',
  shirt_size TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SHARED VENUES TABLE
CREATE TABLE IF NOT EXISTS shared_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  venue TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY — Allow all authenticated users to CRUD
-- ============================================================

-- Budgets RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (true);

-- Shared Roster RLS
ALTER TABLE shared_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roster"
  ON shared_roster FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert roster"
  ON shared_roster FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update roster"
  ON shared_roster FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete roster"
  ON shared_roster FOR DELETE
  TO authenticated
  USING (true);

-- Shared Venues RLS
ALTER TABLE shared_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read venues"
  ON shared_venues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert venues"
  ON shared_venues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update venues"
  ON shared_venues FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete venues"
  ON shared_venues FOR DELETE
  TO authenticated
  USING (true);

-- Service role bypass (for API routes that use service key)
-- Service role automatically bypasses RLS, no policy needed
