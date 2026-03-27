-- Fix linter: set immutable search_path for newly created functions

CREATE OR REPLACE FUNCTION public.validate_training_task_category_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'category_id is required for training tasks';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_training_assignment_submission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
    IF NEW.delivery_links IS NULL OR jsonb_typeof(NEW.delivery_links) <> 'array' OR jsonb_array_length(NEW.delivery_links) = 0 THEN
      RAISE EXCEPTION 'Google Drive link is required for this task';
    END IF;

    IF NEW.delivery_files IS NOT NULL AND jsonb_typeof(NEW.delivery_files) = 'array' AND jsonb_array_length(NEW.delivery_files) > 0 THEN
      RAISE EXCEPTION 'File uploads are not allowed for this task';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
