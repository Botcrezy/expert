import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to get user info
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      request_id,
      idempotency_key,
      category_id,
      title,
      description,
      size,
      deadline,
      files,
      publish_mode,
    } = body;

    if (!title || !size) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, size" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations (calling SECURITY DEFINER function)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Generate request_id if not provided
    const requestId = request_id || crypto.randomUUID();
    // Generate idempotency key if not provided (based on user + timestamp + title hash)
    const idempKey = idempotency_key || `${user.id}-${Date.now()}-${title.substring(0, 20)}`;

    // Call the DB function using user's client so auth.uid() is available
    const { data: requestData, error: rpcError } = await supabaseUser.rpc(
      "create_request_with_credits",
      {
        p_user_id: user.id,
        p_request_id: requestId,
        p_idempotency_key: idempKey,
        p_category_id: category_id || null,
        p_title: title,
        p_description: description || "",
        p_size: size,
        p_deadline: deadline ? new Date(deadline).toISOString() : null,
        p_files: files || [],
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      
      // Handle specific error messages
      if (rpcError.message?.includes("Insufficient credits")) {
        return new Response(
          JSON.stringify({ error: "رصيد الكريديت غير كافي" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: rpcError.message || "Failed to create request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update publish_mode if marketplace
    if (publish_mode === "marketplace" && requestData?.id) {
      await supabaseAdmin
        .from("requests")
        .update({ publish_mode: "marketplace" })
        .eq("id", requestData.id);
    }

    console.log(`Request created successfully: ${requestData?.request_number || requestId}`);

    // Send Telegram notifications
    try {
      // Notify client about created request
      if (requestData?.user_id) {
        await supabaseAdmin.functions.invoke("telegram-send", {
          body: {
            user_id: requestData.user_id,
            message_type: "request_created",
            data: {
              request_number: requestData.request_number,
              title: requestData.title,
              size: requestData.size,
              credits_cost: requestData.credits_cost,
            },
            reference_type: "request",
            reference_id: requestData.id,
          },
        });
      }

      // Notify admin about new request (important event)
      await supabaseAdmin.functions.invoke("telegram-send", {
        body: {
          to_admin: true,
          message_type: "admin_request_created",
          data: {
            request_number: requestData?.request_number || requestId,
            title: requestData?.title || title,
            size,
            admin_url: `https://expert.sity.cloud/admin/requests/${requestData?.id || requestId}`,
          },
          reference_type: "request",
          reference_id: String(requestData?.id || requestId),
        },
      });
    } catch (notifError) {
      console.error("Telegram notification error (create-request):", notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        request: requestData,
        request_id: requestData?.id || requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Create request error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
