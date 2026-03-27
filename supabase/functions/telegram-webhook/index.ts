import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_ADMIN_USER_ID = Deno.env.get('TELEGRAM_ADMIN_USER_ID') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function logTelegramLinkAttempt(
  supabase: any,
  payload: {
    code?: string;
    telegram_chat_id?: string;
    telegram_user_id?: string;
    telegram_username?: string | null;
    status: 'success' | 'failed';
    error_message?: string | null;
  }
) {
  try {
    await supabase.from('telegram_link_attempts').insert({
      code: payload.code || null,
      telegram_chat_id: payload.telegram_chat_id || null,
      telegram_user_id: payload.telegram_user_id || null,
      telegram_username: payload.telegram_username || null,
      status: payload.status,
      error_message: payload.error_message || null,
    });
  } catch (e) {
    // Never break webhook handling because of logging
    console.error('Failed to log telegram link attempt:', e);
  }
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
      first_name: string;
      last_name?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
    };
    data?: string;
  };
}

// Message templates cache
let messageTemplatesCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get message template from database
async function getMessageTemplate(supabase: any, key: string): Promise<string | null> {
  // Check cache
  if (Date.now() - cacheTimestamp < CACHE_TTL && messageTemplatesCache[key]) {
    return messageTemplatesCache[key];
  }
  
  try {
    const { data } = await supabase
      .from('telegram_bot_messages')
      .select('message_template')
      .eq('message_key', key)
      .eq('is_active', true)
      .maybeSingle();
    
    if (data?.message_template) {
      messageTemplatesCache[key] = data.message_template;
      cacheTimestamp = Date.now();
      return data.message_template;
    }
  } catch (err) {
    console.error('Error fetching message template:', err);
  }
  
  return null;
}

// Replace variables in template
function formatMessage(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

// Send message to Telegram
async function sendTelegramMessage(
  chatId: string | number, 
  text: string, 
  parseMode = 'HTML', 
  replyMarkup?: any,
  disablePreview = true
) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode,
    disable_web_page_preview: disablePreview,
  };
  
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
    }),
  });
}

// Check if user is admin by Telegram User ID
function isAdminByTelegramId(userId: number): boolean {
  return userId.toString() === TELEGRAM_ADMIN_USER_ID;
}

// Handle /start command
async function handleStart(supabase: any, chatId: number, firstName: string, lastName?: string): Promise<string> {
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  
  const template = await getMessageTemplate(supabase, 'welcome');
  if (template) {
    return formatMessage(template, { name: fullName });
  }
  
  // Fallback
  return `🎉 <b>مرحباً ${fullName}!</b>\n\nأنا البوت الرسمي للمنصة. أرسل /help للمساعدة.`;
}

