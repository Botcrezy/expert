-- =====================================================
-- Fix admin portfolios embed + extend Telegram templates/variables
-- =====================================================

-- 1) Add FKs so embedding profiles/freelancer_profiles works (PostgREST relationship cache)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'freelancer_portfolios_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.freelancer_portfolios
      ADD CONSTRAINT freelancer_portfolios_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
      NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'freelancer_portfolios_user_id_freelancer_profiles_fkey'
  ) THEN
    ALTER TABLE public.freelancer_portfolios
      ADD CONSTRAINT freelancer_portfolios_user_id_freelancer_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.freelancer_profiles(user_id)
      NOT VALID;
  END IF;
END $$;

-- Validate (safe because we checked data consistency in app already)
ALTER TABLE public.freelancer_portfolios
  VALIDATE CONSTRAINT freelancer_portfolios_user_id_profiles_fkey;

ALTER TABLE public.freelancer_portfolios
  VALIDATE CONSTRAINT freelancer_portfolios_user_id_freelancer_profiles_fkey;


-- 2) Ensure idempotent unique indexes exist for Telegram upserts
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS notification_rules_event_key_uq
    ON public.notification_rules(event_key);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'notification_rules table not found - skipping index creation';
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS telegram_bot_messages_message_key_uq
    ON public.telegram_bot_messages(message_key);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'telegram_bot_messages table not found - skipping index creation';
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS telegram_template_variables_uq
    ON public.telegram_template_variables(audience, message_key, variable_name);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'telegram_template_variables table not found - skipping index creation';
END $$;


-- 3) Add missing admin event keys used by the platform (notifyTelegramAdmin)
WITH rules(event_key, description, channel_in_app, channel_telegram, is_enabled) AS (
  VALUES
    ('admin_user_registered_client', 'إشعار الأدمن بتسجيل عميل جديد', true, true, true),
    ('admin_user_registered_freelancer', 'إشعار الأدمن بتسجيل فريلانسر جديد', true, true, true),
    ('admin_identity_submitted_client', 'إشعار الأدمن بإرسال تحقق هوية (عميل)', true, true, true),
    ('admin_identity_submitted_freelancer', 'إشعار الأدمن بإرسال تحقق هوية (فريلانسر)', true, true, true),
    ('admin_withdrawal_requested', 'إشعار الأدمن بطلب سحب جديد', true, true, true),
    ('admin_delivery_pending_qc', 'إشعار الأدمن بتسليم ينتظر QC', true, true, true),
    ('admin_request_created', 'إشعار الأدمن بطلب جديد تم إنشاؤه', true, true, true)
)
INSERT INTO public.notification_rules (event_key, description, channel_in_app, channel_telegram, is_enabled)
SELECT r.event_key, r.description, r.channel_in_app, r.channel_telegram, r.is_enabled
FROM rules r
ON CONFLICT (event_key) DO UPDATE
SET
  description = EXCLUDED.description,
  channel_in_app = EXCLUDED.channel_in_app,
  channel_telegram = EXCLUDED.channel_telegram,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();


-- 4) Telegram templates for these admin events
WITH msgs(message_key, audience, description, variables, message_template) AS (
  VALUES
    ('admin_user_registered_client', 'admin', 'تسجيل عميل جديد',
      ARRAY['user_name','user_email','admin_url'],
      '👤 <b>عميل جديد سجّل في المنصة</b>\n\n👤 الاسم: {user_name}\n📧 البريد: {user_email}\n\n🔗 لوحة التحكم: {admin_url}'),

    ('admin_user_registered_freelancer', 'admin', 'تسجيل فريلانسر جديد',
      ARRAY['user_name','user_email','admin_url'],
      '👨‍💻 <b>فريلانسر جديد سجّل في المنصة</b>\n\n👤 الاسم: {user_name}\n📧 البريد: {user_email}\n\n🔗 لوحة التحكم: {admin_url}'),

    ('admin_identity_submitted_client', 'admin', 'تحقق هوية (عميل)',
      ARRAY['full_name','national_id','admin_url'],
      '🔐 <b>طلب تحقق هوية جديد (عميل)</b>\n\n👤 الاسم: {full_name}\n🪪 الرقم القومي: {national_id}\n\n🔗 المراجعة: {admin_url}'),

    ('admin_identity_submitted_freelancer', 'admin', 'تحقق هوية (فريلانسر)',
      ARRAY['full_name','national_id','admin_url'],
      '🔐 <b>طلب تحقق هوية جديد (فريلانسر)</b>\n\n👤 الاسم: {full_name}\n🪪 الرقم القومي: {national_id}\n\n🔗 المراجعة: {admin_url}'),

    ('admin_withdrawal_requested', 'admin', 'طلب سحب جديد',
      ARRAY['freelancer_name','amount','method','admin_url'],
      '💳 <b>طلب سحب جديد</b>\n\n👤 الفريلانسر: {freelancer_name}\n💵 المبلغ: {amount}\n📝 الطريقة: {method}\n\n🔗 فتح الطلب: {admin_url}'),

    ('admin_delivery_pending_qc', 'admin', 'تسليم ينتظر QC',
      ARRAY['request_number','title','freelancer_name','admin_url'],
      '🔍 <b>تسليم ينتظر QC</b>\n\n📌 رقم الطلب: {request_number}\n📋 المهمة: {title}\n👨‍💻 الفريلانسر: {freelancer_name}\n\n🔗 مراجعة QC: {admin_url}'),

    ('admin_request_created', 'admin', 'طلب جديد',
      ARRAY['request_number','title','client_name','admin_url'],
      '🔔 <b>تم إنشاء طلب جديد</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n👤 العميل: {client_name}\n\n🔗 فتح الطلب: {admin_url}')
)
INSERT INTO public.telegram_bot_messages (
  message_key,
  message_template,
  description,
  variables,
  is_active,
  audience,
  event_key,
  created_at,
  updated_at
)
SELECT
  m.message_key,
  m.message_template,
  m.description,
  m.variables,
  true,
  m.audience,
  m.message_key,
  now(),
  now()
