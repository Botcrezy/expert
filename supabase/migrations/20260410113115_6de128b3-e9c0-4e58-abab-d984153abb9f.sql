
-- 1. Add publish_mode to requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS publish_mode text NOT NULL DEFAULT 'platform';

-- Add check constraint
ALTER TABLE public.requests ADD CONSTRAINT requests_publish_mode_check CHECK (publish_mode IN ('platform', 'marketplace'));

-- 2. Create marketplace_proposals table
CREATE TABLE public.marketplace_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  freelancer_id uuid NOT NULL,
  cover_letter text,
  proposed_price numeric,
  proposed_days integer,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(request_id, freelancer_id)
);

ALTER TABLE public.marketplace_proposals ENABLE ROW LEVEL SECURITY;

-- RLS for marketplace_proposals

-- Freelancers can view their own proposals
CREATE POLICY "Freelancers can view own proposals"
ON public.marketplace_proposals
FOR SELECT
TO authenticated
USING (freelancer_id = auth.uid());

-- Admins can view all proposals
CREATE POLICY "Admins can view all proposals"
ON public.marketplace_proposals
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Freelancers can create proposals
CREATE POLICY "Freelancers can create proposals"
ON public.marketplace_proposals
FOR INSERT
TO authenticated
WITH CHECK (freelancer_id = auth.uid() AND public.has_role(auth.uid(), 'freelancer'));

-- Freelancers can update their own pending proposals
CREATE POLICY "Freelancers can update own pending proposals"
ON public.marketplace_proposals
FOR UPDATE
TO authenticated
USING (freelancer_id = auth.uid() AND status = 'pending');

-- Admins can update any proposal
CREATE POLICY "Admins can update any proposal"
ON public.marketplace_proposals
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete proposals
CREATE POLICY "Admins can delete proposals"
ON public.marketplace_proposals
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS policy for public marketplace requests viewing (on requests table)
CREATE POLICY "Anyone can view marketplace requests"
ON public.requests
FOR SELECT
TO anon, authenticated
USING (publish_mode = 'marketplace' AND status = 'submitted');

-- Trigger for updated_at
CREATE TRIGGER update_marketplace_proposals_updated_at
BEFORE UPDATE ON public.marketplace_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
