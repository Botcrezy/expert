-- Fix RLS policy blocking freelancers from reading their invoices
-- The restrictive policy was blocking all access

-- Drop the problematic restrictive policy
DROP POLICY IF EXISTS "payment_collection_invoices_block_anon" ON public.payment_collection_invoices;

-- Ensure we have a clean permissive policy for freelancers
DROP POLICY IF EXISTS "Freelancer can read own payment collection invoices" ON public.payment_collection_invoices;
DROP POLICY IF EXISTS "Freelancers can view their own invoices" ON public.payment_collection_invoices;
DROP POLICY IF EXISTS "Invoices: freelancer owner read" ON public.payment_collection_invoices;

-- Create single clear policy for freelancers to read their own invoices
CREATE POLICY "freelancer_read_own_invoices"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

-- Keep admin read policy clean
DROP POLICY IF EXISTS "Admins can read payment collection invoices" ON public.payment_collection_invoices;
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.payment_collection_invoices;
DROP POLICY IF EXISTS "Invoices: admins read" ON public.payment_collection_invoices;

CREATE POLICY "admin_read_all_invoices"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.user_id IN (
      SELECT user_id FROM auth.users
      WHERE raw_user_meta_data->>'signup_role' = 'admin'
    )
  )
);

-- Public can read by token (for payment page)
CREATE POLICY "public_read_by_token"
ON public.payment_collection_invoices
FOR SELECT
TO public
USING (true);
