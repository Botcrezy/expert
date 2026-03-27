-- ============================================================
-- REALTIME SETUP - Enable tables for realtime
-- ============================================================
-- This script safely adds tables to realtime publication
-- It will skip tables that are already members
-- ============================================================

DO $$
BEGIN
  -- Core messaging & notifications
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- Requests & assignments
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- User profiles & subscriptions
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.freelancer_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_subscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.credits_ledger; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- Brands & tasks
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.brands; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_deliveries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- Orders & payments
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_collection_invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- Settings & CMS
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.header_footer_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_links; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages_log; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- Learning & courses
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.course_enrollments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  
  -- Identity & support
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.identity_verifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
