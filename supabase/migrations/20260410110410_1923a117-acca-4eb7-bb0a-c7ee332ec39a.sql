
CREATE OR REPLACE VIEW public.freelancer_public_profiles AS
SELECT 
  fp.id,
  encode(sha256((fp.user_id::text)::bytea), 'hex') AS display_id,
  fp.bio,
  fp.skills,
  fp.categories,
  fp.rating,
  fp.completed_tasks,
  fp.is_verified,
  fp.is_available,
  fp.experience,
  p.full_name,
  p.avatar_url,
  port.slug as portfolio_slug
FROM freelancer_profiles fp
LEFT JOIN profiles p ON p.user_id = fp.user_id
LEFT JOIN freelancer_portfolios port ON port.user_id = fp.user_id AND port.status = 'published' AND port.is_public = true
WHERE fp.is_verified = true AND fp.is_available = true;
