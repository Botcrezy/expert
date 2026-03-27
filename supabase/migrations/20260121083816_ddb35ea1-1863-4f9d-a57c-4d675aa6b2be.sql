-- Fix portfolio services schema mismatch (frontend sends `images`)
ALTER TABLE public.portfolio_services
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Helpful index for ordering (optional, safe)
CREATE INDEX IF NOT EXISTS idx_portfolio_services_freelancer_sort
  ON public.portfolio_services (freelancer_id, sort_order);