// Handle /link command
async function handleLink(
  supabase: any,
  chatId: number,
  userId: number,
  username: string | undefined,
  firstName: string,
  code: string
): Promise<string> {
  const raw = (code || "").trim();

  // Accept cases like: "ABC123", "/link ABC123", "ABC123@something"
  const normalized = raw
    .replace(/^\/link(@\w+)?\s+/i, "")
    .split(/\s+/)[0]
    .split("@")[0]
    .trim();

  if (!normalized || normalized.length < 4) {
    const template = await getMessageTemplate(supabase, "link_invalid_code");
    return template || "❌ الكود غير صالح. مثال: /link ABC123";
  }

  const upperCode = normalized.toUpperCase();

  try {
    const { data, error } = await supabase.rpc("verify_telegram_link_code", {
      p_code: upperCode,
      p_telegram_chat_id: chatId.toString(),
      p_telegram_user_id: userId.toString(),
      p_telegram_username: username || null,
    });

    if (error) {
      console.error("Link error:", { error, chatId, userId, upperCode });

      await logTelegramLinkAttempt(supabase, {
        code: upperCode,
        telegram_chat_id: chatId.toString(),
        telegram_user_id: userId.toString(),
        telegram_username: username || null,
        status: 'failed',
        error_message: `${error.code || ''} ${error.message || ''}`.trim(),
      });

      // Common root cause: backend mismatch or missing RPC
      if (String(error.code || '') === '42883') {
        return '⚠️ خدمة الربط غير جاهزة حالياً (إعدادات الربط). من فضلك تواصل مع الدعم.';
      }

      return "❌ حدث خطأ أثناء الربط. حاول مرة أخرى.";
    }

    const result = data?.[0];

    if (result && result.success) {
      await logTelegramLinkAttempt(supabase, {
        code: upperCode,
        telegram_chat_id: chatId.toString(),
        telegram_user_id: userId.toString(),
        telegram_username: username || null,
        status: 'success',
        error_message: null,
      });

      // Get the appropriate success message based on user type
      const messageKey = `link_success_${result.user_type}`;
      const template = await getMessageTemplate(supabase, messageKey);

      if (template) {
        return formatMessage(template, { name: firstName });
      }

      // Fallback
      const userTypeMap: Record<string, string> = {
        client: "عميل",
        freelancer: "فريلانسر",
        admin: "أدمن",
      };

      return `✅ تم ربط حسابك بنجاح!\nنوع الحساب: ${userTypeMap[result.user_type] || result.user_type}`;
    }

    // Better diagnostics for "invalid/expired" codes (helps support + users)
    try {
      const { data: codeRow } = await supabase
        .from("telegram_link_codes")
        .select("expires_at, used_at, created_at")
        .eq("code", upperCode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (codeRow) {
        if (codeRow.used_at) {
          await logTelegramLinkAttempt(supabase, {
            code: upperCode,
            telegram_chat_id: chatId.toString(),
            telegram_user_id: userId.toString(),
            telegram_username: username || null,
            status: 'failed',
            error_message: 'code_used',
          });
          return "❌ الكود تم استخدامه من قبل. من فضلك ولّد كود جديد من المنصة ثم أرسله.";
        }

        const expiresAt = new Date(codeRow.expires_at);
        if (expiresAt.getTime() <= Date.now()) {
          await logTelegramLinkAttempt(supabase, {
            code: upperCode,
            telegram_chat_id: chatId.toString(),
            telegram_user_id: userId.toString(),
            telegram_username: username || null,
            status: 'failed',
            error_message: 'code_expired',
          });
          return "❌ الكود منتهي الصلاحية (صالح 10 دقائق فقط). ولّد كود جديد من المنصة ثم أرسله.";
        }

        // Code exists and not expired but verification still failed (rare)
        console.error("Link failed but code exists:", { chatId, userId, upperCode, codeRow, result });
        await logTelegramLinkAttempt(supabase, {
          code: upperCode,
          telegram_chat_id: chatId.toString(),
          telegram_user_id: userId.toString(),
          telegram_username: username || null,
          status: 'failed',
          error_message: 'verification_failed_code_exists',
        });
        return "❌ لم نتمكن من إتمام الربط رغم أن الكود يبدو صحيحاً. جرّب /link الكود مرة أخرى أو ولّد كود جديد.";
      }

      await logTelegramLinkAttempt(supabase, {
        code: upperCode,
        telegram_chat_id: chatId.toString(),
        telegram_user_id: userId.toString(),
        telegram_username: username || null,
        status: 'failed',
        error_message: 'code_not_found',
      });
    } catch (diagnosticErr) {
      console.error("Link diagnostic error:", diagnosticErr);
    }

    return `❌ ${result?.message || "فشل الربط. تأكد من صحة الكود."}`;
  } catch (err) {
    console.error("Link exception:", err);
    return "❌ حدث خطأ غير متوقع.";
  }
}

// Handle /unlink command
async function handleUnlink(supabase: any, chatId: number): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('unlink_telegram_account', {
      p_chat_id: chatId.toString(),
    });
    
    if (error) {
      console.error('Unlink error:', error);
      return '❌ حدث خطأ. حاول مرة أخرى.';
    }
    
    const result = data?.[0];
    
    if (result && result.success) {
      const template = await getMessageTemplate(supabase, 'unlink_success');
      return template || '✅ تم فصل الربط بنجاح.';
    }
    
    return `❌ ${result?.message || 'لم يتم العثور على ربط لحسابك.'}`;
  } catch (err) {
    console.error('Unlink exception:', err);
    return '❌ حدث خطأ غير متوقع.';
  }
}

