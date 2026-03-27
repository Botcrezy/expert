-- Fix training_tasks audience constraint + normalize existing data

-- 1) Normalize existing rows (keep backward compatibility)
UPDATE public.training_tasks
SET audience = 'freelancers'
WHERE audience IS NULL OR audience = 'freelancer';

-- 2) Replace check constraint to allow expected values
ALTER TABLE public.training_tasks
  DROP CONSTRAINT IF EXISTS training_tasks_audience_check;

ALTER TABLE public.training_tasks
  ADD CONSTRAINT training_tasks_audience_check
  CHECK (audience = ANY (ARRAY['all'::text, 'freelancer'::text, 'freelancers'::text]));
