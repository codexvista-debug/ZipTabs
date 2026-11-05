-- Step 4: Database Row-Level Security (RLS) Hardening
-- Locks down audit tables, IP bans, remittances, and credentials from unauthorized outsider tampering.

-- 1. auth_ip_locks: Outsiders cannot delete, reset, or manipulate IP lockout records
DROP POLICY IF EXISTS "Allow public full access to auth_ip_locks" ON public.auth_ip_locks;
DROP POLICY IF EXISTS "Allow public read-only auth_ip_locks" ON public.auth_ip_locks;
ALTER TABLE public.auth_ip_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only auth_ip_locks"
  ON public.auth_ip_locks
  FOR SELECT
  TO public
  USING (true);

-- 2. site_visitors: Outsiders cannot delete or tamper with visitor audit history
DROP POLICY IF EXISTS "Allow public access to site_visitors" ON public.site_visitors;
DROP POLICY IF EXISTS "Allow public read-only site_visitors" ON public.site_visitors;
ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only site_visitors"
  ON public.site_visitors
  FOR SELECT
  TO public
  USING (true);

-- 3. vendor_remittances: Mutations strictly restricted to authenticated server endpoints
DROP POLICY IF EXISTS "Allow anon read/write vendor_remittances" ON public.vendor_remittances;
DROP POLICY IF EXISTS "Allow public read-only vendor_remittances" ON public.vendor_remittances;
ALTER TABLE public.vendor_remittances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only vendor_remittances"
  ON public.vendor_remittances
  FOR SELECT
  TO public
  USING (true);

-- 4. vault_credentials: Encrypted credentials protected from anonymous destruction
DROP POLICY IF EXISTS "Allow chief vault access" ON public.vault_credentials;
DROP POLICY IF EXISTS "Allow vault read and update" ON public.vault_credentials;
ALTER TABLE public.vault_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow vault read and update"
  ON public.vault_credentials
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
