import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KASHIER_MERCHANT_ID = Deno.env.get("KASHIER_MERCHANT_ID") || "";
const KASHIER_API_KEY = Deno.env.get("KASHIER_API_KEY") || "";
const KASHIER_SECRET_KEY = Deno.env.get("KASHIER_SECRET_KEY") || "";
const KASHIER_MODE = Deno.env.get("KASHIER_MODE") || "live";

// Generate SHA256 hash for Kashier using HMAC
// Hash format per Kashier docs: /?payment={mid}.{orderId}.{amount}.{currency}
// Using API Key as the HMAC secret
async function generateKashierOrderHash(
  mid: string,
  orderId: string,
  amount: string,
  currency: string,
  apiKey: string
): Promise<string> {
  const path = `/?payment=${mid}.${orderId}.${amount}.${currency}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiKey);
  const dataBuffer = encoder.encode(path);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, dataBuffer);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Create Kashier Hosted Payment Page URL
async function createPaymentUrl(
  orderId: string,
  amount: number,
  currency: string = "EGP",
  redirectUrl: string
): Promise<string> {
  const amountStr = amount.toFixed(2);
  
  // Generate hash using API Key (per Kashier documentation)
  const hash = await generateKashierOrderHash(
    KASHIER_MERCHANT_ID,
    orderId,
    amountStr,
    currency,
    KASHIER_API_KEY
  );

  // Build the HPP URL
  const params = new URLSearchParams({
    merchantId: KASHIER_MERCHANT_ID,
    orderId: orderId,
    amount: amountStr,
    currency: currency,
    hash: hash,
    mode: (Deno.env.get("KASHIER_MODE") || "live"),

    // Some payment methods are strict about redirect URL parsing.
    // We set both redirectUrl + failRedirectUrl and also keep merchantRedirect for compatibility.
    redirectUrl: redirectUrl,
    failRedirectUrl: redirectUrl,
    merchantRedirect: redirectUrl,

    // NOTE: We intentionally do NOT force allowedMethods here.
    // Some merchants/providers (e.g., Basata / wallet flows) can behave differently
    // when methods are restricted. Let Kashier decide based on your account settings.
    display: "ar",
  });

  // Kashier Checkout base URL
  const paymentUrl = `https://checkout.kashier.io/?${params.toString()}`;
  
  return paymentUrl;
}

