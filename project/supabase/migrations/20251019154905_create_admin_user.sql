-- Migration: create admin profile for development
-- Timestamp: 2025-10-19 15:49:05 UTC
-- This migration inserts (or updates) a profile row with role = 'admin'.
-- NOTE: To be able to sign in as this admin via Supabase Auth, create a matching auth user
-- with the same id in the auth.users table (or create a user via the Supabase dashboard),
-- since inserting into profiles alone does not create authentication credentials.

INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'b6a6f7e2-9a8b-4d3f-9123-5c1b2a3f4e5d',
  'admin@paper.lk',
  'Site Administrator',
  'admin',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = now();