-- Admin visibility for freelancer portfolios + related joins

-- freelancer_portfolios
ALTER TABLE public.freelancer_portfolios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read all freelancer portfolios"
  ON public.freelancer_portfolios
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all freelancer portfolios"
  ON public.freelancer_portfolios
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles (needed because AdminPortfolios uses profiles!inner)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- freelancer_profiles (needed because AdminPortfolios uses freelancer_profiles!inner)
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read all freelancer profiles"
  ON public.freelancer_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- telegram_template_variables (admin settings page)
ALTER TABLE public.telegram_template_variables ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage telegram template variables"
  ON public.telegram_template_variables
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