// Handle /status command
async function handleStatus(supabase: any, chatId: number): Promise<string> {
  try {
    const { data: link, error: linkError } = await supabase
      .from('telegram_links')
      .select('*')
      .eq('telegram_chat_id', chatId.toString())
      .eq('is_active', true)
      .maybeSingle();
    
    if (linkError) {
      console.error('Status link error:', linkError);
      return '❌ حدث خطأ في جلب البيانات.';
    }
    
    if (!link) {
      const template = await getMessageTemplate(supabase, 'status_not_linked');
      return template || '❌ حسابك غير مربوط. أرسل /link الكود لربطه.';
    }
    
    // Get profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', link.user_id)
      .maybeSingle();
    
    const linkedDate = new Date(link.created_at).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const userTypeLabels: Record<string, string> = {
      client: '👤 عميل',
      freelancer: '💼 فريلانسر',
      admin: '🔐 أدمن',
    };
    
    const template = await getMessageTemplate(supabase, 'status_linked');
    if (template) {
      return formatMessage(template, {
        user_type_label: userTypeLabels[link.user_type] || '👤 مستخدم',
        name: profile?.full_name || 'غير محدد',
        email: profile?.email || 'غير محدد',
        linked_date: linkedDate,
      });
    }
    
    // Fallback
    return `✅ حسابك مربوط\n${userTypeLabels[link.user_type] || '👤 مستخدم'}\n📅 ${linkedDate}`;
  } catch (err) {
    console.error('Status exception:', err);
    return '❌ حدث خطأ في جلب البيانات.';
  }
}

// Handle /help command - Different for admin and regular users
async function handleHelp(supabase: any, userId: number): Promise<string> {
  const isAdmin = isAdminByTelegramId(userId);
  const templateKey = isAdmin ? 'help_admin' : 'help_user';
  
  const template = await getMessageTemplate(supabase, templateKey);
  if (template) {
    return template;
  }
  
  // Fallback
  let help = `📚 <b>الأوامر:</b>\n/start - بدء\n/link الكود - ربط\n/unlink - فصل\n/status - حالة\n/help - مساعدة`;
  
  if (isAdmin) {
    help += `\n\n🔐 <b>الإدارة:</b>\n/stats - إحصائيات\n/pending - معلقة\n/findorder - بحث\n/users - مربوطين`;
  }
  
  return help;
}

// Handle admin /stats command
async function handleAdminStats(supabase: any, userId: number): Promise<string> {
  if (!isAdminByTelegramId(userId)) {
    // Don't reveal admin commands exist to non-admins
    return '❓ أمر غير معروف. اكتب /help للمساعدة.';
  }
  
  try {
    const [requestsToday, pendingRequests, linkedUsers, totalFreelancers] = await Promise.all([
      supabase.from('requests').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabase.from('requests').select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabase.from('telegram_links').select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('freelancer_profiles').select('*', { count: 'exact', head: true })
        .eq('is_available', true),
    ]);
    
    return `📊 <b>إحصائيات المنصة</b>

📝 طلبات اليوم: <b>${requestsToday.count || 0}</b>
⏳ طلبات معلقة: <b>${pendingRequests.count || 0}</b>
👨‍💻 فريلانسرز متاحين: <b>${totalFreelancers.count || 0}</b>
🔗 مربوطين بتليجرام: <b>${linkedUsers.count || 0}</b>`;
  } catch (err) {
    console.error('Stats exception:', err);
    return '❌ خطأ في جلب الإحصائيات.';
  }
}

// Handle admin /pending command
async function handleAdminPending(supabase: any, userId: number): Promise<string> {
  if (!isAdminByTelegramId(userId)) {
    return '❓ أمر غير معروف. اكتب /help للمساعدة.';
  }
  
  try {
    const { data: requests } = await supabase
      .from('requests')
      .select('request_number, title, created_at, size')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!requests || requests.length === 0) {
      return '✅ لا توجد طلبات معلقة حالياً. 🎉';
    }
    
    let message = `📋 <b>آخر ${requests.length} طلبات معلقة:</b>\n\n`;
    
    requests.forEach((req: any, i: number) => {
      const date = new Date(req.created_at).toLocaleDateString('ar-EG');
      message += `${i + 1}. <b>${req.request_number}</b>\n   📌 ${req.title}\n   📐 ${req.size} | 📅 ${date}\n\n`;
    });
    
    return message;
  } catch (err) {
    console.error('Pending exception:', err);
    return '❌ خطأ في جلب الطلبات.';
  }
}