FROM msgs m
ON CONFLICT (message_key) DO UPDATE
SET
  message_template = EXCLUDED.message_template,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  is_active = true,
  audience = EXCLUDED.audience,
  event_key = EXCLUDED.event_key,
  updated_at = now();


-- 5) Telegram variable documentation for these admin events
WITH vars(audience, message_key, variable_name, description, sample_value) AS (
  VALUES
    ('admin','admin_user_registered_client','user_name','اسم المستخدم','محمد أحمد'),
    ('admin','admin_user_registered_client','user_email','بريد المستخدم','mohamed@example.com'),
    ('admin','admin_user_registered_client','admin_url','رابط لوحة التحكم','https://expert.sity.cloud/admin/users'),

    ('admin','admin_user_registered_freelancer','user_name','اسم المستخدم','أحمد علي'),
    ('admin','admin_user_registered_freelancer','user_email','بريد المستخدم','ahmed@example.com'),
    ('admin','admin_user_registered_freelancer','admin_url','رابط لوحة التحكم','https://expert.sity.cloud/admin/users'),

    ('admin','admin_identity_submitted_client','full_name','الاسم في التحقق','محمد أحمد'),
    ('admin','admin_identity_submitted_client','national_id','الرقم القومي','12345678901234'),
    ('admin','admin_identity_submitted_client','admin_url','رابط المراجعة','https://expert.sity.cloud/admin/verifications'),

    ('admin','admin_identity_submitted_freelancer','full_name','الاسم في التحقق','أحمد علي'),
    ('admin','admin_identity_submitted_freelancer','national_id','الرقم القومي','12345678901234'),
    ('admin','admin_identity_submitted_freelancer','admin_url','رابط المراجعة','https://expert.sity.cloud/admin/verifications'),

    ('admin','admin_withdrawal_requested','freelancer_name','اسم الفريلانسر','أحمد علي'),
    ('admin','admin_withdrawal_requested','amount','قيمة السحب','500'),
    ('admin','admin_withdrawal_requested','method','طريقة السحب','InstaPay'),
    ('admin','admin_withdrawal_requested','admin_url','رابط الطلب','https://expert.sity.cloud/admin/withdrawals'),

    ('admin','admin_delivery_pending_qc','request_number','رقم الطلب','REQ-000123'),
    ('admin','admin_delivery_pending_qc','title','عنوان المهمة/الطلب','تصميم شعار'),
    ('admin','admin_delivery_pending_qc','freelancer_name','اسم الفريلانسر','أحمد'),
    ('admin','admin_delivery_pending_qc','admin_url','رابط QC','https://expert.sity.cloud/admin/qc'),

    ('admin','admin_request_created','request_number','رقم الطلب','REQ-000123'),
    ('admin','admin_request_created','title','عنوان الطلب','تصميم شعار'),
    ('admin','admin_request_created','client_name','اسم العميل','محمد'),
    ('admin','admin_request_created','admin_url','رابط الطلب','https://expert.sity.cloud/admin/requests')
)
INSERT INTO public.telegram_template_variables (audience, message_key, variable_name, description, sample_value)
SELECT v.audience, v.message_key, v.variable_name, v.description, v.sample_value
FROM vars v
ON CONFLICT (audience, message_key, variable_name) DO UPDATE
SET
  description = EXCLUDED.description,
  sample_value = EXCLUDED.sample_value;