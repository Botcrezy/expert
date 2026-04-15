
-- One-time data fix: assign first accepted proposal per request that has no active assignment
-- Also update request status to 'assigned'

INSERT INTO public.assignments (request_id, freelancer_id, is_active, payment_amount, suggested_payment, assigned_at)
SELECT DISTINCT ON (mp.request_id)
  mp.request_id,
  mp.freelancer_id,
  true,
  COALESCE(mp.proposed_price, 0),
  mp.proposed_price,
  now()
FROM marketplace_proposals mp
WHERE mp.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM assignments a WHERE a.request_id = mp.request_id AND a.is_active = true
  )
ORDER BY mp.request_id, mp.created_at ASC;

-- Update those requests to 'assigned'
UPDATE public.requests
SET status = 'assigned', updated_at = now()
WHERE id IN (
  SELECT DISTINCT mp.request_id
  FROM marketplace_proposals mp
  WHERE mp.status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM assignments a WHERE a.request_id = mp.request_id AND a.is_active = true
    )
)
AND status IN ('submitted', 'approved');
