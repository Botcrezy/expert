import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminUsersAction = "set_ban" | "set_verification" | "set_role" | "delete_user";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // User-scoped client (to identify caller)
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

    // Ensure admin
    const { data: isAdmin, error: isAdminError } = await supabaseUser.rpc("is_admin", {
      _user_id: user.id,
    });

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
    const action = body?.action as AdminUsersAction;
    const targetUserId = body?.userId as string | undefined;

    if (!action || !targetUserId) {
      return new Response(JSON.stringify({ error: "Missing action or userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === user.id && action === "delete_user") {
      return new Response(JSON.stringify({ error: "لا يمكن حذف حسابك الحالي" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Execute
    if (action === "set_ban") {
      const ban = Boolean(body?.value);
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ is_banned: ban })
        .eq("user_id", targetUserId)
        .select("user_id,is_banned")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("لم يتم العثور على المستخدم أو لا يمكن تحديثه");

      await supabaseAdmin.from("audit_logs").insert({
        action: ban ? "ban_user" : "unban_user",
        entity_type: "user",
        entity_id: targetUserId,
        new_values: { is_banned: ban, user_name: body?.userName },
        user_id: user.id,
      });

      return new Response(JSON.stringify({ success: true, profile: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_verification") {
      const verified = Boolean(body?.value);

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ is_verified: verified })
        .eq("user_id", targetUserId)
        .select("user_id,is_verified")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("لم يتم العثور على المستخدم أو لا يمكن تحديثه");

      await supabaseAdmin.from("audit_logs").insert({
        action: verified ? "verify_user" : "unverify_user",
        entity_type: "user",
        entity_id: targetUserId,
        new_values: { is_verified: verified },
        user_id: user.id,
      });

      return new Response(JSON.stringify({ success: true, profile: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_role") {
      const role = body?.role as string | undefined;
      if (!role) {
        return new Response(JSON.stringify({ error: "Missing role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });

      if (error) throw error;

      await supabaseAdmin.from("audit_logs").insert({
        action: "set_role",
        entity_type: "user",
        entity_id: targetUserId,
        new_values: { role },
        user_id: user.id,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      // Best effort: remove app data then auth user
      await supabaseAdmin.from("audit_logs").insert({
        action: "delete_user",
        entity_type: "user",
        entity_id: targetUserId,
        old_values: { user_name: body?.userName },
        user_id: user.id,
      });

      // App tables cleanup
      await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("freelancer_profiles").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("client_subscriptions").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);

      // Auth user deletion (may fail if user still referenced elsewhere; we still return success for app-level delete)
      try {
        // @ts-ignore - available in supabase-js on server
        await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      } catch (e) {
        console.warn("Failed to delete auth user:", e);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("admin-users error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
