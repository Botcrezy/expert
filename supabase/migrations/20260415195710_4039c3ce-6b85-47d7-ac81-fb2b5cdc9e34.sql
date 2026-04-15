
-- Create request_templates table
CREATE TABLE public.request_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description_template TEXT,
  size TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active templates
CREATE POLICY "Authenticated users can view active templates"
ON public.request_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage templates"
ON public.request_templates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
CREATE TRIGGER update_request_templates_updated_at
BEFORE UPDATE ON public.request_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
