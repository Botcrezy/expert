-- Allow freelancers to read requests assigned to them
DO $$
BEGIN
  -- Drop if policy already exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'requests'
      AND policyname = 'Freelancers can view assigned requests'
  ) THEN
    EXECUTE 'DROP POLICY "Freelancers can view assigned requests" ON public.requests';
  END IF;
END $$;

CREATE POLICY "Freelancers can view assigned requests"
ON public.requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = requests.id
      AND a.freelancer_id = auth.uid()
  )
);

-- Optional: ensure RLS is enabled (no-op if already)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;