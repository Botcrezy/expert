import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { clientName, clientEmail, clientCountry, description, amount, createdBy, origin: providedOrigin } = await req.json();

    // Validate inputs
    if (!clientName || !clientEmail || !description || !amount || amount <= 0) {
      throw new Error('Missing or invalid required fields');
    }

    const freelancerId = createdBy || user.id;

    // Check if user is admin (can create for others) or creating for themselves
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'team_leader');
    
    if (!isAdmin && freelancerId !== user.id) {
      throw new Error('Cannot create invoice for another user');
    }

    // Check if service is enabled for freelancer
    const { data: settings } = await supabase
      .from('payment_collection_settings')
      .select('*')
      .eq('user_id', freelancerId)
      .maybeSingle();

    if (!settings?.is_enabled) {
      throw new Error('خدمة "ادفعلي" غير مفعّلة لهذا الحساب');
    }

    // Check identity verification
    const { data: verification } = await supabase
      .from('identity_verifications')
      .select('status')
      .eq('user_id', freelancerId)
      .eq('user_type', 'freelancer')
      .maybeSingle();

    if (verification?.status !== 'approved') {
      throw new Error('يجب توثيق الهوية أولاً قبل استخدام خدمة "ادفعلي"');
    }

    // Check pending invoices limit (max 3)
    const { data: pendingInvoices, count } = await supabase
      .from('payment_collection_invoices')
      .select('id', { count: 'exact' })
      .eq('freelancer_id', freelancerId)
      .in('status', ['pending']);

    if ((count || 0) >= 3) {
      throw new Error('لا يمكنك إنشاء أكثر من 3 فواتير غير مدفوعة في نفس الوقت');
    }

    // Generate unique token
    const token_str = crypto.randomUUID().replace(/-/g, '');
    
    // Set expiration (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Create Kashier payment
    const kashierMerchantId = Deno.env.get('KASHIER_MERCHANT_ID');
    const kashierApiKey = Deno.env.get('KASHIER_API_KEY');
    const kashierModeRaw = (Deno.env.get('KASHIER_MODE') || 'live').toLowerCase();
    const kashierMode = kashierModeRaw === 'test' ? 'test' : 'live';
    
    if (!kashierMerchantId || !kashierApiKey) {
      throw new Error('Kashier not configured');
    }

    // Generate Kashier order ID
    const kashierOrderId = `PAYCOL-${Date.now()}-${freelancerId.slice(0, 8)}`;

    // Kashier hash must match their HPP signature rules.
    // Using HMAC-SHA256 over path: /?payment={mid}.{orderId}.{amount}.{currency} with API Key as secret.
    async function generateKashierOrderHash(
      mid: string,
      orderId: string,
      amountStr: string,
      currency: string,
      apiKey: string
    ): Promise<string> {
      const path = `/?payment=${mid}.${orderId}.${amountStr}.${currency}`;

      const encoder = new TextEncoder();
      const keyData = encoder.encode(apiKey);
      const dataBuffer = encoder.encode(path);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
      const hashArray = Array.from(new Uint8Array(signature));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Build payment link base
    // Requirement: be flexible with the deployed domain (no forced redirect domain).
    // Prefer explicit origin from the web app, then fall back to headers.
    const forwardedProto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim() || "https";
    const forwardedHostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const forwardedHost = forwardedHostHeader.split(",")[0].trim();
    const headerOrigin = (req.headers.get("origin") || "").split(",")[0].trim();
    const headerReferer = (req.headers.get("referer") || "").split(",")[0].trim();

    const safeHttpOrigin = (value: unknown): string | null => {
      if (!value || typeof value !== "string") return null;
      try {
        const u = new URL(value);
        if (u.protocol !== "https:" && u.protocol !== "http:") return null;
        return u.origin;
      } catch {
        return null;
      }
    };

    const origin =
      safeHttpOrigin(providedOrigin) ||
      safeHttpOrigin(headerOrigin) ||
      safeHttpOrigin(headerReferer) ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "");

    if (!origin) {
      throw new Error("Could not determine site origin for payment redirects");
    }


     // Build Kashier payment URL (strict URL encoding to avoid "redirect URL must be a valid uri")
     // NOTE: Some payment methods are strict and reject redirect URLs that contain query params.
     // So we keep the redirect URL clean and rely on Kashier's own callback params.
      const redirectUrl = new URL(`/pay/${token_str}`, origin);

     // IMPORTANT: Kashier can be strict with query parsing.
     // Passing JSON here can break some payment methods (e.g. wallet/SMS) and cause:
     // "redirect URL must be a valid uri".
     // So we keep metaData as a simple token string.
     const metaData = token_str;

      // IMPORTANT: We are using Kashier HPP (checkout.kashier.io) like the old flow.
      // This is the most compatible option across payment methods (incl. Basata) when configured on Kashier side.
      const amountStr = Number(amount).toFixed(2);
      const hash = await generateKashierOrderHash(
        kashierMerchantId,
        kashierOrderId,
        amountStr,
        'EGP',
        kashierApiKey
      );

      const params = new URLSearchParams({
        merchantId: kashierMerchantId,
        orderId: kashierOrderId,
        amount: amountStr,
        currency: 'EGP',
        hash,
        mode: kashierMode,
        metaData,
        redirectUrl: redirectUrl.toString(),
        failRedirectUrl: redirectUrl.toString(),
        merchantRedirect: redirectUrl.toString(),
        display: 'ar',
      });
      const kashierUrl = `https://checkout.kashier.io/?${params.toString()}`;

    // Insert invoice
    const { data: invoice, error: insertError } = await supabase
      .from('payment_collection_invoices')
      .insert({
        freelancer_id: freelancerId,
        client_name: clientName,
        client_email: clientEmail,
        client_country: clientCountry,
        description: description,
        amount: amount,
        status: 'pending',
        token: token_str,
        kashier_order_id: kashierOrderId,
        payment_url: kashierUrl,
        expires_at: expiresAt,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Create notification for freelancer
    await supabase
      .from('notifications')
      .insert({
        user_id: freelancerId,
        type: 'payment',
        title: '✅ تم إنشاء فاتورة تحصيل جديدة',
        body: `تم إنشاء الفاتورة ${invoice.invoice_number} بمبلغ ${amount} ج.م للعميل ${clientName}`,
        reference_type: 'payment_collection',
        reference_id: invoice.id
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice,
        paymentLink: `${origin}/pay/${token_str}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
