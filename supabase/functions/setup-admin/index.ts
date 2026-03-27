import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupAdminPayload {
  email: string;
  password: string;
  full_name: string;
  setup_token?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;


    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse body
    const { email, password, full_name, setup_token }: SetupAdminPayload = await req.json();

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Database-backed rate limiting per IP for setup attempts
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const WINDOW_MS = 60 * 60 * 1000; // 1 hour
    const MAX_ATTEMPTS = 5;

    // Also persist attempts in the database for stronger, instance-independent rate limiting
    const windowStart = new Date(now - WINDOW_MS).toISOString();

    const { data: recentDbAttempts, error: dbRateError } = await adminClient
      .from("admin_setup_attempts")
      .select("id, attempt_time, success")
      .eq("ip_address", ip)
      .gte("attempt_time", windowStart);

    if (dbRateError) {
      console.error("Error checking admin_setup_attempts:", dbRateError);
    }

    const recentFailures = (recentDbAttempts || []).filter((a) => !a.success);

    if (recentFailures.length >= MAX_ATTEMPTS) {
      console.warn(`setup-admin rate limit exceeded for IP ${ip} (DB-backed)`);
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Record this attempt as a failure by default; will be marked success after user is created
    const { error: insertAttemptError } = await adminClient
      .from("admin_setup_attempts")
      .insert({ ip_address: ip, success: false });

    if (insertAttemptError) {
      console.error("Error recording setup attempt:", insertAttemptError);
    }

    // After confirming no admin exists yet, validate setup token only if provided and a strong secret is configured
    const setupSecret = Deno.env.get("ADMIN_SETUP_SECRET") ?? Deno.env.get("H");

    if (setupSecret && setupSecret.length >= 32) {
      // If user supplies a token, it must match the configured secret
      if (setup_token && setup_token !== setupSecret) {
        console.warn(`Invalid setup token attempt for setup-admin from IP ${ip}`);
        return new Response(
          JSON.stringify({ error: "Invalid setup token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      console.warn("setup-admin is running without a strong ADMIN_SETUP_SECRET. This should only be used for initial setup in a secure environment.");
    }


    // Check if any admin / team_leader already exists (one-time setup)
    const { data: existingAdmins, error: adminsError } = await adminClient
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "team_leader"])
      .limit(1);

    if (adminsError) {
      console.error("Error checking existing admins:", adminsError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing admins" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "Admin already exists" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        signup_role: "admin",
      },
    });

    if (signUpError || !authData.user) {
      console.error("Error creating admin user:", signUpError);
      return new Response(
        JSON.stringify({ error: signUpError?.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Ensure profile exists / updated
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: userId,
        full_name,
        email,
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Error upserting profile:", profileError);
    }

    // Assign admin role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    if (roleError) {
      console.error("Error assigning admin role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to assign admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark the most recent attempt for this IP as successful
    const { data: latestAttempt, error: fetchLatestError } = await adminClient
      .from("admin_setup_attempts")
      .select("id")
      .eq("ip_address", ip)
      .order("attempt_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchLatestError) {
      console.error("Error fetching latest admin_setup_attempt:", fetchLatestError);
    }

    if (latestAttempt?.id) {
      const { error: markSuccessError } = await adminClient
        .from("admin_setup_attempts")
        .update({ success: true })
        .eq("id", latestAttempt.id);

      if (markSuccessError) {
        console.error("Error marking setup attempt as successful:", markSuccessError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("setup-admin error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
