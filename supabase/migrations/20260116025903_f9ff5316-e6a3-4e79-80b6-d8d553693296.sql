-- Ensure required storage buckets exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('request-files', 'request-files', false),
  ('deliveries', 'deliveries', false),
  ('training-files', 'training-files', false),
  ('course-resources', 'course-resources', true),
  ('brand-assets', 'brand-assets', false),
  ('identity-documents', 'identity-documents', false)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;