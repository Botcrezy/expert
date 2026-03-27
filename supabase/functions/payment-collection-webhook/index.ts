import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const timingSafeEqual = (a: string, b: string) => {
  const aa = (a || "").trim().toLowerCase();
  const bb = (b || "").trim().toLowerCase();
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return out === 0;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

async function verifyWebhookSignature(args: {
  secret: string;
  signature: string;
  orderId: string;
  transactionId: string;
  status: string;
  token: string;
}) {
  const { secret, signature, orderId, transactionId, status, token } = args;

  // Kashier payloads differ slightly between integrations.
  // We verify against multiple common concatenation patterns.
  const candidates = [
    `${orderId}.${transactionId}.${token}.${status}`,
    `${orderId}.${transactionId}.${status}`,
    `${orderId}.${transactionId}${token}${status}`,
    `${orderId}${transactionId}${token}${status}`,
    `${orderId}${transactionId}${status}`,
  ];

  for (const msg of candidates) {
    const computed = await hmacSha256Hex(secret, msg);
    if (timingSafeEqual(computed, signature)) return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const KASHIER_SECRET_KEY = Deno.env.get("KASHIER_SECRET_KEY");
    if (!KASHIER_SECRET_KEY) {
      console.error("payment-collection-webhook: KASHIER_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signatureFromHeader =
      req.headers.get("x-kashier-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("signature");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Webhook received:", body);

    // Support multiple payload shapes
    const orderId = String(body.orderId ?? body.merchantOrderId ?? body.order_id ?? "");
    const transactionId = String(body.transactionId ?? body.transaction_id ?? "");
    const status = String(body.status ?? body.paymentStatus ?? body.payStatus ?? "");
    const metaData = body.metaData ?? body.meta_data ?? body.metadata ?? {};

    // Extract token from metadata
    const token = String(metaData?.token ?? body.token ?? "");

    const signature = String(body.signature ?? signatureFromHeader ?? "");

    if (!orderId || !status || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Signature is mandatory
    if (!signature) {
      console.error("payment-collection-webhook: Missing signature");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifyWebhookSignature({
      secret: KASHIER_SECRET_KEY,
      signature,
      orderId,
      transactionId,
      status,
      token,
    });

    if (!isValid) {
      console.error("payment-collection-webhook: Invalid signature", { orderId, transactionId });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find invoice by token
    const { data: invoice, error: findError } = await supabase
      .from("payment_collection_invoices")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (findError || !invoice) {
      throw new Error("Invoice not found");
    }

    // Update invoice based on status
    let newStatus = "pending";
    let paidAt: string | null = null;

    if (status.toLowerCase() === "success") {
      newStatus = "paid";
      paidAt = new Date().toISOString();

      // Payment confirmed. Funds are placed on hold for 4 days before being added to the wallet.
      // (Release happens via the release-payment-collection-funds backend function.)

      // In-app notification (avoid duplicates)
      const { data: existingPaidNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", invoice.freelancer_id)
        .eq("reference_type", "payment_collection")
        .eq("reference_id", invoice.id)
        .eq("type", "payment")
        .limit(1)
        .maybeSingle();

      if (!existingPaidNotif) {
        await supabase.from("notifications").insert({
          user_id: invoice.freelancer_id,
          type: "payment",
          title: "✅ تم دفع الفاتورة بنجاح",
          body: `تم دفع الفاتورة ${invoice.invoice_number} بمبلغ ${invoice.amount} ج.م. سيتم إضافة المبلغ للمحفظة بعد 4 أيام.`,
          reference_type: "payment_collection",
          reference_id: invoice.id,
        });
      }

      // Telegram notification (if linked)
      try {
        await fetch(`${supabaseUrl}/functions/v1/telegram-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: invoice.freelancer_id,
            message_type: "payment_collection_paid",
            data: {
              invoice_number: invoice.invoice_number,
              amount: invoice.amount,
              hold_days: 4,
            },
            reference_type: "payment_collection",
            reference_id: invoice.id,
          }),
        });
      } catch (e) {
        console.error("Telegram notify failed (payment_collection_paid)", e);
      }

    } else if (["failure", "failed", "canceled", "cancelled"].includes(status.toLowerCase())) {
      newStatus = "failed";
    }

    // Update invoice (idempotent)
    const { error: updateError } = await supabase
      .from("payment_collection_invoices")
      .update({
        status: newStatus,
        kashier_transaction_id: transactionId || null,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
