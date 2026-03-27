-- Public request share view (token-based)
-- Provides read-only access to limited request + deliveries fields without requiring auth.

CREATE OR REPLACE FUNCTION public.get_public_request_view(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_link record;
  v_request record;
  v_deliveries json;
  v_is_uuid boolean;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN NULL;
  END IF;

  v_is_uuid := p_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  -- First: treat input as token
  SELECT request_id, expires_at, is_active
    INTO v_link
  FROM public.request_public_links
  WHERE token = p_token
  LIMIT 1;

  -- Backward compatibility: some old links used request_id directly.
  IF v_link IS NULL AND v_is_uuid THEN
    SELECT request_id, expires_at, is_active
      INTO v_link
    FROM public.request_public_links
    WHERE request_id = p_token::uuid
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_link IS NULL OR v_link.is_active IS DISTINCT FROM true THEN
    RETURN NULL;
  END IF;

  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  SELECT id, request_number, title, status, created_at, updated_at, files
    INTO v_request
  FROM public.requests
  WHERE id = v_link.request_id
  LIMIT 1;

  IF v_request IS NULL THEN
    RETURN json_build_object('error', 'missing_request');
  END IF;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', d.id,
        'created_at', d.created_at,
        'revision_number', d.revision_number,
        'status', d.status,
        'files', d.files
      )
      ORDER BY d.created_at DESC
    ),
    '[]'::json
  )
  INTO v_deliveries
  FROM public.deliveries d
  WHERE d.request_id = v_request.id;

  RETURN json_build_object(
    'request', row_to_json(v_request),
    'deliveries', v_deliveries
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_request_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_request_view(text) TO anon, authenticated;