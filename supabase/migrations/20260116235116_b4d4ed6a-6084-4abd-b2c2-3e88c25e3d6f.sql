-- Add released_at to payment collection invoices to support 4-day hold before funds are added to wallet
ALTER TABLE public.payment_collection_invoices
ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ NULL;

-- Backfill released_at for invoices already credited to wallet (legacy behavior)
UPDATE public.payment_collection_invoices i
SET released_at = COALESCE(i.released_at, i.paid_at)
WHERE i.status = 'paid'
  AND i.released_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.wallet_ledger wl
    WHERE wl.reference_type = 'payment_collection'
      AND wl.reference_id = i.id
  );

-- Helpful index for release processing
CREATE INDEX IF NOT EXISTS idx_payment_collection_invoices_release
ON public.payment_collection_invoices (freelancer_id, status, paid_at, released_at);