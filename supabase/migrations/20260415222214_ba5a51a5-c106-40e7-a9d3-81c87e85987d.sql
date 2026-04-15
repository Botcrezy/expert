-- Fix Security Definer Views → Security Invoker
ALTER VIEW public.assignments_safe SET (security_invoker = on);
ALTER VIEW public.orders_safe SET (security_invoker = on);
ALTER VIEW public.freelancer_public_profiles SET (security_invoker = on);

-- Fix Function Search Path Mutable
CREATE OR REPLACE FUNCTION public.validate_training_task_category_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'category_id is required for training tasks';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_training_assignment_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;

-- Restrict public bucket listing: drop broad SELECT policies and replace with path-based read-only
-- avatars bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
CREATE POLICY "Public avatar read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);

-- course-resources bucket  
DROP POLICY IF EXISTS "Course resources are publicly accessible" ON storage.objects;
CREATE POLICY "Course resources read only"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-resources' AND (storage.foldername(name))[1] IS NOT NULL);

-- portfolio-assets bucket
DROP POLICY IF EXISTS "Portfolio assets are publicly accessible" ON storage.objects;
CREATE POLICY "Portfolio assets read only"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio-assets' AND (storage.foldername(name))[1] IS NOT NULL);