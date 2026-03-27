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
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: isAdminError } = await supabaseUser.rpc("is_admin", { _user_id: user.id });

    if (isAdminError) {
      console.error("is_admin rpc error:", isAdminError);
      return new Response(JSON.stringify({ error: "Failed to authorize" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const orderId = body?.orderId as string | undefined;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    console.log("admin-mark-order-paid invoked", { orderId, by: user.id });

    // Mark paid (idempotent)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", orderId)
      .select("id, user_id, status")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) throw new Error("Order not found");

    // Fulfill order + convert service purchases to requests
    let fulfilled = false;
    let converted = false;

    const fulfillRes = await supabaseAdmin.rpc("fulfill_paid_order", { _order_id: orderId });
    if (fulfillRes.error) {
      console.error("fulfill_paid_order error:", fulfillRes.error);
    } else {
      fulfilled = true;
    }

    const convertRes = await supabaseAdmin.rpc("convert_paid_order_service_purchases", { _order_id: orderId });
    if (convertRes.error) {
      console.error("convert_paid_order_service_purchases error:", convertRes.error);
    } else {
      converted = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        fulfilled,
        converted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("admin-mark-order-paid error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
