import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Require auth (function is meant to be called by logged-in freelancer pages)
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const cutoffIso = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

    // Eligible: paid, not released, paid_at <= now-4days
    const { data: invoices, error: invErr } = await supabase
      .from("payment_collection_invoices")
      .select("id, invoice_number, freelancer_id, amount, status, paid_at, released_at")
      .eq("freelancer_id", userId)
      .eq("status", "paid")
      .is("released_at", null)
      .lte("paid_at", cutoffIso)
      .limit(500);

    if (invErr) throw invErr;

    const eligible = invoices ?? [];

    let releasedCount = 0;
    let releasedAmount = 0;

    for (const inv of eligible) {
      // Idempotency: if already credited in ledger, just mark released_at
      const { data: existingCredit, error: exErr } = await supabase
        .from("wallet_ledger")
        .select("id")
        .eq("reference_type", "payment_collection")
        .eq("reference_id", inv.id)
        .limit(1)
        .maybeSingle();

      if (exErr) throw exErr;

      if (!existingCredit) {
        const { data: lastEntry, error: lastErr } = await supabase
          .from("wallet_ledger")
          .select("balance_after")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastErr) throw lastErr;

        const previousBalance = lastEntry?.balance_after ?? 0;
        const newBalance = previousBalance + Number(inv.amount);

        const { error: insertErr } = await supabase.from("wallet_ledger").insert({
          user_id: userId,
          amount: Number(inv.amount),
          balance_after: newBalance,
          type: "credit",
          reason: `تحصيل من فاتورة ${inv.invoice_number}`,
          reference_type: "payment_collection",
          reference_id: inv.id,
        });

        if (insertErr) throw insertErr;

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "payment",
          title: "💰 تم إضافة مبلغ التحصيل للمحفظة",
          body: `تم إضافة مبلغ ${Number(inv.amount)} ج.م من الفاتورة ${inv.invoice_number} إلى محفظتك بعد فترة الانتظار.` ,
          reference_type: "payment_collection",
          reference_id: inv.id,
        });
      }

      const { error: markErr } = await supabase
        .from("payment_collection_invoices")
        .update({
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      if (markErr) throw markErr;

      releasedCount += 1;
      releasedAmount += Number(inv.amount);
    }

    return new Response(
      JSON.stringify({
        success: true,
        releasedCount,
        releasedAmount,
        checked: eligible.length,
        cutoffIso,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("release-payment-collection-funds error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