// Verify webhook signature using Secret Key
async function verifyWebhookSignature(
  orderId: string,
  transactionId: string,
  orderReference: string,
  status: string,
  receivedSignature: string
): Promise<boolean> {
  // Kashier webhook signature format varies, common patterns:
  // orderId.transactionId.orderReference.status or orderId.transactionId.status
  const patterns = [
    `${orderId}.${transactionId}.${orderReference}.${status}`,
    `${orderId}.${transactionId}.${status}`,
    `${orderId}.${status}`,
  ];
  
  for (const signatureData of patterns) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(KASHIER_SECRET_KEY);
    const dataBuffer = encoder.encode(signatureData);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", key, dataBuffer);
    const hashArray = Array.from(new Uint8Array(signature));
    const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    
    if (receivedSignature === expectedSignature) {
      return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? (req.method === "POST" ? "create-payment" : null);

    // Create payment session
    if (action === "create-payment" && req.method === "POST") {
      const { orderId, amount, userId, redirectUrl } = await req.json();

      if (!orderId || !amount || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!KASHIER_MERCHANT_ID || !KASHIER_API_KEY) {
        console.error("Kashier not configured - MID:", KASHIER_MERCHANT_ID ? "set" : "missing", "API Key:", KASHIER_API_KEY ? "set" : "missing");
        return new Response(
          JSON.stringify({ error: "Kashier not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const forwardedProto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim() || "https";
      const forwardedHostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
      const forwardedHost = forwardedHostHeader.split(",")[0].trim();
      const headerOrigin = (req.headers.get("origin") || "").split(",")[0].trim();

      // Requirement: be flexible with deployed domain (no hardcoded fallback domain)
      const origin = headerOrigin || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : "");
      const requestOrigin = new URL(req.url).origin;
      const fallbackRedirect = origin ? `${origin}/client/billing` : `${requestOrigin}/client/billing`;

      const paymentUrl = await createPaymentUrl(
        orderId,
        amount,
        "EGP",
        redirectUrl || fallbackRedirect
      );

      console.log(`Payment URL created for order ${orderId}, amount: ${amount} EGP`);
      console.log(`Payment URL: ${paymentUrl}`);

      return new Response(
        JSON.stringify({ 
          paymentUrl, 
          orderId,
          merchantId: KASHIER_MERCHANT_ID 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle Kashier webhook (POST from Kashier)
    if (action === "webhook" && req.method === "POST") {
      let body: any;
      const contentType = req.headers.get("content-type") || "";
      
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } else {
        body = await req.json();
      }
      
      console.log("Kashier webhook received:", JSON.stringify(body));

      const { 
        merchantOrderId,
        orderId: kashierOrderId,
        transactionId,
        orderReference,
        paymentStatus,
        status,
        amount,
        signature,
        paymentMethod,
        card,
        maskedCard,
        cardDataToken,
        message
      } = body;

      const orderNum = merchantOrderId || kashierOrderId;
      const payStatus = paymentStatus || status;

      // Verify signature if provided and secret key is configured
      if (KASHIER_SECRET_KEY) {
        if (!signature) {
          console.error("Kashier webhook missing signature while secret key is configured");
          return new Response(
            JSON.stringify({ error: "Missing signature" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isValid = await verifyWebhookSignature(
          orderNum,
          transactionId || "",
          orderReference || "",
          payStatus,
          signature
        );

        console.log("Signature verification:", isValid ? "PASSED" : "FAILED");

        if (!isValid) {
          console.error("Invalid Kashier webhook signature for order", orderNum);
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Get service role client for admin operations
      const supabaseAdmin = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Check if order already processed (Idempotency)
      const { data: existingOrder } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("order_number", orderNum)
        .single();

      if (existingOrder?.status === "paid") {
        console.log(`Order ${orderNum} already paid, skipping...`);
        return new Response(
          JSON.stringify({ received: true, message: "Already processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const successStatuses = ["SUCCESS", "CAPTURED", "success", "captured", "PAID", "paid"];
      const failureStatuses = ["FAILED", "DECLINED", "failed", "declined", "FAILURE", "failure"];

      if (successStatuses.includes(payStatus)) {
        // Update order status to paid and return basic info
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_reference: transactionId ? `Kashier: ${transactionId}` : `Kashier: ${orderReference || kashierOrderId}`,
            payment_method: "kashier",
          })
          .eq("order_number", orderNum)
          .select("id, user_id, total")
          .maybeSingle();

        if (updateError || !updatedOrder) {
          console.error("Error updating order:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update order" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fulfill the order (add credits/subscription)
        try {
          await supabaseAdmin.rpc("fulfill_paid_order", { _order_id: updatedOrder.id });
          // Convert service purchases (portfolio) to requests
          await supabaseAdmin.rpc("convert_paid_order_service_purchases", { _order_id: updatedOrder.id });
          console.log(`Order ${orderNum} fulfilled successfully`);
        } catch (fulfillError) {
          console.error("Error fulfilling order:", fulfillError);
        }

        // Create in-app notification for the user
        try {
          await supabaseAdmin.from("notifications").insert({
            user_id: updatedOrder.user_id,
            type: "payment_success",
            title: "تم تأكيد طلبك",
            body: `تم تأكيد طلب الشراء رقم ${orderNum} وإضافة الرصيد إلى حسابك`,
            reference_type: "order",
            reference_id: updatedOrder.id,
          });
        } catch (notifError) {
          console.error("Error creating payment notification:", notifError);
        }

        // Send Telegram notification to the client (if linked)
        try {
          await supabaseAdmin.functions.invoke("telegram-send", {
            body: {
              user_id: updatedOrder.user_id,
              message_type: "custom",
              message: `💳 <b>تم تأكيد عملية الدفع الخاصة بك</b>\n\n📌 رقم الطلب: ${orderNum}\n💰 المبلغ: ${updatedOrder.total} ج.م`,
              reference_type: "order",
              reference_id: updatedOrder.id,
            },
          });
        } catch (telegramError) {
          console.error("Error sending Telegram payment notification:", telegramError);
        }

        console.log(`Order ${orderNum} marked as paid`);
      } else if (failureStatuses.includes(payStatus)) {
        // Update order status to failed
        await supabaseAdmin
          .from("orders")
          .update({ status: "failed" })
          .eq("order_number", orderNum);

        console.log(`Order ${orderNum} marked as failed - ${message || payStatus}`);
      }

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle merchant redirect callback (GET from browser)
    if (action === "callback" || url.searchParams.has("paymentStatus")) {
      const paymentStatus = url.searchParams.get("paymentStatus") || url.searchParams.get("status");
      const orderId = url.searchParams.get("merchantOrderId") || url.searchParams.get("orderId");
      
      console.log("Payment callback received:", { paymentStatus, orderId });
      
      // Redirect back into the app (prefer same-origin)
      const origin = url.searchParams.get("origin") || "";
      const redirectUrl = url.searchParams.get("redirectUrl") || "";

      const safeOrigin = origin && origin.startsWith("http") ? origin : "";
      const safeRedirectUrl = redirectUrl && redirectUrl.startsWith("http") ? redirectUrl : "";

      const redirectBase = safeOrigin || safeRedirectUrl;
      const fallback = `${new URL(req.url).origin}/client/billing`;
      const base = redirectBase || fallback;

      if (paymentStatus === "SUCCESS" || paymentStatus === "success") {
        return Response.redirect(`${base}?payment=success`, 302);
      } else {
        return Response.redirect(`${base}?payment=failed`, 302);
      }
    }

    // Check Kashier configuration
    if (action === "check-config") {
      const isConfigured = !!(KASHIER_MERCHANT_ID && KASHIER_API_KEY);
      const reason = isConfigured
        ? null
        : "بوابة كاشير غير مفعّلة حالياً (بيانات الربط غير مكتملة)";

      return new Response(
        JSON.stringify({
          configured: isConfigured,
          available: isConfigured,
          reason,
          merchantId: KASHIER_MERCHANT_ID ? "***" + KASHIER_MERCHANT_ID.slice(-4) : null,
          mode: KASHIER_MODE,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: Return configuration status (for GET requests)
    if (req.method === "GET") {
      const isConfigured = !!(KASHIER_MERCHANT_ID && KASHIER_API_KEY);
      const reason = isConfigured
        ? null
        : "بوابة كاشير غير مفعّلة حالياً (بيانات الربط غير مكتملة)";

      return new Response(
        JSON.stringify({
          configured: isConfigured,
          available: isConfigured,
          reason,
          mode: KASHIER_MODE,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Kashier payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
