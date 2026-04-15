-- Recurring Requests table
CREATE TABLE public.recurring_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  task_size TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring requests"
  ON public.recurring_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring requests"
  ON public.recurring_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring requests"
  ON public.recurring_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring requests"
  ON public.recurring_requests FOR DELETE
  USING (auth.uid() = user_id);

-- AI QC Results table
CREATE TABLE public.ai_qc_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID NOT NULL,
  score INTEGER DEFAULT 0,
  checks JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  reviewed_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_qc_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view QC results"
  ON public.ai_qc_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert QC results"
  ON public.ai_qc_results FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update QC results"
  ON public.ai_qc_results FOR UPDATE
  TO service_role
  USING (true);