
-- Create favorite_freelancers table
CREATE TABLE public.favorite_freelancers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  freelancer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, freelancer_id)
);

-- Enable RLS
ALTER TABLE public.favorite_freelancers ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
ON public.favorite_freelancers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON public.favorite_freelancers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
ON public.favorite_freelancers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all favorites"
ON public.favorite_freelancers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
