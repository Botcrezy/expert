-- Harden sensitive tables with explicit anonymous blocking + stricter owner checks

-- PROFILES (already has block_anon + owner policies; just ensure RLS is on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- IDENTITY VERIFICATIONS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Block anonymous / any non-matching rows defensively
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'identity_verifications'
      AND policyname = 'identity_verifications_block_anon'
  ) THEN
    CREATE POLICY identity_verifications_block_anon
    ON public.identity_verifications
    AS RESTRICTIVE
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'identity_verifications'
      AND policyname = 'identity_verifications_owner_select'
  ) THEN
    CREATE POLICY identity_verifications_owner_select
    ON public.identity_verifications
    AS RESTRICTIVE
    FOR SELECT
    USING ((auth.uid() = user_id) OR is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'identity_verifications'
      AND policyname = 'identity_verifications_owner_insert'
  ) THEN
    CREATE POLICY identity_verifications_owner_insert
    ON public.identity_verifications
    AS RESTRICTIVE
    FOR INSERT
    WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));
  END IF;

  -- Allow user to edit only their own *pending* verification (prevents tampering after review)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'identity_verifications'
      AND policyname = 'identity_verifications_owner_update_pending'
  ) THEN
    CREATE POLICY identity_verifications_owner_update_pending
    ON public.identity_verifications
    AS RESTRICTIVE
    FOR UPDATE
    USING (((auth.uid() = user_id) AND (status = 'pending')) OR is_admin(auth.uid()))
    WITH CHECK (((auth.uid() = user_id) AND (status = 'pending')) OR is_admin(auth.uid()));
  END IF;
END $$;

-- PAYMENT COLLECTION INVOICES
ALTER TABLE public.payment_collection_invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Explicitly deny anonymous reads even if other policies get added later.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_collection_invoices'
      AND policyname = 'payment_collection_invoices_block_anon'
  ) THEN
    CREATE POLICY payment_collection_invoices_block_anon
    ON public.payment_collection_invoices
    AS RESTRICTIVE
    FOR SELECT
    USING (false);
  END IF;

  -- Defense-in-depth: ensure UPDATE cannot change ownership fields
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_collection_invoices'
      AND policyname = 'payment_collection_invoices_owner_update_with_check'
  ) THEN
    CREATE POLICY payment_collection_invoices_owner_update_with_check
    ON public.payment_collection_invoices
    AS RESTRICTIVE
    FOR UPDATE
    USING ((auth.uid() = freelancer_id) OR is_admin(auth.uid()))
    WITH CHECK ((auth.uid() = freelancer_id) OR is_admin(auth.uid()));
  END IF;
END $$;

-- WALLET LEDGER (ensure RLS is on; existing anon-block/select policies already present)
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
