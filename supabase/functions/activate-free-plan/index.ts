import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivatePlanRequest {
  planId: string;
  couponId?: string;
  subtotal?: number;
  discount?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: " + (userError?.message || "No user found"));
    }

    // Admin client for database operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { planId, couponId, subtotal = 0, discount = 0 } = await req.json() as ActivatePlanRequest;
    if (!planId) {
      throw new Error("Missing planId");
    }

    const total = Math.max(subtotal - discount, 0);

    console.log(`Activating plan ${planId} for user ${user.id}, couponId: ${couponId}, total: ${total}`);

    // Get plan details (for subscriptions) or product details (for one-off credits/courses)
    const { data: plan, error: planError } = await adminClient
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      // Try products table (credits or courses)
      const { data: product, error: productError } = await adminClient
        .from("products")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      if (productError || !product) {
        throw new Error("Plan or product not found: " + (planError?.message || productError?.message || ""));
      }

      // Handle credits products (one-off credits purchases)
      if (product.type === "credit_pack") {
        if (product.price > 0 && total > 0) {
          throw new Error("This credits product requires payment");
        }

        console.log(`Credits product details: ${product.name}, credits: ${product.credits}`);

        // Create order
        const orderNumber = `ORD-${Date.now()}`;
        const { data: order, error: orderError } = await adminClient
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            subtotal: subtotal || product.price || 0,
            discount: discount || 0,
            total: total || 0,
            tax: 0,
            status: "paid",
            payment_method: couponId ? "coupon" : "free",
            paid_at: new Date().toISOString(),
            coupon_id: couponId || null,
          })
          .select()
          .single();

        if (orderError) {
          console.error("Order creation error (credits):", orderError);
          throw new Error("Failed to create order: " + orderError.message);
        }

        console.log(`Credits order created: ${order.id}`);

        // Get current balance
        const { data: currentCredits } = await adminClient
          .from("credits_ledger")
          .select("balance_after")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const currentBalance = currentCredits?.balance_after || 0;
        const creditsToAdd = product.credits || 0;
        const newBalance = currentBalance + creditsToAdd;

        // Add credits
        const { error: creditsError } = await adminClient.from("credits_ledger").insert({
          user_id: user.id,
          amount: creditsToAdd,
          balance_after: newBalance,
          type: "credit",
          reason: `شراء كريديتات: ${product.name_ar || product.name}`,
          reference_type: "order",
          reference_id: order.id,
        });

        if (creditsError) {
          console.error("Credits insert error (product):", creditsError);
          throw new Error("Failed to add credits: " + creditsError.message);
        }

        console.log(`Credits added from product: ${creditsToAdd}, new balance: ${newBalance}`);

        // Send notification
        await adminClient.from("notifications").insert({
          user_id: user.id,
          title: "تم تفعيل الكريديت",
          body: `تم إضافة ${creditsToAdd} كريديت إلى حسابك بنجاح` ,
          type: "credits",
          reference_type: "order",
          reference_id: order.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: `تم إضافة ${creditsToAdd} كريديت إلى حسابك`,
            order_id: order.id,
            credits_added: creditsToAdd,
            new_balance: newBalance,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Handle course products (course enrollments)
      if (product.type === "course") {
        if (product.price > 0 && total > 0) {
          throw new Error("This course requires payment");
        }

        if (!product.track_id) {
          throw new Error("Course product missing track_id");
        }

        console.log(`Course product details: ${product.name}, track: ${product.track_id}`);

        const orderNumber = `ORD-${Date.now()}`;
        const { data: order, error: orderError } = await adminClient
          .from("orders")
          .insert({
            user_id: user.id,
            order_number: orderNumber,
            subtotal: subtotal || product.price || 0,
            discount: discount || 0,
            total: total || 0,
            tax: 0,
            status: "paid",
            payment_method: couponId ? "coupon" : "free",
            paid_at: new Date().toISOString(),
            coupon_id: couponId || null,
          })
          .select()
          .single();

        if (orderError) {
          console.error("Order creation error (course):", orderError);
          throw new Error("Failed to create order: " + orderError.message);
        }

        console.log(`Course order created: ${order.id}`);

        const { error: enrollError } = await adminClient.from("course_enrollments").insert({
          user_id: user.id,
          track_id: product.track_id,
          order_id: order.id,
          is_active: true,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0,
        });

        if (enrollError) {
          console.error("Course enrollment error:", enrollError);
          throw new Error("Failed to enroll in course: " + enrollError.message);
        }

        await adminClient.from("notifications").insert({
          user_id: user.id,
          title: "تم تفعيل الكورس",
          body: `تم تفعيل كورس ${product.name_ar || product.name} في حسابك`,
          type: "course",
          reference_type: "order",
          reference_id: order.id,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: `تم تفعيل الكورس بنجاح!`,
            order_id: order.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      throw new Error("Unsupported product type for activation");
    }

    if (planError) {
      throw new Error("Plan not found: " + (planError?.message || ""));
    }

    // Verify it's a free plan or total is 0 (covered by coupon)
    if (!plan.is_free && plan.price > 0 && total > 0) {
      throw new Error("This plan requires payment");
    }

    console.log(`Plan details: ${plan.name}, credits: ${plan.credits_per_month}`);

    // Deactivate any existing active subscriptions first
    const { data: existingSubs } = await adminClient
      .from("client_subscriptions")
      .select("id, plan_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (existingSubs && existingSubs.length > 0) {
      // Deactivate existing subscriptions
      await adminClient
        .from("client_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);
      
      console.log(`Deactivated ${existingSubs.length} existing subscription(s)`);
    }

    // Create order
    const orderNumber = `ORD-${Date.now()}`;
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        subtotal: subtotal || 0,
        discount: discount || 0,
        total: total || 0,
        tax: 0,
        status: "paid",
        payment_method: couponId ? "coupon" : "free",
        paid_at: new Date().toISOString(),
        coupon_id: couponId || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error("Failed to create order: " + orderError.message);
    }

    console.log(`Order created: ${order.id}`);

    // Get current balance
    const { data: currentCredits } = await adminClient
      .from("credits_ledger")
      .select("balance_after")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = currentCredits?.balance_after || 0;
    const newBalance = currentBalance + plan.credits_per_month;

    // Add credits
    const { error: creditsError } = await adminClient.from("credits_ledger").insert({
      user_id: user.id,
      amount: plan.credits_per_month,
      balance_after: newBalance,
      type: "credit",
      reason: `تفعيل باقة مجانية: ${plan.name_ar || plan.name}`,
      reference_type: "order",
      reference_id: order.id,
    });

    if (creditsError) {
      console.error("Credits insert error:", creditsError);
      throw new Error("Failed to add credits: " + creditsError.message);
    }

    console.log(`Credits added: ${plan.credits_per_month}, new balance: ${newBalance}`);

    // Create subscription
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const { error: subError } = await adminClient.from("client_subscriptions").insert({
      user_id: user.id,
      plan_id: planId,
      credits_remaining: plan.credits_per_month,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    if (subError) {
      console.error("Subscription insert error:", subError);
      // Don't throw - credits already added
    } else {
      console.log("Subscription created");
    }

    // Send notification
    await adminClient.from("notifications").insert({
      user_id: user.id,
      title: "تم تفعيل الباقة المجانية",
      body: `تم تفعيل باقة ${plan.name_ar || plan.name} وإضافة ${plan.credits_per_month} كريديت إلى حسابك`,
      type: "subscription",
      reference_type: "order",
      reference_id: order.id,
    });

    console.log("Free plan activation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم تفعيل الباقة بنجاح! تم إضافة ${plan.credits_per_month} كريديت`,
        order_id: order.id,
        credits_added: plan.credits_per_month,
        new_balance: newBalance,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Activate free plan error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "حدث خطأ غير متوقع",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});