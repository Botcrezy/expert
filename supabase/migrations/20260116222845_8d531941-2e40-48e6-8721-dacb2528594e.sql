-- Tighten public access: payment page uses SECURITY DEFINER RPC, so we should NOT allow public SELECT on the base table.
-- This prevents accidental data exposure.

ALTER TABLE public.payment_collection_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_by_token" ON public.payment_collection_invoices;

-- Explicitly deny direct public reads (must use get_payment_collection_invoice_public RPC)
CREATE POLICY "payment_collection_invoices_no_public_select"
ON public.payment_collection_invoices
FOR SELECT
TO public
USING (false);
