-- ============================================================
-- 🏗️ Sity Experts Platform - Complete Database Schema
-- ============================================================
-- Version: 3.1
-- Last Updated: 2026-01-09 (Synced with current database)
-- Description: Complete schema including all tables, RLS policies,
--              functions, triggers, and storage buckets
-- ============================================================

-- ============================================================
-- 📦 ENUMS (Matching current database)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('client', 'freelancer', 'team_leader', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_size AS ENUM ('micro', 'small', 'medium', 'large');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM (
    'submitted', 'needs_info', 'approved', 'assigned', 'in_progress', 
    'ready_for_qc', 'qc_rejected', 'delivered_to_client', 
    'revision_requested', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_status AS ENUM ('pending', 'approved', 'rejected', 'resubmitted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('cart', 'pending_payment', 'paid', 'failed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.dispute_status AS ENUM ('opened', 'under_review', 'resolved_refund', 'resolved_reassign', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 📊 SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.request_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1000;

-- ============================================================
-- 🗃️ CORE TABLES
-- ============================================================

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'client',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT 'مستخدم جديد',
  email text,
  phone text,
  avatar_url text,
  address text,
  city text,
  governorate text,
  national_id text,
  date_of_birth date,
  identity_verified boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Freelancer Profiles
CREATE TABLE IF NOT EXISTS public.freelancer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bio text,
  portfolio_url text,
  linkedin_url text,
  github_url text,
  cv_url text,
  experience text,
  skills jsonb DEFAULT '[]'::jsonb,
  categories text[] DEFAULT '{}',
  hourly_rate numeric,
  rating numeric DEFAULT 0,
  stars integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  training_completed integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  is_available boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  identity_verified boolean DEFAULT false,
  verification_status text DEFAULT 'pending',
  withdrawal_methods jsonb,
  additional_info jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  price numeric DEFAULT 0,
  credits_per_month integer DEFAULT 0,
  revisions_limit integer DEFAULT 1,
  max_task_size public.task_size DEFAULT 'small',
  priority_assignment boolean DEFAULT false,
  sla_hours integer,
  qc_level text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_free boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Requests
CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_number text UNIQUE,
  category_id uuid REFERENCES public.categories(id),
  title text NOT NULL,
  description text,
  size public.task_size NOT NULL DEFAULT 'small',
  status public.request_status NOT NULL DEFAULT 'submitted',
  priority text DEFAULT 'normal',
  deadline timestamptz,
  credits_cost integer DEFAULT 0,
  files jsonb DEFAULT '[]'::jsonb,
  admin_notes text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id),
  freelancer_id uuid NOT NULL,
  assigned_by uuid,
  payment_amount numeric DEFAULT 0,
  suggested_payment numeric,
  pricing_factors jsonb,
  notes text,
  is_active boolean DEFAULT true,
  freelancer_accepted boolean,
  freelancer_accepted_at timestamptz,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id),
  freelancer_id uuid NOT NULL,
  files jsonb DEFAULT '[]'::jsonb,
  notes text,
  revision_number integer DEFAULT 1,
  status public.delivery_status DEFAULT 'pending',
  qc_reviewer_id uuid,
  qc_notes text,
  qc_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id),
  sender_id uuid NOT NULL,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_system boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  reference_type text,
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 💰 FINANCIAL TABLES
-- ============================================================

-- Client Subscriptions
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  credits_remaining integer DEFAULT 0,
  revisions_used integer DEFAULT 0,
  is_active boolean DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_number text UNIQUE,
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total numeric DEFAULT 0,
  coupon_id uuid,
  status public.order_status DEFAULT 'pending_payment',
  payment_method text,
  payment_reference text,
  payment_receipt_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  product_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  type text NOT NULL, -- subscription, credit_pack, course
  plan_id uuid REFERENCES public.plans(id),
  track_id uuid,
  credits integer,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type public.coupon_type DEFAULT 'percent',
  value numeric NOT NULL,
  min_order_amount numeric,
  max_uses integer,
  max_uses_per_user integer,
  uses_count integer DEFAULT 0,
  first_time_only boolean DEFAULT false,
  allowed_products text[],
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Coupon Redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id),
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  discount_amount numeric DEFAULT 0,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

