-- 1) Link order items to requests (optional)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX IF NOT EXISTS idx_order_items_request_id
ON public.order_items (request_id);

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_request_id_fkey
FOREIGN KEY (request_id) REFERENCES public.requests(id)
ON DELETE SET NULL;

-- 2) Ensure freelancer role is always present when freelancer_profile exists
CREATE OR REPLACE FUNCTION public.ensure_freelancer_role_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert freelancer role for this user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'freelancer'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_freelancer_role_from_profile ON public.freelancer_profiles;

CREATE TRIGGER trg_ensure_freelancer_role_from_profile
AFTER INSERT OR UPDATE OF user_id
ON public.freelancer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_freelancer_role_from_profile();