// Handle admin /findorder command
async function handleFindOrder(supabase: any, userId: number, orderNumber: string): Promise<string> {
  if (!isAdminByTelegramId(userId)) {
    return '❓ أمر غير معروف. اكتب /help للمساعدة.';
  }
  
  if (!orderNumber) {
    return `❌ يجب إدخال رقم الطلب\n\n<b>مثال:</b> <code>/findorder REQ-000001</code>`;
  }
  
  try {
    const trimmedOrderNumber = orderNumber.trim();

    // Allow only safe characters in the filter string to avoid injection
    const safeOrderNumber = trimmedOrderNumber.replace(/[^A-Za-z0-9\-]/g, "");

    if (!safeOrderNumber) {
      return '❌ رقم الطلب غير صالح.';
    }

    // First try an exact match using parameterized equality
    let { data: request, error } = await supabase
      .from('requests')
      .select('*')
      .eq('request_number', safeOrderNumber)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding order (exact):', error);
      return '❌ خطأ في البحث عن الطلب.';
    }

    // If no exact match, try a safe partial match using ilike with a bound parameter
    if (!request) {
      const { data: partialMatch, error: partialError } = await supabase
        .from('requests')
        .select('*')
        .ilike('request_number', `%${safeOrderNumber}%`)
        .limit(1)
        .maybeSingle();

      if (partialError) {
        console.error('Error finding order (partial):', partialError);
        return '❌ خطأ في البحث عن الطلب.';
      }

      request = partialMatch;
    }

    if (!request) {
      return `❌ لم يتم العثور على طلب برقم: ${orderNumber}`;
    }
    
    // Get client info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', request.user_id)
      .maybeSingle();
    
    const statusMap: Record<string, string> = {
      submitted: '📝 جديد',
      approved: '✅ معتمد',
      assigned: '👨‍💻 معين',
      in_progress: '🔄 قيد التنفيذ',
      pending_qc: '🔍 ينتظر QC',
      delivered_to_client: '📦 مسلّم للعميل',
      completed: '✅ مكتمل',
      cancelled: '❌ ملغي',
      revision_requested: '🔁 تعديل مطلوب',
    };
    
    return `🔍 <b>تفاصيل الطلب ${request.request_number}</b>

📌 <b>العنوان:</b> ${request.title}
👤 <b>العميل:</b> ${profile?.full_name || 'غير محدد'}
📊 <b>الحالة:</b> ${statusMap[request.status] || request.status}
📐 <b>الحجم:</b> ${request.size}
💳 <b>الكريديت:</b> ${request.credits_cost}
📅 <b>التاريخ:</b> ${new Date(request.created_at).toLocaleDateString('ar-EG')}`;
  } catch (err) {
    console.error('FindOrder exception:', err);
    return '❌ خطأ في البحث عن الطلب.';
  }
}

// Handle admin /users command
async function handleAdminUsers(supabase: any, userId: number): Promise<string> {
  if (!isAdminByTelegramId(userId)) {
    return '❓ أمر غير معروف. اكتب /help للمساعدة.';
  }
  
  try {
    const { data: links, count } = await supabase
      .from('telegram_links')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!links || links.length === 0) {
      return '📱 لا يوجد مستخدمين مربوطين بتليجرام.';
    }
    
    // Get profiles for all users
    const userIds = links.map((l: any) => l.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    
    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.user_id] = p.full_name;
      return acc;
    }, {});
    
    let message = `📱 <b>المستخدمين المربوطين (${count})</b>\n\n`;
    
    links.forEach((link: any, i: number) => {
      const name = profileMap[link.user_id] || 'مستخدم';
      const typeEmoji = link.user_type === 'admin' ? '🔐' : link.user_type === 'freelancer' ? '💼' : '👤';
      message += `${i + 1}. ${typeEmoji} ${name}`;
      if (link.telegram_username) {
        message += ` (@${link.telegram_username})`;
      }
      message += `\n`;
    });
    
    return message;
  } catch (err) {
    console.error('Users exception:', err);
    return '❌ خطأ في جلب المستخدمين.';
  }
}

