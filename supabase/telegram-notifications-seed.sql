-- =====================================================
-- Telegram Notifications Seed (Rules + Templates)
-- Scope: Existing events used in the app (Option 1=A)
-- Admin delivery: Single admin chat_id via TELEGRAM_ADMIN_USER_ID (Option 2=B)
--
-- الهدف:
-- 1) إضافة قواعد notification_rules لكل events الموجودة
-- 2) إضافة قوالب telegram_bot_messages جاهزة لكل event
-- 3) (اختياري) إضافة توثيق متغيرات telegram_template_variables
--
-- ملاحظة: هذا الملف Idempotent (يمكن تشغيله أكثر من مرة).
-- =====================================================

-- -----------------------------------------------------
-- Safety: Ensure unique indexes exist for idempotent upserts
-- -----------------------------------------------------
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS notification_rules_event_key_uq ON public.notification_rules(event_key);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'notification_rules table not found - skipping index creation';
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS telegram_bot_messages_message_key_uq ON public.telegram_bot_messages(message_key);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'telegram_bot_messages table not found - skipping index creation';
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS telegram_template_variables_uq ON public.telegram_template_variables(audience, message_key, variable_name);
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'telegram_template_variables table not found - skipping index creation';
END $$;

-- -----------------------------------------------------
-- 1) notification_rules (Telegram enabled by default)
-- -----------------------------------------------------
WITH rules(event_key, description, channel_in_app, channel_telegram, is_enabled) AS (
  VALUES
    ('request_created', 'إشعار العميل عند إنشاء طلب جديد', true, true, true),
    ('request_approved', 'إشعار العميل عند اعتماد الطلب', true, true, true),
    ('request_assigned', 'إشعار العميل عند تعيين فريلانسر للطلب', true, true, true),
    ('request_in_progress', 'إشعار العميل عند بدء العمل على الطلب', true, true, true),
    ('request_delivered', 'إشعار العميل عند تسليم الطلب', true, true, true),
    ('request_completed', 'إشعار العميل عند اكتمال الطلب', true, true, true),
    ('request_cancelled', 'إشعار العميل عند إلغاء الطلب', true, true, true),

    ('task_assigned', 'إشعار الفريلانسر عند تعيين مهمة', true, true, true),
    ('delivery_submitted', 'إشعار الفريلانسر بتأكيد إرسال التسليم', true, true, true),
    ('qc_approved', 'إشعار الفريلانسر بقبول الـ QC', true, true, true),
    ('qc_rejected', 'إشعار الفريلانسر برفض الـ QC وطلب تعديلات', true, true, true),

    ('withdrawal_approved', 'إشعار الفريلانسر بالموافقة على السحب', true, true, true),
    ('withdrawal_rejected', 'إشعار الفريلانسر برفض السحب', true, true, true),

    ('admin_new_request', 'إشعار الأدمن بطلب جديد', true, true, true),
    ('admin_pending_qc', 'إشعار الأدمن بتسليم ينتظر QC', true, true, true),
    ('admin_withdrawal_request', 'إشعار الأدمن بطلب سحب جديد', true, true, true),
    ('admin_verification_request', 'إشعار الأدمن بطلب تحقق هوية جديد', true, true, true),

    ('custom', 'رسائل مخصصة/اختبار', true, true, true)
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

-- -----------------------------------------------------
-- 2) telegram_bot_messages (Templates)
-- NOTE: These templates support {var} and {{var}} placeholders.
-- -----------------------------------------------------
WITH msgs(message_key, audience, description, variables, message_template) AS (
  VALUES
    -- Client
    ('request_created', 'client', 'إنشاء طلب جديد', ARRAY['request_number','title','size','credits_cost'],
'🎉 <b>تم إنشاء طلبك بنجاح</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n📐 الحجم: {size}\n💳 الكريديت: {credits_cost}\n\n⏳ سيتم مراجعة الطلب قريباً'),

    ('request_approved', 'client', 'اعتماد الطلب', ARRAY['request_number','title'],
'✅ <b>تم اعتماد طلبك</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n\n🔄 جاري تعيين فريلانسر مناسب'),

    ('request_assigned', 'client', 'تعيين فريلانسر', ARRAY['request_number','title'],
'👨‍💻 <b>تم تعيين فريلانسر لطلبك</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n\n🚀 بدأ العمل الآن'),

    ('request_in_progress', 'client', 'بدء التنفيذ', ARRAY['request_number','title'],
'🔄 <b>طلبك قيد التنفيذ</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}'),

    ('request_delivered', 'client', 'تسليم الطلب', ARRAY['request_number','title'],
'📦 <b>تم تسليم طلبك</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n\n✅ راجع التسليم من داخل المنصة'),

    ('request_completed', 'client', 'اكتمال الطلب', ARRAY['request_number','title'],
'🏆 <b>تم اكتمال طلبك</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n\n⭐ شكراً لثقتك بنا'),

    ('request_cancelled', 'client', 'إلغاء الطلب', ARRAY['request_number','title','reason'],
'❌ <b>تم إلغاء طلبك</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n📝 السبب: {reason}'),

    -- Freelancer
    ('task_assigned', 'freelancer', 'تعيين مهمة جديدة', ARRAY['title','request_number','deadline','payment_amount'],
'🎯 <b>مهمة جديدة</b>\n\n📋 العنوان: {title}\n📌 رقم الطلب: {request_number}\n⏳ الموعد النهائي: {deadline}\n💰 المبلغ: {payment_amount} ج.م'),

    ('delivery_submitted', 'freelancer', 'تأكيد إرسال التسليم', ARRAY['title','request_number'],
'📤 <b>تم إرسال التسليم بنجاح</b>\n\n📋 المهمة: {title}\n📌 رقم الطلب: {request_number}\n\n⏳ في انتظار مراجعة QC'),

    ('qc_approved', 'freelancer', 'قبول QC', ARRAY['title','payment_amount'],
'🎉 <b>تم قبول التسليم</b>\n\n📋 المهمة: {title}\n💰 المبلغ: {payment_amount} ج.م\n\n✅ تم إضافة المبلغ لمحفظتك'),

    ('qc_rejected', 'freelancer', 'رفض QC', ARRAY['title','qc_notes'],
'🔄 <b>التسليم يحتاج تعديلات</b>\n\n📋 المهمة: {title}\n📝 ملاحظات QC: {qc_notes}\n\n⏳ يرجى التعديل وإعادة التسليم'),

    ('withdrawal_approved', 'freelancer', 'الموافقة على السحب', ARRAY['amount','method'],
'✅ <b>تمت الموافقة على طلب السحب</b>\n\n💵 المبلغ: {amount} ج.م\n📝 الطريقة: {method}\n\n⏳ سيتم التحويل خلال 24-48 ساعة'),

    ('withdrawal_rejected', 'freelancer', 'رفض السحب', ARRAY['amount','reason'],
'❌ <b>تم رفض طلب السحب</b>\n\n💵 المبلغ: {amount} ج.م\n📝 السبب: {reason}\n\n💳 تم إرجاع المبلغ لمحفظتك'),

    -- Admin (Option 2=B: single admin chat id is handled by telegram-send)
    ('admin_new_request', 'admin', 'طلب جديد للأدمن', ARRAY['request_number','title','size','credits_cost','client_name'],
'🔔 <b>طلب جديد</b>\n\n📌 رقم الطلب: {request_number}\n📋 العنوان: {title}\n📐 الحجم: {size}\n💳 الكريديت: {credits_cost}\n👤 العميل: {client_name}'),

    ('admin_pending_qc', 'admin', 'تسليم ينتظر QC', ARRAY['request_number','title','freelancer_name'],
'🔍 <b>تسليم ينتظر QC</b>\n\n📌 رقم الطلب: {request_number}\n📋 المهمة: {title}\n👨‍💻 الفريلانسر: {freelancer_name}'),

    ('admin_withdrawal_request', 'admin', 'طلب سحب جديد', ARRAY['freelancer_name','amount','method'],
'💳 <b>طلب سحب جديد</b>\n\n👤 الفريلانسر: {freelancer_name}\n💵 المبلغ: {amount} ج.م\n📝 الطريقة: {method}'),

    ('admin_verification_request', 'admin', 'طلب تحقق هوية جديد', ARRAY['full_name','user_type'],
'🔐 <b>طلب تحقق هوية</b>\n\n👤 المستخدم: {full_name}\n📋 النوع: {user_type}'),

    -- Utility
    ('custom', 'all', 'رسالة مخصصة/اختبار', ARRAY['message'], '{message}')
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

-- -----------------------------------------------------
-- 3) telegram_template_variables (Optional documentation)
-- -----------------------------------------------------
WITH vars(audience, message_key, variable_name, description, sample_value) AS (
  VALUES
    ('client','request_created','request_number','رقم الطلب','REQ-000123'),
    ('client','request_created','title','عنوان الطلب','تصميم شعار'),
    ('client','request_created','size','حجم الطلب','small'),
    ('client','request_created','credits_cost','الكريديت المستخدم','3'),

    ('client','request_approved','request_number','رقم الطلب','REQ-000123'),
    ('client','request_approved','title','عنوان الطلب','تصميم شعار'),

    ('client','request_assigned','request_number','رقم الطلب','REQ-000123'),
    ('client','request_assigned','title','عنوان الطلب','تصميم شعار'),

    ('client','request_in_progress','request_number','رقم الطلب','REQ-000123'),
    ('client','request_in_progress','title','عنوان الطلب','تصميم شعار'),

    ('client','request_delivered','request_number','رقم الطلب','REQ-000123'),
    ('client','request_delivered','title','عنوان الطلب','تصميم شعار'),

    ('client','request_completed','request_number','رقم الطلب','REQ-000123'),
    ('client','request_completed','title','عنوان الطلب','تصميم شعار'),

    ('client','request_cancelled','request_number','رقم الطلب','REQ-000123'),
    ('client','request_cancelled','title','عنوان الطلب','تصميم شعار'),
    ('client','request_cancelled','reason','سبب الإلغاء','طلب مكرر'),

    ('freelancer','task_assigned','title','عنوان المهمة','تصميم بانر'),
    ('freelancer','task_assigned','request_number','رقم الطلب','REQ-000123'),
    ('freelancer','task_assigned','deadline','الموعد النهائي','2026-01-30'),
    ('freelancer','task_assigned','payment_amount','مبلغ المهمة','250'),

    ('freelancer','delivery_submitted','title','عنوان المهمة','تصميم بانر'),
    ('freelancer','delivery_submitted','request_number','رقم الطلب','REQ-000123'),

    ('freelancer','qc_approved','title','عنوان المهمة','تصميم بانر'),
    ('freelancer','qc_approved','payment_amount','مبلغ المهمة','250'),

    ('freelancer','qc_rejected','title','عنوان المهمة','تصميم بانر'),
    ('freelancer','qc_rejected','qc_notes','ملاحظات الجودة','عدّل الألوان'),

    ('freelancer','withdrawal_approved','amount','قيمة السحب','500'),
    ('freelancer','withdrawal_approved','method','طريقة السحب','Vodafone Cash'),

    ('freelancer','withdrawal_rejected','amount','قيمة السحب','500'),
    ('freelancer','withdrawal_rejected','reason','سبب الرفض','بيانات ناقصة'),

    ('admin','admin_new_request','request_number','رقم الطلب','REQ-000123'),
    ('admin','admin_new_request','title','عنوان الطلب','تصميم شعار'),
    ('admin','admin_new_request','size','حجم الطلب','small'),
    ('admin','admin_new_request','credits_cost','كريديت الطلب','3'),
    ('admin','admin_new_request','client_name','اسم العميل','محمد'),

    ('admin','admin_pending_qc','request_number','رقم الطلب','REQ-000123'),
    ('admin','admin_pending_qc','title','عنوان الطلب','تصميم شعار'),
    ('admin','admin_pending_qc','freelancer_name','اسم الفريلانسر','أحمد'),

    ('admin','admin_withdrawal_request','freelancer_name','اسم الفريلانسر','أحمد'),
    ('admin','admin_withdrawal_request','amount','قيمة السحب','500'),
    ('admin','admin_withdrawal_request','method','طريقة السحب','InstaPay'),

    ('admin','admin_verification_request','full_name','اسم المستخدم','أحمد علي'),
    ('admin','admin_verification_request','user_type','نوع المستخدم','فريلانسر'),

    ('all','custom','message','نص الرسالة','مرحبا')
)
INSERT INTO public.telegram_template_variables (audience, message_key, variable_name, description, sample_value)
SELECT v.audience, v.message_key, v.variable_name, v.description, v.sample_value
FROM vars v
ON CONFLICT (audience, message_key, variable_name) DO UPDATE
SET
  description = EXCLUDED.description,
  sample_value = EXCLUDED.sample_value;
