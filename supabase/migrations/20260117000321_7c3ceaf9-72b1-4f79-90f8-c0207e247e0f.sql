-- Storage bucket for portfolio media (public)

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('portfolio-assets', 'portfolio-assets', true)
  ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
EXCEPTION WHEN undefined_table THEN
  -- In environments where storage schema isn't available
  NULL;
END $$;

-- Policies for portfolio-assets
DO $$
BEGIN
  -- Ensure RLS is enabled on storage.objects (may already be enabled)
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- Public read (bucket is public, but keep policy for authenticated reads/listing)
  BEGIN
    CREATE POLICY "Public can read portfolio assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'portfolio-assets');
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Owner upload (first folder = user id)
  BEGIN
    CREATE POLICY "Users can upload own portfolio assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'portfolio-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Owner update
  BEGIN
    CREATE POLICY "Users can update own portfolio assets"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'portfolio-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- Owner delete
  BEGIN
    CREATE POLICY "Users can delete own portfolio assets"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'portfolio-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;