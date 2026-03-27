-- Security hardening: tighten RLS for sensitive PII tables

-- =====================
-- profiles (PII)
-- =====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Remove duplicate / overly broad policies (RLS is OR-based; remove to avoid gaps)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users read own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: users update own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: admins read" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Keep anon blocked explicitly
DROP POLICY IF EXISTS profiles_block_anon ON public.profiles;
CREATE POLICY profiles_block_anon
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Authenticated: user can only access their own row
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all profiles
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- =====================
-- identity_verifications (highly sensitive)
-- =====================
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications FORCE ROW LEVEL SECURITY;

-- Remove duplicates and unsafe update policies
DROP POLICY IF EXISTS "Users can view own verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can create own verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can create verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can update own pending verifications" ON public.identity_verifications;

DROP POLICY IF EXISTS identity_verifications_select_own ON public.identity_verifications;
DROP POLICY IF EXISTS identity_verifications_insert_own ON public.identity_verifications;
DROP POLICY IF EXISTS identity_verifications_update_own ON public.identity_verifications;

DROP POLICY IF EXISTS iv_select_own ON public.identity_verifications;
DROP POLICY IF EXISTS iv_insert_own ON public.identity_verifications;
DROP POLICY IF EXISTS iv_select_admin ON public.identity_verifications;
DROP POLICY IF EXISTS iv_update_admin ON public.identity_verifications;
DROP POLICY IF EXISTS "Admins can manage verifications" ON public.identity_verifications;

-- Keep anon blocked explicitly
DROP POLICY IF EXISTS identity_verifications_block_anon ON public.identity_verifications;
CREATE POLICY identity_verifications_block_anon
ON public.identity_verifications
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Authenticated: user can view only their own verification
CREATE POLICY identity_verifications_select_own
ON public.identity_verifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated: user can create only their own verification
CREATE POLICY identity_verifications_insert_own
ON public.identity_verifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Authenticated: user can update only while status remains pending
-- (prevents user from self-approving or changing reviewed records)
CREATE POLICY identity_verifications_update_own_pending
ON public.identity_verifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can fully manage
CREATE POLICY identity_verifications_admin_all
ON public.identity_verifications
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- =====================
-- audit_logs (sensitive metadata)
-- =====================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Remove non-admin insert policy to prevent log forgery
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Ensure anon cannot access
DROP POLICY IF EXISTS audit_logs_block_anon ON public.audit_logs;
CREATE POLICY audit_logs_block_anon
ON public.audit_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Admin-only read
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY audit_logs_select_admin
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admin-only insert (system/admin workflows)
DROP POLICY IF EXISTS "Only admins can create audit logs" ON public.audit_logs;
CREATE POLICY audit_logs_insert_admin
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
