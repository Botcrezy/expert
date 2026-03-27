import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_USER_ID = Deno.env.get('TELEGRAM_ADMIN_USER_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SendMessageRequest {
  user_id?: string;
  chat_id?: string;
  message_type: string;
  message?: string;
  data?: any;
  reference_type?: string;
  reference_id?: string;
  buttons?: Array<{ text: string; url: string }>;
  to_admin?: boolean;
  broadcast?: boolean;
  target?: 'all' | 'clients' | 'freelancers';
  /**
   * Bypass best-effort deduplication for manual re-sends.
   * Use sparingly (e.g., Admin “Resend” button).
   */
  force?: boolean;
}

// Sleep helper (rate limit / backoff)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Send message to Telegram (single attempt)
async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons?: Array<{ text: string; url: string }>
): Promise<{ success: boolean; error: string | null; message_id?: number; retry_after?: number }> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (buttons && buttons.length > 0) {
    body.reply_markup = JSON.stringify({
      inline_keyboard: buttons.map((btn) => [{ text: btn.text, url: btn.url }]),
    });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
    }

    const retryAfter = Number(result?.parameters?.retry_after);

    return {
      success: Boolean(result.ok),
      error: result.description || null,
      message_id: result.result?.message_id,
      retry_after: Number.isFinite(retryAfter) ? retryAfter : undefined,
    };
  } catch (error) {
    console.error('Send message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Send with retry/backoff (handles 429 + transient errors)
async function sendTelegramMessageWithRetry(
  chatId: string,
  text: string,
  buttons?: Array<{ text: string; url: string }>,
  opts: { maxAttempts?: number } = {}
): Promise<{ success: boolean; error: string | null; message_id?: number } > {
  const maxAttempts = opts.maxAttempts ?? 3;

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await sendTelegramMessage(chatId, text, buttons);

    if (res.success) return { success: true, error: null, message_id: res.message_id };

    lastError = res.error || 'Unknown error';

    // Respect Telegram rate limit hint
    if (res.retry_after && res.retry_after > 0) {
      await sleep((res.retry_after * 1000) + 200);
      continue;
    }

    // Exponential-ish backoff for transient errors
    if (attempt < maxAttempts) {
      const backoff = attempt === 1 ? 400 : attempt === 2 ? 1200 : 2500;
      await sleep(backoff);
    }
  }

  return { success: false, error: lastError };
}

// Get chat_id for a user
async function getChatIdForUser(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('telegram_links')
    .select('telegram_chat_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.telegram_chat_id;
}

// Get all linked users
async function getAllLinkedUsers(
  supabase: any,
  target: 'all' | 'clients' | 'freelancers' = 'all'
): Promise<{ chat_id: string; user_id: string }[]> {
  const { data, error } = await supabase
    .from('telegram_links')
    .select('telegram_chat_id, user_id, user_type')
    .eq('is_active', true);

  if (error || !data) return [];

  const filtered = data.filter((u: any) => {
    if (target === 'all') return true;
    if (target === 'clients') return u.user_type === 'client';
    if (target === 'freelancers') return u.user_type === 'freelancer';
    return true;
  });

  return filtered.map((u: any) => ({
    chat_id: u.telegram_chat_id,
    user_id: u.user_id,
  }));
}

// Check whether we already sent the same notification very recently (prevents duplicates)
async function wasRecentlySent(
  supabase: any,
  chatId: string,
  messageType: string,
  referenceType: string | null,
  referenceId: string | null,
  windowSeconds = 120
): Promise<boolean> {
  if (!referenceType || !referenceId) return false;

  try {
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { data } = await supabase
      .from('telegram_messages_log')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .eq('message_type', messageType)
      .eq('reference_type', referenceType)
      .eq('reference_id', referenceId)
      .eq('status', 'sent')
      .gte('created_at', since)
      .limit(1);

    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.error('wasRecentlySent check failed (allowing send):', e);
    return false;
  }
}

// Log message
async function logMessage(
  supabase: any,
  userId: string | null,
  chatId: string,
  messageType: string,
  messageText: string,
  referenceType: string | null,
  referenceId: string | null,
  isDelivered: boolean,
  errorMessage: string | null
) {
  try {
    await supabase.from('telegram_messages_log').insert({
      user_id: userId,
      telegram_chat_id: chatId,
      message_type: messageType,
      message_text: messageText.substring(0, 4000), // Limit text length
      reference_type: referenceType,
      reference_id: referenceId,
      is_delivered: isDelivered,
      error_message: errorMessage,
      status: isDelivered ? 'sent' : 'failed',
    });
  } catch (logError) {
    console.error('Failed to log message:', logError);
  }
}

// Check if Telegram channel is enabled for an event.
// If no rule exists, we default to "allow" to avoid breaking existing flows.
async function isTelegramEnabledForEvent(supabase: any, eventKey: string): Promise<boolean> {
  // Always allow these utility message types
  if (!eventKey || eventKey === 'custom' || eventKey === 'test' || eventKey === 'broadcast') return true;

  try {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('is_enabled, channel_telegram')
      .eq('event_key', eventKey)
      .maybeSingle();

    // If table not accessible / any error, don't block critical notifications
    if (error) {
      console.error('Failed to load notification_rules, allowing by default:', error);
      return true;
    }

    // No rule defined → allow by default (user will seed rules to manage it)
    if (!data) return true;

    return Boolean(data.is_enabled) && Boolean(data.channel_telegram);
  } catch (e) {
    console.error('notification_rules check failed, allowing by default:', e);
    return true;
  }
}

// Replace {variable} or {{variable}} placeholders in templates using provided data
function replaceVariables(template: string, data: Record<string, any>): string {
  let result = template;

  const flatData: Record<string, any> = { ...data };

  Object.entries(flatData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const strValue = String(value);

    // Support both {key} and {{key}} syntaxes
    const patterns = [
      new RegExp(`\\{${key}\\}`, "g"),
      new RegExp(`\\{\\{${key}\\}\\}`, "g"),
    ];

    patterns.forEach((pattern) => {
      result = result.replace(pattern, strValue);
    });
  });

  return result;
}


// Clean and normalize message text - removes extra whitespace and ensures proper line breaks
function cleanMessage(text: string): string {
  return text
    // Replace literal \n with actual newlines
    .replace(/\\n/g, '\n')
    // Remove leading/trailing whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove excessive blank lines (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim overall
    .trim();
}

// Message templates - Enhanced with better formatting
const messageTemplates: Record<string, (data: any) => string> = {
  // ═══════════════════════════════════════════════════════════════
  // CLIENT NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  
  request_created: (data) => cleanMessage(`
🎉 <b>تهانينا! تم إنشاء طلبك بنجاح</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
📐 <b>الحجم:</b> ${data.size || 'غير محدد'}
💳 <b>الكريديت:</b> ${data.credits_cost || 0}
━━━━━━━━━━━━━━━━━━━━

⏳ سيتم مراجعة طلبك خلال 24 ساعة

🔔 تابع حالة طلبك من لوحة التحكم
`),

  request_approved: (data) => cleanMessage(`
✅ <b>تم اعتماد طلبك!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

🔄 جاري تعيين أفضل فريلانسر للعمل على طلبك

💡 سيتم إعلامك فور بدء العمل
`),

  request_assigned: (data) => cleanMessage(`
👨‍💻 <b>تم تعيين خبير لطلبك!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

🚀 بدأ العمل على طلبك الآن!

⏱ سيتم إعلامك بكل تحديث
`),

  request_in_progress: (data) => cleanMessage(`
🔄 <b>طلبك قيد التنفيذ</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

⚡ فريقنا يعمل على تنفيذ طلبك

📬 سيتم إعلامك فور الاكتمال
`),

  request_delivered: (data) => cleanMessage(`
📦 <b>مبروك! تم تسليم طلبك</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

✅ طلبك جاهز للمراجعة!

🔗 راجع التسليم واطلب أي تعديلات
`),

  request_completed: (data) => cleanMessage(`
🏆 <b>تم اكتمال طلبك بنجاح!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

🎊 نشكرك على ثقتك بنا!

⭐ نتمنى أن نكون عند حسن ظنك
💬 لا تتردد في إرسال طلبات جديدة!
`),

  request_cancelled: (data) => cleanMessage(`
❌ <b>تم إلغاء طلبك</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
${data.reason ? `📝 <b>السبب:</b> ${data.reason}` : ''}
━━━━━━━━━━━━━━━━━━━━

📞 تواصل مع الدعم للاستفسار
`),

  revision_requested: (data) => cleanMessage(`
🔁 <b>تم طلب تعديل</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
${data.notes ? `📝 <b>الملاحظات:</b> ${data.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━

⏳ سيتم العمل على التعديلات قريباً
`),

  // ═══════════════════════════════════════════════════════════════
  // FREELANCER NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  
  task_assigned: (data) => cleanMessage(`
🎯 <b>مهمة جديدة في انتظارك!</b>

━━━━━━━━━━━━━━━━━━━━
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
${data.request_number ? `📌 <b>رقم الطلب:</b> ${data.request_number}` : ''}
⏳ <b>الموعد النهائي:</b> ${data.deadline || 'غير محدد'}
💰 <b>المبلغ:</b> ${data.payment_amount || 0} ج.م
━━━━━━━━━━━━━━━━━━━━

🚀 ابدأ العمل الآن!

💡 تأكد من قراءة المتطلبات جيداً
`),

  task_reminder: (data) => cleanMessage(`
⏰ <b>تذكير هام!</b>

━━━━━━━━━━━━━━━━━━━━
📋 <b>المهمة:</b> ${data.title || 'غير محدد'}
📅 <b>الموعد النهائي:</b> ${data.deadline || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

⚠️ تبقى <b>${data.hours_remaining || 0} ساعة</b> على التسليم!

🏃 أسرع لإنهاء المهمة في الوقت
`),

  delivery_submitted: (data) => cleanMessage(`
📤 <b>تم إرسال تسليمك!</b>

━━━━━━━━━━━━━━━━━━━━
📋 <b>المهمة:</b> ${data.title || 'غير محدد'}
${data.request_number ? `📌 <b>رقم الطلب:</b> ${data.request_number}` : ''}
━━━━━━━━━━━━━━━━━━━━

⏳ جاري المراجعة من فريق QC

🔔 سيتم إعلامك بالنتيجة قريباً
`),

  qc_approved: (data) => cleanMessage(`
🎉 <b>أحسنت! تم قبول تسليمك</b>

━━━━━━━━━━━━━━━━━━━━
📋 <b>المهمة:</b> ${data.title || 'غير محدد'}
💰 <b>المبلغ:</b> ${data.payment_amount || 0} ج.م
━━━━━━━━━━━━━━━━━━━━

✅ تم إضافة المبلغ لمحفظتك!

⭐ استمر في العمل الجيد
`),

  qc_rejected: (data) => cleanMessage(`
🔄 <b>تسليمك يحتاج تعديلات</b>

━━━━━━━━━━━━━━━━━━━━
📋 <b>المهمة:</b> ${data.title || 'غير محدد'}
📝 <b>الملاحظات:</b> ${data.qc_notes || 'راجع المنصة'}
━━━━━━━━━━━━━━━━━━━━

💡 قم بالتعديلات وأعد التسليم

⏳ الوقت المتبقي محدود
`),

  payment_added: (data) => cleanMessage(`
💰 <b>تم إضافة رصيد!</b>

━━━━━━━━━━━━━━━━━━━━
💵 <b>المبلغ:</b> ${data.amount || 0} ج.م
📝 <b>السبب:</b> ${data.reason || 'إيداع'}
💳 <b>الرصيد الحالي:</b> ${data.balance || 0} ج.م
━━━━━━━━━━━━━━━━━━━━

🎊 يمكنك سحب رصيدك في أي وقت
`),

  withdrawal_approved: (data) => cleanMessage(`
✅ <b>تمت الموافقة على السحب!</b>

━━━━━━━━━━━━━━━━━━━━
💵 <b>المبلغ:</b> ${data.amount || 0} ج.م
📝 <b>الطريقة:</b> ${data.method || 'تحويل بنكي'}
━━━━━━━━━━━━━━━━━━━━

⏳ سيتم التحويل خلال 24-48 ساعة
`),

  withdrawal_rejected: (data) => cleanMessage(`
❌ <b>تم رفض طلب السحب</b>

━━━━━━━━━━━━━━━━━━━━
💵 <b>المبلغ:</b> ${data.amount || 0} ج.م
📝 <b>السبب:</b> ${data.reason || 'راجع الدعم'}
━━━━━━━━━━━━━━━━━━━━

💳 تم إرجاع المبلغ لمحفظتك

📞 تواصل مع الدعم للتفاصيل
`),

  // ═══════════════════════════════════════════════════════════════
  // ADMIN NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  
  admin_new_request: (data) => cleanMessage(`
🔔 <b>طلب جديد!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
👤 <b>العميل:</b> ${data.client_name || 'غير محدد'}
📐 <b>الحجم:</b> ${data.size || 'غير محدد'}
💳 <b>الكريديت:</b> ${data.credits_cost || 0}
━━━━━━━━━━━━━━━━━━━━

⚡ قم بمراجعة الطلب وتعيين فريلانسر
`),

  admin_request_created: (data) => cleanMessage(`
🆕 <b>طلب جديد من عميل!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>العنوان:</b> ${data.title || 'غير محدد'}
👤 <b>العميل:</b> ${data.client_name || 'غير محدد'}
📐 <b>الحجم:</b> ${data.size || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

⚡ قم بمراجعة الطلب
`),

  admin_pending_qc: (data) => cleanMessage(`
🔍 <b>تسليم ينتظر QC!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>المهمة:</b> ${data.title || 'غير محدد'}
👨‍💻 <b>الفريلانسر:</b> ${data.freelancer_name || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة جودة التسليم
`),

  admin_delivery_pending_qc: (data) => cleanMessage(`
🔍 <b>تسليم جديد ينتظر المراجعة!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📋 <b>المهمة:</b> ${data.title || 'غير محدد'}
👨‍💻 <b>الفريلانسر:</b> ${data.freelancer_name || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة QC
`),

  admin_dispute_opened: (data) => cleanMessage(`
⚠️ <b>نزاع جديد!</b>

━━━━━━━━━━━━━━━━━━━━
📌 <b>رقم الطلب:</b> ${data.request_number || 'غير محدد'}
📝 <b>السبب:</b> ${data.reason || 'غير محدد'}
👤 <b>فتحه:</b> ${data.opened_by_name || 'مستخدم'}
━━━━━━━━━━━━━━━━━━━━

🚨 يرجى التدخل السريع
`),

  admin_withdrawal_request: (data) => cleanMessage(`
💳 <b>طلب سحب جديد!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>الفريلانسر:</b> ${data.freelancer_name || 'غير محدد'}
💵 <b>المبلغ:</b> ${data.amount || 0} ج.م
📝 <b>الطريقة:</b> ${data.method || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة الطلب
`),

  admin_withdrawal_requested: (data) => cleanMessage(`
💳 <b>طلب سحب جديد!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>الفريلانسر:</b> ${data.freelancer_name || 'غير محدد'}
💵 <b>المبلغ:</b> ${data.amount || 0} ج.م
📝 <b>الطريقة:</b> ${data.method || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بالمراجعة والموافقة
`),

  admin_new_user: (data) => cleanMessage(`
👤 <b>مستخدم جديد!</b>

━━━━━━━━━━━━━━━━━━━━
📧 <b>البريد:</b> ${data.email || 'غير محدد'}
👤 <b>الاسم:</b> ${data.full_name || 'غير محدد'}
📋 <b>النوع:</b> ${data.user_type || 'عميل'}
━━━━━━━━━━━━━━━━━━━━

🎉 مرحباً بالعضو الجديد!
`),

  admin_user_registered_client: (data) => cleanMessage(`
👤 <b>عميل جديد سجّل!</b>

━━━━━━━━━━━━━━━━━━━━
📧 <b>البريد:</b> ${data.email || 'غير محدد'}
👤 <b>الاسم:</b> ${data.full_name || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

🎉 مرحباً بالعميل الجديد!
`),

  admin_user_registered_freelancer: (data) => cleanMessage(`
🆕 <b>فريلانسر جديد سجّل!</b>

━━━━━━━━━━━━━━━━━━━━
📧 <b>البريد:</b> ${data.email || 'غير محدد'}
👤 <b>الاسم:</b> ${data.full_name || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة الملف الشخصي
`),

  admin_new_freelancer: (data) => cleanMessage(`
🆕 <b>فريلانسر ينتظر المراجعة!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>الاسم:</b> ${data.full_name || 'غير محدد'}
📧 <b>البريد:</b> ${data.email || 'غير محدد'}
📋 <b>التخصصات:</b> ${Array.isArray(data.categories) ? data.categories.join('، ') : (data.categories || 'غير محدد')}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة الملف والموافقة
`),

  admin_verification_request: (data) => cleanMessage(`
🔐 <b>طلب تحقق هوية!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>المستخدم:</b> ${data.full_name || 'غير محدد'}
📋 <b>النوع:</b> ${data.user_type || 'عميل'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة وثائق الهوية
`),

  admin_identity_submitted_client: (data) => cleanMessage(`
🔐 <b>عميل قدّم طلب تحقق!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>الاسم:</b> ${data.full_name || 'غير محدد'}
📧 <b>البريد:</b> ${data.email || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة الوثائق
`),

  admin_identity_submitted_freelancer: (data) => cleanMessage(`
🔐 <b>فريلانسر قدّم طلب تحقق!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>الاسم:</b> ${data.full_name || 'غير محدد'}
📧 <b>البريد:</b> ${data.email || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

📋 قم بمراجعة الوثائق
`),

  // ═══════════════════════════════════════════════════════════════
  // COURSE NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  
  course_enrolled: (data) => cleanMessage(`
🎓 <b>تم الاشتراك في الكورس!</b>

━━━━━━━━━━━━━━━━━━━━
📚 <b>الكورس:</b> ${data.track_name || 'كورس جديد'}
━━━━━━━━━━━━━━━━━━━━

🚀 ابدأ رحلتك التعليمية الآن!
`),

  course_completed: (data) => cleanMessage(`
🏆 <b>مبروك! أكملت الكورس</b>

━━━━━━━━━━━━━━━━━━━━
📚 <b>الكورس:</b> ${data.track_name || 'كورس'}
⭐ <b>النجوم:</b> ${data.stars_earned || 0}
━━━━━━━━━━━━━━━━━━━━

🎊 أحسنت! استمر في التعلم
`),

  // ═══════════════════════════════════════════════════════════════
  // SYSTEM NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  
  system_maintenance: (data) => cleanMessage(`
🔧 <b>صيانة مجدولة</b>

━━━━━━━━━━━━━━━━━━━━
📅 <b>التاريخ:</b> ${data.date || 'غير محدد'}
⏰ <b>الوقت:</b> ${data.time || 'غير محدد'}
📝 <b>التفاصيل:</b> ${data.details || 'صيانة للمنصة'}
━━━━━━━━━━━━━━━━━━━━

⚠️ قد تتأثر بعض الخدمات
`),

  welcome: (data) => cleanMessage(`
🎉 <b>مرحباً بك في Sity Expert!</b>

━━━━━━━━━━━━━━━━━━━━

🔗 تم ربط حسابك بتيليجرام بنجاح!

الآن ستتلقى إشعارات عن:
• 📬 الطلبات والمهام
• 💰 المدفوعات والسحوبات
• 📢 التحديثات الهامة

━━━━━━━━━━━━━━━━━━━━

نتمنى لك تجربة رائعة! ⭐
`),

  admin_new_support_conversation: (data) => cleanMessage(`
💬 <b>محادثة دعم جديدة!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>المستخدم:</b> ${data.user_name || 'غير محدد'}
📋 <b>النوع:</b> ${data.user_type || 'غير محدد'}
📝 <b>الموضوع:</b> ${data.subject || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

🔔 قم بالرد من لوحة التحكم
`),

  admin_new_support_message: (data) => cleanMessage(`
📩 <b>رسالة دعم جديدة!</b>

━━━━━━━━━━━━━━━━━━━━
👤 <b>المستخدم:</b> ${data.user_name || 'غير محدد'}
📝 <b>الموضوع:</b> ${data.subject || 'غير محدد'}
💬 <b>الرسالة:</b> ${data.message || 'غير محدد'}
━━━━━━━━━━━━━━━━━━━━

🔔 قم بالرد من لوحة التحكم
`),

  // ═══════════════════════════════════════════════════════════════
  // GENERIC
  // ═══════════════════════════════════════════════════════════════
  
  custom: (data) => cleanMessage(data.message || 'رسالة من Sity Expert'),
  
  test: (data) => cleanMessage(data.admin_message || data.message || `
🔔 <b>رسالة اختبار</b>

━━━━━━━━━━━━━━━━━━━━

✅ تم الاتصال بنجاح!

📱 إشعارات التيليجرام تعمل

━━━━━━━━━━━━━━━━━━━━
`),
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: SendMessageRequest = await req.json();

    console.log('Send request:', JSON.stringify(body));

    // Gate Telegram sending using notification_rules (default allow if rule missing)
    const telegramEnabled = await isTelegramEnabledForEvent(supabase, body.message_type);
    if (!telegramEnabled) {
      // Don't throw: treat as a successful no-op so callers don't fail.
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'telegram_disabled_for_event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle broadcast
    if (body.broadcast) {
      const users = await getAllLinkedUsers(supabase, body.target || 'all');

      if (users.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No linked users found',
            sent: 0,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const message = body.message || 'رسالة من Sity Expert';
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const user of users) {
        // Dedupe (best effort) when reference is provided
        if (!body.force) {
          const already = await wasRecentlySent(
            supabase,
            user.chat_id,
            body.message_type,
            body.reference_type || null,
            body.reference_id || null
          );

          if (already) {
            skipped++;
            continue;
          }
        }

        const result = await sendTelegramMessageWithRetry(user.chat_id, message, body.buttons, { maxAttempts: 3 });

        if (result.success) sent++;
        else failed++;

        await logMessage(
          supabase,
          user.user_id,
          user.chat_id,
          'broadcast',
          message,
          body.reference_type || null,
          body.reference_id || null,
          result.success,
          result.error
        );

        // Safer rate limiting
        await sleep(120);
      }

      return new Response(
        JSON.stringify({
          success: true,
          sent,
          failed,
          skipped,
          total: users.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    // Single message
    let chatId: string | null = body.chat_id || null;
    
    // If sending to admin
    if (body.to_admin) {
      if (!TELEGRAM_ADMIN_USER_ID) {
        return new Response(JSON.stringify({
          success: false,
          error: 'TELEGRAM_ADMIN_USER_ID not configured',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      chatId = TELEGRAM_ADMIN_USER_ID;
    }
    // If user_id provided, get their chat_id
    else if (body.user_id && !chatId) {
      chatId = await getChatIdForUser(supabase, body.user_id);
    }
    
    if (!chatId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not linked to Telegram or chat_id not found',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get message from DB template (telegram_bot_messages) or fallback to built-in templates
    let message: string;

    // Prepare base data object used for variable replacement
    const baseData: Record<string, any> = {
      ...(body.data || {}),
      message_type: body.message_type,
      reference_type: body.reference_type,
      reference_id: body.reference_id,
      platform_name: 'Sity Expert',
      now: new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }),
    };

    // Enrich with user profile data when available
    if (body.user_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', body.user_id)
          .maybeSingle();

        if (profile) {
          baseData.user_name = profile.full_name;
          baseData.user_email = profile.email;
        }
      } catch (e) {
        console.error('Failed to load profile for template variables', e);
      }
    }

    // Try to load a custom template from telegram_bot_messages first
    try {
      const { data: customTemplate } = await supabase
        .from('telegram_bot_messages')
        .select('message_template')
        .eq('message_key', body.message_type)
        .eq('is_active', true)
        .maybeSingle();

      if (customTemplate?.message_template) {
        message = replaceVariables(customTemplate.message_template, baseData);
      } else {
        const templateFn = messageTemplates[body.message_type];
        if (templateFn) {
          message = templateFn({ ...body, ...baseData });
        } else {
          // For pure custom messages from the admin, still allow simple variables
          const raw = body.message || 'رسالة من Sity Expert';
          message = replaceVariables(raw, baseData);
        }
      }
    } catch (e) {
      console.error('Failed to load telegram_bot_messages template, falling back to built-in template', e);
      const templateFn = messageTemplates[body.message_type];
      if (templateFn) {
        message = templateFn({ ...body, ...baseData });
      } else {
        const raw = body.message || 'رسالة من Sity Expert';
        message = replaceVariables(raw, baseData);
      }
    }
    
    // Best-effort dedupe to avoid double sends from repeated triggers
    if (!body.force) {
      const alreadySent = await wasRecentlySent(
        supabase,
        chatId,
        body.message_type,
        body.reference_type || null,
        body.reference_id || null
      );

      if (alreadySent) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'duplicate_recent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send message (retry/backoff)
    const result = await sendTelegramMessageWithRetry(chatId, message, body.buttons, { maxAttempts: 3 });

    // Log message
    await logMessage(
      supabase,
      body.user_id || null,
      chatId,
      body.message_type,
      message,
      body.reference_type || null,
      body.reference_id || null,
      result.success,
      result.error
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('Send error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});