-- Add execution date field for portfolio services
ALTER TABLE public.portfolio_services
ADD COLUMN IF NOT EXISTS execution_date date;

-- Optional index for filtering/sorting by execution date
CREATE INDEX IF NOT EXISTS idx_portfolio_services_execution_date
ON public.portfolio_services (execution_date);