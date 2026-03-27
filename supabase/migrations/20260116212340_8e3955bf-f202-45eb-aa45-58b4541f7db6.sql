-- Public visibility for portfolio projects & services (for /u/:slug pages)
-- These policies allow anonymous visitors to see ONLY visible/active items
-- for portfolios that are explicitly public.

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "portfolio_projects_public_read_visible"
  ON public.portfolio_projects
  FOR SELECT
  USING (
    COALESCE(is_visible, false) = true
    AND EXISTS (
      SELECT 1
      FROM public.freelancer_portfolios fp
      WHERE fp.user_id = portfolio_projects.freelancer_id
        AND fp.is_public = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "portfolio_services_public_read_active"
  ON public.portfolio_services
  FOR SELECT
  USING (
    COALESCE(is_active, false) = true
    AND EXISTS (
      SELECT 1
      FROM public.freelancer_portfolios fp
      WHERE fp.user_id = portfolio_services.freelancer_id
        AND fp.is_public = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- (Owner/admin policies are expected to exist already; this adds the missing public-read layer.)
