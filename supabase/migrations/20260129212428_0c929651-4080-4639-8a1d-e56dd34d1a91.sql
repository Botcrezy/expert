-- =====================================================
-- Training tasks: enforce specialization + Drive submissions for video
-- Telegram: add link attempts logging
-- Date: 2026-01-29
-- =====================================================

-- 1) Training tasks: add submission method
ALTER TABLE public.training_tasks
ADD COLUMN IF NOT EXISTS submission_method text NOT NULL DEFAULT 'files';

-- Normalize audience values (existing default is 'freelancers')
UPDATE public.training_tasks
SET audience = 'freelancer'
WHERE audience IS NULL OR audience = 'freelancers';

-- Ensure tasks are category-specific by default
UPDATE public.training_tasks
SET is_category_specific = true
WHERE is_category_specific IS NULL;

-- 2) Training assignments: add delivery_links (for Google Drive submissions)
ALTER TABLE public.training_assignments
ADD COLUMN IF NOT EXISTS delivery_links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Validation trigger: require category_id on training_tasks
CREATE OR REPLACE FUNCTION public.validate_training_task_category_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'category_id is required for training tasks';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_training_task_category_id ON public.training_tasks;
CREATE TRIGGER trg_validate_training_task_category_id
BEFORE INSERT OR UPDATE ON public.training_tasks
FOR EACH ROW
EXECUTE FUNCTION public.validate_training_task_category_id();

-- 4) Validation trigger: enforce Drive link submissions when required
CREATE OR REPLACE FUNCTION public.validate_training_assignment_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_submission_method text;
BEGIN
  IF NEW.status <> 'submitted' THEN
    RETURN NEW;
  END IF;

  SELECT submission_method
  INTO v_submission_method
  FROM public.training_tasks
  WHERE id = NEW.task_id;

  IF v_submission_method = 'gdrive' THEN
    -- Must have at least one link
    IF NEW.delivery_links IS NULL OR jsonb_typeof(NEW.delivery_links) <> 'array' OR jsonb_array_length(NEW.delivery_links) = 0 THEN
      RAISE EXCEPTION 'Google Drive link is required for this task';
    END IF;

    -- Should not include uploaded files
    IF NEW.delivery_files IS NOT NULL AND jsonb_typeof(NEW.delivery_files) = 'array' AND jsonb_array_length(NEW.delivery_files) > 0 THEN
      RAISE EXCEPTION 'File uploads are not allowed for this task';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_training_assignment_submission ON public.training_assignments;
CREATE TRIGGER trg_validate_training_assignment_submission
BEFORE UPDATE ON public.training_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_training_assignment_submission();

-- 5) Telegram link attempts logging (for better diagnostics)
CREATE TABLE IF NOT EXISTS public.telegram_link_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  telegram_chat_id text,
  telegram_user_id text,
  telegram_username text,
  status text NOT NULL DEFAULT 'failed', -- success | failed
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_link_attempts ENABLE ROW LEVEL SECURITY;

-- Admins can read attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telegram_link_attempts' AND policyname='Admins can view telegram link attempts'
  ) THEN
    CREATE POLICY "Admins can view telegram link attempts"
    ON public.telegram_link_attempts
    FOR SELECT
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- No client-side inserts/updates/deletes (only backend function writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='telegram_link_attempts' AND policyname='No public write telegram link attempts'
  ) THEN
    CREATE POLICY "No public write telegram link attempts"
    ON public.telegram_link_attempts
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;