// Handle admin /broadcast command
async function handleAdminBroadcast(supabase: any, userId: number, message: string): Promise<string> {
  if (!isAdminByTelegramId(userId)) {
    return '❓ أمر غير معروف. اكتب /help للمساعدة.';
  }
  
  if (!message || message.trim().length === 0) {
    return `❌ يجب كتابة رسالة للبث\n\n<b>مثال:</b> <code>/broadcast مرحباً بالجميع!</code>`;
  }
  
  try {
    const { data: links } = await supabase
      .from('telegram_links')
      .select('telegram_chat_id, user_type')
      .eq('is_active', true);
    
    if (!links || links.length === 0) {
      return '❌ لا يوجد مستخدمين مربوطين للبث إليهم.';
    }
    
    let successCount = 0;
    let failCount = 0;
    
    const formattedMessage = `📢 <b>رسالة من الإدارة</b>\n\n${message}`;
    
    for (const link of links) {
      try {
        await sendTelegramMessage(link.telegram_chat_id, formattedMessage);
        successCount++;
        
        // Log the broadcast
        await supabase.from('telegram_messages_log').insert({
          telegram_chat_id: link.telegram_chat_id,
          message_type: 'broadcast',
          message_text: message.substring(0, 500),
          status: 'sent',
        });
      } catch (err) {
        failCount++;
        console.error('Broadcast error to', link.telegram_chat_id, err);
      }
    }
    
    return `✅ <b>تم البث بنجاح</b>\n\n📤 تم الإرسال: ${successCount}\n❌ فشل: ${failCount}`;
  } catch (err) {
    console.error('Broadcast exception:', err);
    return '❌ خطأ في البث.';
  }
}

// Main webhook handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const update: TelegramUpdate = await req.json();
    console.log('Received update:', JSON.stringify(update));
    
    // Handle callback queries (button clicks)
    if (update.callback_query) {
      await answerCallbackQuery(update.callback_query.id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle messages
    if (!update.message || !update.message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { message } = update;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const username = message.from.username;
    const firstName = message.from.first_name;
    const lastName = message.from.last_name;
    const text = (message.text || '').trim();
    
    let response = '';
    
    // Parse command and arguments
    const [commandRaw, ...args] = text.split(/\s+/);
    const argument = args.join(' ').trim();

    // Support commands in groups like: /link@your_bot ABC123
    const commandBase = (commandRaw || '').split('@')[0];
    const lowerCommand = commandBase.toLowerCase();

    // Regular user commands
    if (lowerCommand === '/start') {
      response = await handleStart(supabase, chatId, firstName, lastName);
    } else if (lowerCommand === '/link') {
      response = await handleLink(supabase, chatId, userId, username, firstName, argument);
    } else if (lowerCommand === '/unlink') {
      response = await handleUnlink(supabase, chatId);
    } else if (lowerCommand === '/status') {
      response = await handleStatus(supabase, chatId);
    } else if (lowerCommand === '/help') {
      response = await handleHelp(supabase, userId);
    }
    // Admin commands - return unknown command for non-admins
    else if (lowerCommand === '/stats') {
      response = await handleAdminStats(supabase, userId);
    } else if (lowerCommand === '/pending') {
      response = await handleAdminPending(supabase, userId);
    } else if (lowerCommand === '/findorder') {
      response = await handleFindOrder(supabase, userId, argument);
    } else if (lowerCommand === '/users') {
      response = await handleAdminUsers(supabase, userId);
    } else if (lowerCommand === '/broadcast') {
      response = await handleAdminBroadcast(supabase, userId, argument);
    }
    // Check if it looks like a link code
    else if (/^[A-Z0-9]{6,}$/i.test(text)) {
      response = await handleLink(supabase, chatId, userId, username, firstName, text);
    }
    // Unknown command
    else {
      const template = await getMessageTemplate(supabase, 'unknown_command');
      response = template || '❓ أمر غير معروف. اكتب /help للمساعدة.';
    }
    
    await sendTelegramMessage(chatId, response);
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
