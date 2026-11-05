-- Supabase RLS Policy Fix for app_users
-- Ensures Next.js server running with anon key on Vercel can verify user credentials
-- while strictly preventing outsiders from inserting, modifying, or deleting user records.

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 1. Drop old policies
DROP POLICY IF EXISTS "Allow login check" ON public.app_users;
DROP POLICY IF EXISTS "Allow password updates" ON public.app_users;
DROP POLICY IF EXISTS "Allow user registration" ON public.app_users;

-- 2. Allow read-only access for login verification
CREATE POLICY "Allow login check"
  ON public.app_users
  FOR SELECT
  TO public
  USING (true);

-- 3. Reset failed attempts for active admin IP
UPDATE public.auth_ip_locks
SET failed_attempts = 0, locked_until = null
WHERE ip = '49.43.233.46';