-- Credits Ledger
CREATE TABLE IF NOT EXISTS public.credits_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- credit, debit, request_debit, refund
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wallet Ledger (Freelancers)
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- credit, debit
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL, -- vodafone_cash, instapay, bank_transfer
  account_details jsonb,
  status text DEFAULT 'pending', -- pending, approved, rejected, completed
  admin_notes text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id),
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  status public.dispute_status DEFAULT 'opened',
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 🎓 LEARNING TABLES
-- ============================================================

-- Learning Tracks
CREATE TABLE IF NOT EXISTS public.learning_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  level text DEFAULT 'beginner', -- beginner, intermediate, advanced
  icon text,
  cover_image text,
  video_intro_url text,
  video_intro_type text DEFAULT 'youtube',
  audience text DEFAULT 'freelancer', -- freelancer, client, both
  target_categories text[],
  required_stars integer DEFAULT 0,
  is_free boolean DEFAULT true,
  price numeric,
  enrollment_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Learning Modules
CREATE TABLE IF NOT EXISTS public.learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  required_stars integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Learning Lessons
CREATE TABLE IF NOT EXISTS public.learning_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_ar text NOT NULL,
  content text,
  content_ar text,
  video_url text,
  video_file_url text,
  video_type text DEFAULT 'youtube', -- youtube, upload
  duration_minutes integer DEFAULT 0,
  resources jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Lesson Progress
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  watch_percentage numeric DEFAULT 0,
  watched_seconds integer DEFAULT 0,
  total_seconds integer DEFAULT 0,
  last_watched_at timestamptz,
  started_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- User Track Progress
CREATE TABLE IF NOT EXISTS public.user_track_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  lessons_completed integer DEFAULT 0,
  total_lessons integer DEFAULT 0,
  progress_percentage numeric(5,2) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_accessed_at timestamptz DEFAULT now(),
  current_module_id uuid,
  current_lesson_id uuid,
  certificate_issued boolean DEFAULT false,
  certificate_issued_at timestamptz,
  certificate_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Course Enrollments
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.learning_tracks(id),
  order_id uuid REFERENCES public.orders(id),
  is_active boolean DEFAULT true,
  enrolled_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  completed_at timestamptz,
  progress_percentage numeric DEFAULT 0
);

-- Training Tasks
CREATE TABLE IF NOT EXISTS public.training_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ar text NOT NULL,
  description text,
  description_ar text,
  track_id uuid REFERENCES public.learning_tracks(id),
  category_id uuid REFERENCES public.categories(id),
  difficulty text DEFAULT 'beginner', -- beginner, intermediate, advanced
  estimated_time_hours numeric,
  stars_reward integer DEFAULT 1,
  instructions jsonb,
  sample_files jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Training Assignments
CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.training_tasks(id),
  freelancer_id uuid NOT NULL,
  status text DEFAULT 'assigned', -- assigned, in_progress, submitted, approved, rejected
  delivery_files jsonb DEFAULT '[]'::jsonb,
  delivery_notes text,
  admin_feedback text,
  stars_earned integer,
  started_at timestamptz,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Lesson Comments
CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_type text DEFAULT 'freelancer', -- freelancer, client
  content text NOT NULL,
  parent_id uuid REFERENCES public.lesson_comments(id),
  is_admin_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lesson Likes
CREATE TABLE IF NOT EXISTS public.lesson_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.learning_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

-- ============================================================
-- 🏢 BRANDS TABLES
-- ============================================================

-- Brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  logo_url text,
  website text,
  industry text,
  colors jsonb,
  fonts jsonb,
  social_links jsonb,
  status text DEFAULT 'active',
  is_suspended boolean DEFAULT false,
  suspended_at timestamptz,
  suspended_by uuid,
  suspension_reason text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Brand Assignments
CREATE TABLE IF NOT EXISTS public.brand_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  freelancer_id uuid NOT NULL,
  role text,
  payment_amount numeric,
  status text DEFAULT 'active',
  notes text,
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Brand Tasks
CREATE TABLE IF NOT EXISTS public.brand_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  assignment_id uuid REFERENCES public.brand_assignments(id),
  freelancer_id uuid,
  title text NOT NULL,
  description text,
  requirements text,
  deadline timestamptz,
  payment_amount numeric,
  status text DEFAULT 'pending',
  admin_notes text,
  delivery_files jsonb,
  delivery_notes text,
  submitted_at timestamptz,
  qc_reviewer_id uuid,
  qc_notes text,
  qc_reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Brand Goals
