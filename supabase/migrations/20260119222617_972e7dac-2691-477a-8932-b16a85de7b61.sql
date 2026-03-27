-- Fix infinite recursion between assignments and requests tables

-- 1. Create a SECURITY DEFINER function to check if user is assigned to a request
-- This bypasses RLS to avoid the circular dependency
CREATE OR REPLACE FUNCTION public.is_assigned_to_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = p_request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  );
$$;

-- 2. Update the requests policy to use the new function instead of direct query
DROP POLICY IF EXISTS "Freelancers can view assigned requests" ON public.requests;
CREATE POLICY "Freelancers can view assigned requests"
ON public.requests
FOR SELECT
TO authenticated
USING (public.is_assigned_to_request(id));

-- 3. Update assignments policy to avoid circular dependency
-- The is_request_owner function already uses SECURITY DEFINER, so it should be safe
-- But let's simplify the assignments policy to be more direct
DROP POLICY IF EXISTS "Users can view related assignments" ON public.assignments;
CREATE POLICY "Users can view related assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (
  freelancer_id = auth.uid() 
  OR public.is_admin(auth.uid()) 
  OR public.is_request_owner(request_id)
);

-- 4. Fix realtime policy for assignments to avoid recursion
DROP POLICY IF EXISTS "realtime_assignments_select" ON public.assignments;
CREATE POLICY "realtime_assignments_select" ON public.assignments
FOR SELECT
USING (
    freelancer_id = auth.uid()
    OR public.is_request_owner(request_id)
    OR public.is_admin()
);

-- 5. Fix realtime policy for requests to avoid recursion  
DROP POLICY IF EXISTS "realtime_requests_select" ON public.requests;
CREATE POLICY "realtime_requests_select" ON public.requests
FOR SELECT
USING (
    user_id = auth.uid()
    OR public.is_assigned_to_request(id)
    OR public.is_admin()
);