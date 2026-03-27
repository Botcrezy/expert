-- Fix RLS policy that references auth.users and breaks invoice listing (403 permission denied)
-- Ensure RLS enabled
ALTER TABLE public.payment_collection_invoices ENABLE ROW LEVEL SECURITY;

-- Drop the broken admin policy (created in an earlier migration)
DROP POLICY IF EXISTS "admin_read_all_invoices" ON public.payment_collection_invoices;

-- Replace with safe admin policy using existing SECURITY DEFINER helper
CREATE POLICY "admin_read_all_invoices"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Ensure freelancer can read own invoices
DROP POLICY IF EXISTS "freelancer_read_own_invoices" ON public.payment_collection_invoices;
CREATE POLICY "freelancer_read_own_invoices"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);
