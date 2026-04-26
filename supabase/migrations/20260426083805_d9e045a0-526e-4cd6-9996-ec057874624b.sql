
-- 1) Assign freelancer role to all users in profiles who currently have no role at all
--    EXCEPT the explicitly excluded user (Zein Al-Garhy: youssef.reda.8000@gmail.com)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'freelancer'::public.app_role
FROM public.profiles p
WHERE p.user_id != '76096b98-e2d3-4a78-adac-88498932cdb1'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Create a minimal freelancer_profile (pending verification) for those newly-assigned freelancers
--    who don't have a freelancer_profile yet, so they appear correctly in the system.
INSERT INTO public.freelancer_profiles (
  user_id, bio, verification_status, is_verified, is_available,
  completed_tasks, total_earnings, stars
)
SELECT ur.user_id, NULL, 'pending', false, true, 0, 0, 0
FROM public.user_roles ur
WHERE ur.role = 'freelancer'
  AND ur.user_id != '76096b98-e2d3-4a78-adac-88498932cdb1'
  AND NOT EXISTS (
    SELECT 1 FROM public.freelancer_profiles fp WHERE fp.user_id = ur.user_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- 3) Harden handle_new_user trigger so role assignment always happens
--    even if profile insertion fails for any reason (split into separate blocks).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  desired_role public.app_role;
BEGIN
  -- Determine role first (most important step)
  desired_role := CASE
    WHEN (NEW.raw_user_meta_data ->> 'signup_role') = 'freelancer' THEN 'freelancer'::public.app_role
    WHEN (NEW.raw_user_meta_data ->> 'signup_role') = 'client' THEN 'client'::public.app_role
    ELSE 'client'::public.app_role
  END;

  -- Always assign role (independent block, must not fail)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, desired_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: failed to insert role for %: %', NEW.id, SQLERRM;
  END;

  -- Create/update profile (independent block)
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'مستخدم جديد'),
      NEW.email
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: failed to upsert profile for %: %', NEW.id, SQLERRM;
  END;

  -- For freelancer signups, also seed a pending freelancer_profile so they always show up
  IF desired_role = 'freelancer' THEN
    BEGIN
      INSERT INTO public.freelancer_profiles (
        user_id, verification_status, is_verified, is_available,
        completed_tasks, total_earnings, stars
      ) VALUES (
        NEW.id, 'pending', false, true, 0, 0, 0
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: failed to seed freelancer_profile for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