CREATE TABLE IF NOT EXISTS public.brand_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Brand Notes
CREATE TABLE IF NOT EXISTS public.brand_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  admin_id uuid NOT NULL,
  note text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Brand Deliveries
CREATE TABLE IF NOT EXISTS public.brand_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  task_id uuid REFERENCES public.brand_tasks(id),
  freelancer_id uuid NOT NULL,
  files jsonb,
  notes text,
  is_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  is_visible_to_client boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Brand Invoices
CREATE TABLE IF NOT EXISTS public.brand_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  user_id uuid NOT NULL,
  invoice_number text NOT NULL,
  amount numeric DEFAULT 0,
  description text,
  status text DEFAULT 'pending',
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Project Tasks (Sub-tasks for requests)
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id),
  freelancer_id uuid,
  title text NOT NULL,
  description text,
  requirements text,
  payment_amount numeric,
  suggested_payment numeric,
  pricing_factors jsonb,
  status text DEFAULT 'pending', -- pending, assigned, in_progress, submitted, approved, rejected, completed
  deadline timestamptz,
  admin_notes text,
  delivery_files jsonb,
  delivery_notes text,
  freelancer_accepted boolean,
  freelancer_accepted_at timestamptz,
  assigned_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks (Assignment sub-tasks for internal tracking)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.assignments(id),
  request_id uuid REFERENCES public.requests(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- pending, in_progress, completed
  created_by uuid,
  assigned_to uuid,
  due_date timestamptz,
  completed_at timestamptz,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 📄 CMS TABLES
-- ============================================================

-- CMS Pages
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  title_ar text NOT NULL,
  content jsonb,
  page_blocks jsonb,
  meta_title text,
  meta_description text,
  og_image text,
  schema_type text DEFAULT 'WebPage',
  is_published boolean DEFAULT false,
  is_in_menu boolean DEFAULT false,
  menu_order integer,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CMS Sections
CREATE TABLE IF NOT EXISTS public.cms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.cms_pages(id),
  key text NOT NULL,
  title text,
  title_ar text,
  content text,
  content_ar text,
  image_url text,
  settings jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Navigation Items
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  label_ar text NOT NULL,
  url text NOT NULL,
  icon text,
  description text,
  location text DEFAULT 'header', -- header, footer, both
  visibility text DEFAULT 'all', -- all, logged_in, logged_out
  target text DEFAULT '_self',
  parent_id uuid REFERENCES public.navigation_items(id),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Header/Footer Settings
CREATE TABLE IF NOT EXISTS public.header_footer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type text NOT NULL, -- header, footer
  design_variant text DEFAULT 'modern',
  settings jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Site Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  category text, -- general, social, seo, payments
  is_public boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Settings (General system settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  group_name text DEFAULT 'general',
  type text DEFAULT 'string',
  description text,
  is_public boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  avatar_url text,
  content text NOT NULL,
  rating integer DEFAULT 5,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  source text,
  is_active boolean DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 📱 TELEGRAM TABLES
-- ============================================================

-- Telegram Link Codes
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text DEFAULT 'client',
  code text NOT NULL,
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Telegram Links
CREATE TABLE IF NOT EXISTS public.telegram_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text DEFAULT 'client',
  telegram_chat_id text NOT NULL,
  telegram_user_id text,
  telegram_username text,
  is_active boolean DEFAULT true,
  linked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Telegram Bot Messages
CREATE TABLE IF NOT EXISTS public.telegram_bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key text UNIQUE NOT NULL,
  message_template text NOT NULL,
  description text,
  variables text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Telegram Messages Log
CREATE TABLE IF NOT EXISTS public.telegram_messages_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  telegram_chat_id text,
  message_type text NOT NULL,
  message_text text,
  status text DEFAULT 'sent',
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 🔍 IDENTITY & VERIFICATION
-- ============================================================

-- Identity Verifications
CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text DEFAULT 'client',
  full_name text NOT NULL,
  national_id text NOT NULL,
  date_of_birth date,
  gender text,
  nationality text,
  address text NOT NULL,
  city text NOT NULL,
  governorate text,
  postal_code text,
  id_front_url text NOT NULL,
  id_back_url text NOT NULL,
  selfie_url text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_number text UNIQUE,
  subject text NOT NULL,
  message text NOT NULL,
  priority text DEFAULT 'normal',
  status text DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ticket Replies
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referrer_type text DEFAULT 'client',
  referral_code text NOT NULL,
  status text DEFAULT 'pending', -- pending, completed
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Referral Rewards
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text DEFAULT 'client',
  referral_count integer DEFAULT 0,
  rewards_earned numeric DEFAULT 0,
  last_reward_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 🔧 FUNCTIONS
-- ============================================================

-- Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'team_leader')
$$;

-- Check if request is assigned to freelancer
CREATE OR REPLACE FUNCTION public.is_request_assigned_to_freelancer(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.request_id = p_request_id
      AND a.freelancer_id = auth.uid()
      AND a.is_active = true
  );
$$;

-- Check if user owns request
CREATE OR REPLACE FUNCTION public.is_request_owner(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests r
    WHERE r.id = p_request_id
      AND r.user_id = auth.uid()
  );
$$;

-- Check if user can view request
CREATE OR REPLACE FUNCTION public.can_view_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_admin(auth.uid())
      OR public.is_request_owner(p_request_id)
      OR public.is_request_assigned_to_freelancer(p_request_id);
$$;

-- Generate request number
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.request_number := 'REQ-' || LPAD(NEXTVAL('public.request_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(NEXTVAL('public.order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(NEXTVAL('public.ticket_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Handle new user (creates profile and assigns role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  desired_role public.app_role;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email, 'مستخدم جديد'),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = now();

  -- Determine role from signup metadata
  desired_role := CASE
    WHEN (NEW.raw_user_meta_data ->> 'signup_role') = 'freelancer' THEN 'freelancer'::public.app_role
    WHEN (NEW.raw_user_meta_data ->> 'signup_role') = 'client' THEN 'client'::public.app_role
    ELSE 'client'::public.app_role
  END;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, desired_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create freelancer profile if freelancer
  IF desired_role = 'freelancer' THEN
    INSERT INTO public.freelancer_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Update track progress (triggered on lesson completion)
CREATE OR REPLACE FUNCTION public.update_track_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_track_id UUID;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_percentage NUMERIC(5,2);
BEGIN
  -- Get track_id from the lesson
  SELECT lm.track_id INTO v_track_id
  FROM learning_lessons ll
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE ll.id = NEW.lesson_id;

  IF v_track_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total active lessons in track
  SELECT COUNT(*) INTO v_total_lessons
  FROM learning_lessons ll
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE lm.track_id = v_track_id AND ll.is_active = true;

  -- Count completed lessons by user in track
  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_lesson_progress ulp
  JOIN learning_lessons ll ON ulp.lesson_id = ll.id
  JOIN learning_modules lm ON ll.module_id = lm.id
  WHERE ulp.user_id = NEW.user_id 
    AND lm.track_id = v_track_id 
    AND ulp.is_completed = true;

  -- Calculate percentage
  v_percentage := CASE 
    WHEN v_total_lessons > 0 THEN (v_completed_lessons::NUMERIC / v_total_lessons::NUMERIC) * 100 
    ELSE 0 
  END;

  -- Upsert track progress
  INSERT INTO user_track_progress (
    user_id, 
    track_id, 
    lessons_completed, 
    total_lessons, 
    progress_percentage, 
    completed_at,
    last_accessed_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_track_id,
    v_completed_lessons,
    v_total_lessons,
    v_percentage,
    CASE WHEN v_percentage >= 100 THEN now() ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (user_id, track_id)
  DO UPDATE SET
    lessons_completed = EXCLUDED.lessons_completed,
    total_lessons = EXCLUDED.total_lessons,
    progress_percentage = EXCLUDED.progress_percentage,
    completed_at = CASE 
      WHEN EXCLUDED.progress_percentage >= 100 AND user_track_progress.completed_at IS NULL 
      THEN now() 
      ELSE user_track_progress.completed_at 
    END,
    last_accessed_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Release task payment to freelancer
CREATE OR REPLACE FUNCTION public.release_task_payment(p_task_id uuid, p_task_type text, p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_freelancer_id uuid;
  v_payment_amount numeric;
  v_current_balance numeric;
  v_new_balance numeric;
  v_request_id uuid;
BEGIN
  -- Get task details based on type
  IF p_task_type = 'assignment' THEN
    SELECT freelancer_id, payment_amount, request_id
    INTO v_freelancer_id, v_payment_amount, v_request_id
    FROM assignments
    WHERE id = p_task_id AND is_active = true;
  ELSIF p_task_type = 'project_task' THEN
    SELECT freelancer_id, payment_amount, request_id
    INTO v_freelancer_id, v_payment_amount, v_request_id
    FROM project_tasks
    WHERE id = p_task_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid task type');
  END IF;

  IF v_freelancer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or no freelancer assigned');
  END IF;

  IF v_payment_amount IS NULL OR v_payment_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment amount');
  END IF;

  -- Get current wallet balance
  SELECT COALESCE(balance_after, 0)
  INTO v_current_balance
  FROM wallet_ledger
  WHERE user_id = v_freelancer_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_new_balance := v_current_balance + v_payment_amount;

  -- Insert wallet ledger entry
  INSERT INTO wallet_ledger (
    user_id,
    amount,
    balance_after,
    type,
    reason,
    reference_type,
    reference_id,
    created_by
  ) VALUES (
    v_freelancer_id,
    v_payment_amount,
    v_new_balance,
    'credit',
    'دفعة مهمة - ' || CASE WHEN p_task_type = 'assignment' THEN 'تعيين' ELSE 'مهمة فرعية' END,
    p_task_type,
    p_task_id,
    p_admin_id
  );

  -- Update freelancer total_earnings
  UPDATE freelancer_profiles
  SET total_earnings = COALESCE(total_earnings, 0) + v_payment_amount
  WHERE user_id = v_freelancer_id;

  -- Mark task as completed
  IF p_task_type = 'assignment' THEN
    UPDATE assignments SET completed_at = now() WHERE id = p_task_id;
  ELSIF p_task_type = 'project_task' THEN
    UPDATE project_tasks SET status = 'completed', completed_at = now() WHERE id = p_task_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'freelancer_id', v_freelancer_id,
    'amount', v_payment_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- Create request with credits deduction
CREATE OR REPLACE FUNCTION public.create_request_with_credits(
  p_user_id uuid, 
  p_request_id uuid, 
  p_idempotency_key text, 
  p_category_id uuid, 
  p_title text, 
  p_description text, 
  p_size task_size, 
  p_deadline timestamp with time zone, 
  p_files jsonb
)
RETURNS requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_existing public.requests%ROWTYPE;
  v_required integer;
  v_sub public.client_subscriptions%ROWTYPE;
  v_wallet_balance integer;
  v_remaining integer;
  v_new_wallet_balance integer;
  v_request public.requests%ROWTYPE;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.requests
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- Calculate required credits
  v_required := CASE p_size
    WHEN 'micro' THEN 1
    WHEN 'small' THEN 3
    WHEN 'medium' THEN 5
    WHEN 'large' THEN 10
    ELSE 0
  END;

  IF v_required <= 0 THEN
    RAISE EXCEPTION 'Invalid task size';
  END IF;

  -- Lock active subscription
  SELECT * INTO v_sub
  FROM public.client_subscriptions
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- Get wallet balance
  SELECT COALESCE(
    (SELECT balance_after FROM public.credits_ledger WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1),
    0
  ) INTO v_wallet_balance;

  -- Check sufficient credits
  IF COALESCE(v_sub.credits_remaining, 0) + v_wallet_balance < v_required THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Create request
  INSERT INTO public.requests (
    id, user_id, category_id, title, description, size, 
    deadline, credits_cost, status, files, idempotency_key
  ) VALUES (
    p_request_id, p_user_id, p_category_id, p_title, 
    NULLIF(p_description, ''), p_size, p_deadline, 
    v_required, 'submitted', p_files, p_idempotency_key
  )
  RETURNING * INTO v_request;

  v_remaining := v_required;

  -- Deduct from subscription first
  IF v_sub.id IS NOT NULL AND COALESCE(v_sub.credits_remaining, 0) > 0 THEN
    IF v_sub.credits_remaining >= v_remaining THEN
      UPDATE public.client_subscriptions
      SET credits_remaining = credits_remaining - v_remaining, updated_at = now()
      WHERE id = v_sub.id;
      v_remaining := 0;
    ELSE
      UPDATE public.client_subscriptions
      SET credits_remaining = 0, updated_at = now()
      WHERE id = v_sub.id;
      v_remaining := v_remaining - v_sub.credits_remaining;
    END IF;
  END IF;

  -- Deduct remaining from wallet
  IF v_remaining > 0 THEN
    v_new_wallet_balance := v_wallet_balance - v_remaining;

    INSERT INTO public.credits_ledger (
      user_id, type, amount, balance_after, reason, reference_type, reference_id
    ) VALUES (
      p_user_id, 'request_debit', -v_remaining, v_new_wallet_balance,
      'خصم كريديت لإنشاء طلب ' || v_request.request_number, 'request', v_request.id
    );
  END IF;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (p_user_id, 'request', 'تم استلام طلبك', 
          'تم إنشاء الطلب رقم ' || v_request.request_number || ' بنجاح.', 
          'request', v_request.id);

  RETURN v_request;
END;
$$;

-- Fulfill paid order
CREATE OR REPLACE FUNCTION public.fulfill_paid_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _order RECORD;
  _item RECORD;
  _product RECORD;
  _current_sub RECORD;
  _new_credits integer := 0;
BEGIN
  SELECT * INTO _order FROM orders WHERE id = _order_id;
  IF _order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  
  -- Idempotency check
  IF EXISTS (SELECT 1 FROM credits_ledger WHERE reference_type = 'order' AND reference_id = _order_id)
     OR EXISTS (SELECT 1 FROM course_enrollments WHERE order_id = _order_id) THEN
    RETURN;
  END IF;
  
  FOR _item IN SELECT * FROM order_items WHERE order_id = _order_id LOOP
    SELECT * INTO _product FROM products WHERE id = _item.product_id;
    IF _product IS NULL THEN CONTINUE; END IF;
    
    -- Handle credit packs
    IF _product.type = 'credit_pack' AND _product.credits > 0 THEN
      _new_credits := _new_credits + (_product.credits * _item.quantity);
    END IF;
    
    -- Handle subscriptions
    IF _product.type = 'subscription' AND _product.plan_id IS NOT NULL THEN
      UPDATE client_subscriptions SET is_active = false WHERE user_id = _order.user_id AND is_active = true;
      
      DECLARE _plan RECORD;
      BEGIN
        SELECT * INTO _plan FROM plans WHERE id = _product.plan_id;
        IF _plan IS NOT NULL THEN
          INSERT INTO client_subscriptions (user_id, plan_id, credits_remaining, starts_at, expires_at, is_active)
          VALUES (_order.user_id, _product.plan_id, _plan.credits_per_month, now(), now() + interval '30 days', true);
        END IF;
      END;
    END IF;
    
    -- Handle courses
    IF _product.type = 'course' AND _product.track_id IS NOT NULL THEN
      UPDATE course_enrollments SET is_active = false 
      WHERE user_id = _order.user_id AND track_id = _product.track_id;
      
      INSERT INTO course_enrollments (user_id, track_id, order_id, is_active, enrolled_at, progress_percentage)
      VALUES (_order.user_id, _product.track_id, _order_id, true, now(), 0);
      
      UPDATE learning_tracks SET enrollment_count = COALESCE(enrollment_count, 0) + 1
      WHERE id = _product.track_id;
    END IF;
  END LOOP;
  
  -- Add credits
  IF _new_credits > 0 THEN
    SELECT * INTO _current_sub FROM client_subscriptions 
    WHERE user_id = _order.user_id AND is_active = true LIMIT 1;
    
    IF _current_sub IS NULL THEN
      INSERT INTO client_subscriptions (user_id, plan_id, credits_remaining, is_active)
      SELECT _order.user_id, id, _new_credits, true FROM plans WHERE is_free = true LIMIT 1;
    ELSE
      UPDATE client_subscriptions 
      SET credits_remaining = credits_remaining + _new_credits, updated_at = now()
      WHERE id = _current_sub.id;
    END IF;
    
    INSERT INTO credits_ledger (user_id, type, amount, balance_after, reason, reference_type, reference_id)
    SELECT _order.user_id, 'credit', _new_credits,
      COALESCE((SELECT credits_remaining FROM client_subscriptions WHERE user_id = _order.user_id AND is_active = true LIMIT 1), _new_credits),
      'شراء كريديت - طلب #' || _order.order_number, 'order', _order_id;
  END IF;
  
  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (_order.user_id, 'order', 'تم تأكيد طلبك', 
          'تم تأكيد طلب الشراء رقم ' || _order.order_number || ' وإضافة الرصيد إلى حسابك', 
          'order', _order_id);
END;
$$;

-- Telegram link code generation
CREATE OR REPLACE FUNCTION public.generate_telegram_link_code(p_user_id uuid, p_user_type text DEFAULT 'client')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_user_type NOT IN ('client', 'freelancer', 'admin') THEN
    p_user_type := 'client';
  END IF;

  v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  v_expires_at := now() + interval '10 minutes';
  
  DELETE FROM public.telegram_link_codes WHERE user_id = p_user_id AND used_at IS NULL;
  
  INSERT INTO public.telegram_link_codes (user_id, user_type, code, expires_at)
  VALUES (p_user_id, p_user_type, v_code, v_expires_at);
  
  RETURN v_code;
END;
$$;

-- Verify Telegram link code
CREATE OR REPLACE FUNCTION public.verify_telegram_link_code(
  p_code text, 
  p_telegram_chat_id text, 
  p_telegram_user_id text DEFAULT NULL, 
  p_telegram_username text DEFAULT NULL
)
RETURNS TABLE(success boolean, user_id uuid, user_type text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_link_code RECORD;
BEGIN
  SELECT * INTO v_link_code
  FROM public.telegram_link_codes
  WHERE code = upper(p_code) AND used_at IS NULL AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'الكود غير صالح أو منتهي الصلاحية'::TEXT;
    RETURN;
  END IF;
  
  UPDATE public.telegram_links SET is_active = false, updated_at = now()
  WHERE telegram_links.user_id = v_link_code.user_id AND is_active = true;
  
  UPDATE public.telegram_links SET is_active = false, updated_at = now()
  WHERE telegram_chat_id = p_telegram_chat_id AND is_active = true;
  
  INSERT INTO public.telegram_links (user_id, user_type, telegram_chat_id, telegram_user_id, telegram_username, is_active)
  VALUES (v_link_code.user_id, v_link_code.user_type, p_telegram_chat_id, p_telegram_user_id, p_telegram_username, true);
  
  UPDATE public.telegram_link_codes SET used_at = now() WHERE id = v_link_code.id;
  
  RETURN QUERY SELECT true, v_link_code.user_id, v_link_code.user_type, 'تم ربط الحساب بنجاح'::TEXT;
END;
$$;

-- Get verification settings
CREATE OR REPLACE FUNCTION public.get_verification_settings()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'client_identity_required', COALESCE((SELECT (value::text)::boolean FROM settings WHERE key = 'client_identity_required'), false),
    'freelancer_identity_required', COALESCE((SELECT (value::text)::boolean FROM settings WHERE key = 'freelancer_identity_required'), false)
  );
$$;

-- ============================================================
-- 🔄 TRIGGERS
-- ============================================================

-- Request number trigger
DROP TRIGGER IF EXISTS set_request_number ON public.requests;
CREATE TRIGGER set_request_number
  BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_request_number();

-- Order number trigger
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Ticket number trigger
DROP TRIGGER IF EXISTS set_ticket_number ON public.support_tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_requests_updated_at ON public.requests;
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_freelancer_profiles_updated_at ON public.freelancer_profiles;
CREATE TRIGGER update_freelancer_profiles_updated_at
  BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track progress trigger
DROP TRIGGER IF EXISTS trigger_update_track_progress ON public.user_lesson_progress;
CREATE TRIGGER trigger_update_track_progress
  AFTER INSERT OR UPDATE ON public.user_lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_track_progress();

-- Handle new user trigger (on auth.users)
-- Note: This trigger is created on auth.users table
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 🔐 ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 👁️ VIEWS
-- ============================================================

-- Safe assignments view (hides payment info for non-admins)
CREATE OR REPLACE VIEW public.assignments_safe AS
SELECT 
  id,
  request_id,
  freelancer_id,
  assigned_at,
  started_at,
  completed_at,
  is_active,
  notes,
  assigned_by
FROM public.assignments;

-- Safe public freelancer profiles view (only non-sensitive data for verified freelancers)
CREATE OR REPLACE VIEW public.freelancer_public_profiles 
WITH (security_invoker=true) AS
SELECT 
  fp.id,
  encode(sha256(fp.user_id::text::bytea), 'hex') AS display_id,
  fp.bio,
  fp.skills,
  fp.categories,
  fp.rating,
  fp.completed_tasks,
  fp.is_verified,
  fp.is_available
FROM public.freelancer_profiles fp
WHERE fp.is_verified = true AND fp.is_available = true;

-- Safe orders view
CREATE OR REPLACE VIEW public.orders_safe AS
SELECT 
  id,
  user_id,
  order_number,
  subtotal,
  discount,
  tax,
  total,
  coupon_id,
  status,
  paid_at,
  created_at,
  updated_at
FROM public.orders;

-- ============================================================
-- 🔐 ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Freelancer Profiles Policies
DROP POLICY IF EXISTS "Freelancers and admins can view profiles" ON public.freelancer_profiles;
CREATE POLICY "Freelancers and admins can view profiles"
  ON public.freelancer_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Freelancers can insert own profile" ON public.freelancer_profiles;
CREATE POLICY "Freelancers can insert own profile"
  ON public.freelancer_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Freelancers can manage their own profile" ON public.freelancer_profiles;
CREATE POLICY "Freelancers can manage their own profile"
  ON public.freelancer_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all freelancer profiles" ON public.freelancer_profiles;
CREATE POLICY "Admins can manage all freelancer profiles"
  ON public.freelancer_profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Settings Table Policies
DROP POLICY IF EXISTS "Authenticated users can read safe public settings" ON public.settings;
CREATE POLICY "Authenticated users can read safe public settings"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    AND key NOT LIKE '%secret%'
    AND key NOT LIKE '%password%'
    AND key NOT LIKE '%token%'
    AND key NOT LIKE '%key%'
  );

DROP POLICY IF EXISTS "Admins full access to settings" ON public.settings;
CREATE POLICY "Admins full access to settings"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Grant permissions on views
GRANT SELECT ON public.freelancer_public_profiles TO authenticated;
REVOKE SELECT ON public.freelancer_public_profiles FROM anon;

-- ============================================================
-- 📦 STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('request-files', 'request-files', false),
  ('training-files', 'training-files', false),
  ('identity-documents', 'identity-documents', false),
  ('course-resources', 'course-resources', true),
  ('brand-assets', 'brand-assets', false),
  ('deliveries', 'deliveries', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

-- ============================================================
-- 📊 INITIAL DATA
-- ============================================================

-- Default categories
INSERT INTO public.categories (name, name_ar, icon, sort_order) VALUES
('Graphic Design', 'تصميم جرافيك', 'Palette', 1),
('Content Writing', 'كتابة محتوى', 'FileText', 2),
('Web Development', 'تطوير ويب', 'Code', 3),
('Video Editing', 'مونتاج فيديو', 'Video', 4),
('Motion Graphics', 'موشن جرافيك', 'Clapperboard', 5),
('Social Media', 'سوشيال ميديا', 'Share2', 6),
('UI/UX Design', 'تصميم واجهات', 'Layout', 7),
('Translation', 'ترجمة', 'Languages', 8)
ON CONFLICT DO NOTHING;

-- Default free plan
INSERT INTO public.plans (name, name_ar, price, credits_per_month, is_free, is_active, sort_order) VALUES
('Free', 'مجاني', 0, 3, true, true, 1),
('Basic', 'أساسي', 299, 10, false, true, 2),
('Pro', 'احترافي', 599, 25, false, true, 3),
('Enterprise', 'مؤسسي', 999, 50, false, true, 4)
ON CONFLICT DO NOTHING;

-- Default site settings
INSERT INTO public.site_settings (key, value, category, is_public) VALUES
('site_name', '"Sity Experts"', 'general', true),
('site_name_ar', '"سيتي إكسبرتس"', 'general', true),
('site_description', '"منصة العمل الحر الأولى في مصر"', 'general', true),
('support_email', '"support@sityexperts.com"', 'general', true),
('social_facebook', '""', 'social', true),
('social_twitter', '""', 'social', true),
('social_instagram', '""', 'social', true),
('social_linkedin', '""', 'social', true),
('social_youtube', '""', 'social', true),
('social_tiktok', '""', 'social', true)
ON CONFLICT (key) DO NOTHING;

-- Default verification settings
INSERT INTO public.settings (key, value, group_name, type, is_public) VALUES
('client_identity_required', 'false', 'verification', 'boolean', false),
('freelancer_identity_required', 'true', 'verification', 'boolean', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ✅ SCHEMA COMPLETE
-- ============================================================
