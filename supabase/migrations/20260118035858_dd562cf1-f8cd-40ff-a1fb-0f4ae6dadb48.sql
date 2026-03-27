-- 1) Strengthen telegram message logging + enable dedup references
ALTER TABLE public.telegram_messages_log
ADD COLUMN IF NOT EXISTS reference_type text,
ADD COLUMN IF NOT EXISTS reference_id text,
ADD COLUMN IF NOT EXISTS is_delivered boolean;

-- Backfill best-effort (treat historical 'sent' as delivered)
UPDATE public.telegram_messages_log
SET is_delivered = CASE WHEN status = 'sent' THEN true ELSE false END
WHERE is_delivered IS NULL;

-- Index to speed up recent dedupe checks
CREATE INDEX IF NOT EXISTS idx_tg_log_dedupe
ON public.telegram_messages_log (
  telegram_chat_id,
  message_type,
  reference_type,
  reference_id,
  created_at
);

-- 2) Seed IMPORTANT admin events (AR/EN) + allow toggling from Admin Notification Rules
INSERT INTO public.notification_rules (event_key, description, channel_in_app, channel_telegram, is_enabled)
VALUES
  ('admin_user_registered_client', 'Client signup (admin)', false, true, true),
  ('admin_user_registered_freelancer', 'Freelancer signup (admin)', false, true, true),
  ('admin_identity_submitted_client', 'Client identity verification submitted (admin)', false, true, true),
  ('admin_identity_submitted_freelancer', 'Freelancer identity verification submitted (admin)', false, true, true),
  ('admin_withdrawal_requested', 'Withdrawal requested (admin)', false, true, true),
  ('admin_delivery_pending_qc', 'Delivery submitted, pending QC (admin)', false, true, true),
  ('admin_request_created', 'New request created (admin)', false, true, true)
ON CONFLICT (event_key)
DO UPDATE SET
  description = EXCLUDED.description,
  channel_in_app = EXCLUDED.channel_in_app,
  channel_telegram = EXCLUDED.channel_telegram,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();

-- 3) Seed telegram templates for admin events (editable in Admin Telegram Settings)
INSERT INTO public.telegram_bot_messages (message_key, message_template, description, variables, is_active, audience, event_key)
VALUES
  (
    'admin_user_registered_client',
    '<b>🆕 تسجيل عميل جديد</b>\nالاسم: {user_name}\nالبريد: {user_email}\n\n<b>EN</b>\n<b>New client signup</b>\nName: {user_name}\nEmail: {user_email}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: client signup',
    ARRAY['user_name','user_email','admin_url'],
    true,
    'admin',
    'admin_user_registered_client'
  ),
  (
    'admin_user_registered_freelancer',
    '<b>🆕 تسجيل فريلانسر جديد</b>\nالاسم: {user_name}\nالبريد: {user_email}\n\n<b>EN</b>\n<b>New freelancer signup</b>\nName: {user_name}\nEmail: {user_email}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: freelancer signup',
    ARRAY['user_name','user_email','admin_url'],
    true,
    'admin',
    'admin_user_registered_freelancer'
  ),
  (
    'admin_identity_submitted_client',
    '<b>🪪 طلب تحقق عميل</b>\nالاسم: {user_name}\nرقم/ID: {reference_id}\n\n<b>EN</b>\n<b>Client identity submitted</b>\nName: {user_name}\nID: {reference_id}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: client identity submitted',
    ARRAY['user_name','reference_id','admin_url'],
    true,
    'admin',
    'admin_identity_submitted_client'
  ),
  (
    'admin_identity_submitted_freelancer',
    '<b>🪪 طلب تحقق فريلانسر</b>\nالاسم: {user_name}\nرقم/ID: {reference_id}\n\n<b>EN</b>\n<b>Freelancer identity submitted</b>\nName: {user_name}\nID: {reference_id}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: freelancer identity submitted',
    ARRAY['user_name','reference_id','admin_url'],
    true,
    'admin',
    'admin_identity_submitted_freelancer'
  ),
  (
    'admin_withdrawal_requested',
    '<b>💳 طلب سحب جديد</b>\nالفريلانسر: {user_name}\nالمبلغ: {amount}\n\n<b>EN</b>\n<b>New withdrawal request</b>\nFreelancer: {user_name}\nAmount: {amount}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: withdrawal requested',
    ARRAY['user_name','amount','admin_url'],
    true,
    'admin',
    'admin_withdrawal_requested'
  ),
  (
    'admin_delivery_pending_qc',
    '<b>🔍 تسليم جديد ينتظر QC</b>\nالطلب: {request_number}\nالعنوان: {title}\n\n<b>EN</b>\n<b>Delivery pending QC</b>\nRequest: {request_number}\nTitle: {title}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: delivery pending QC',
    ARRAY['request_number','title','admin_url'],
    true,
    'admin',
    'admin_delivery_pending_qc'
  ),
  (
    'admin_request_created',
    '<b>📌 طلب جديد</b>\nرقم الطلب: {request_number}\nالعنوان: {title}\nالحجم: {size}\n\n<b>EN</b>\n<b>New request created</b>\nRequest: {request_number}\nTitle: {title}\nSize: {size}\n\n🔗 <a href="{admin_url}">Open in Admin</a>',
    'Admin: new request created',
    ARRAY['request_number','title','size','admin_url'],
    true,
    'admin',
    'admin_request_created'
  )
ON CONFLICT (message_key)
DO UPDATE SET
  message_template = EXCLUDED.message_template,
  description = EXCLUDED.description,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  audience = EXCLUDED.audience,
  event_key = EXCLUDED.event_key,
  updated_at = now();
