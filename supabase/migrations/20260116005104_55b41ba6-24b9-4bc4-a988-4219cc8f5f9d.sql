-- Fix: Public exposure of payment_collection_invoices

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.payment_collection_invoices ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive policy (if present)
DROP POLICY IF EXISTS "Public can view invoice by token" ON public.payment_collection_invoices;

-- Tighten SELECT access: only admins and the owning freelancer can read directly.
-- Public token access must go through the existing masked SECURITY DEFINER function.
DROP POLICY IF EXISTS "Admins can read payment collection invoices" ON public.payment_collection_invoices;
CREATE POLICY "Admins can read payment collection invoices"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancer can read own payment collection invoices" ON public.payment_collection_invoices;
CREATE POLICY "Freelancer can read own payment collection invoices"
ON public.payment_collection_invoices
FOR SELECT
TO authenticated
USING (auth.uid() = freelancer_id);

-- Optional defense-in-depth: explicitly deny anon access (no-op if no policies allow it)
-- (No policy is created for anon; default deny applies.)