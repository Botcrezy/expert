import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check - must be admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "team_leader"])
      .limit(1);
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: reqCount = 4 } = await req.json();
    const finalCount = Math.min(Math.max(1, reqCount), 10);

    // Get categories
    const { data: categories } = await adminClient
      .from("categories")
      .select("id, name_ar")
      .eq("is_active", true);

    if (!categories || categories.length === 0) {
      return new Response(JSON.stringify({ error: "لا توجد تصنيفات نشطة" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryList = categories.map((c) => `${c.id}|${c.name_ar}`).join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت مساعد لتوليد مشاريع واقعية لمنصة خدمات رقمية. أنشئ مشاريع متنوعة بأوصاف مفصلة واحترافية باللغة العربية. كل مشروع يجب أن يحتوي على:
- عنوان جذاب ومختصر
- وصف تفصيلي (3-5 أسطر) يشمل المتطلبات والميزات المطلوبة
- ميزانية بين 6000 و 14000 جنيه مصري (أرقام مختلفة ومتنوعة)
- حجم المشروع (micro, small, medium, large)
- أمثلة على مواقع أو تطبيقات مشابهة (1-3 روابط حقيقية)

التصنيفات المتاحة:
${categoryList}`,
          },
          {
            role: "user",
            content: `أنشئ ${finalCount} مشاريع مختلفة ومتنوعة للماركت بلايس`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_requests",
              description: "Create marketplace requests",
              parameters: {
                type: "object",
                properties: {
                  requests: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        budget: { type: "number" },
                        size: { type: "string", enum: ["micro", "small", "medium", "large"] },
                        category_id: { type: "string" },
                        category_name: { type: "string" },
                        examples: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "description", "budget", "size", "category_id", "category_name"],
                    },
                  },
                },
                required: ["requests"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_requests" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الاستخدام، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "يجب إضافة رصيد للـ AI" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const requests = parsed.requests || [];

    // Insert requests into DB
    const inserted: any[] = [];
    for (const r of requests) {
      // Validate category_id exists
      const validCat = categories.find((c) => c.id === r.category_id);
      const catId = validCat ? validCat.id : categories[0].id;
      const catName = validCat ? validCat.name_ar : categories[0].name_ar;

      const sizeCredits: Record<string, number> = { micro: 1, small: 3, medium: 5, large: 10 };

      // Build description with examples
      let fullDesc = r.description || "";
      if (r.examples && r.examples.length > 0) {
        fullDesc += "\n\n🔗 أمثلة ومراجع مشابهة:\n" + r.examples.map((e: string) => `• ${e}`).join("\n");
      }

      const { data: inserted_req, error: insertErr } = await adminClient
        .from("requests")
        .insert({
          user_id: user.id,
          title: r.title,
          description: fullDesc,
          category_id: catId,
          size: r.size || "medium",
          credits_cost: sizeCredits[r.size] || 5,
          status: "submitted",
          publish_mode: "marketplace",
          marketplace_budget_min: Math.max(r.budget - 2000, 5000),
          marketplace_budget_max: r.budget,
          priority: "normal",
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        continue;
      }

      inserted.push({
        ...r,
        category_name: catName,
        description: fullDesc,
      });
    }

    return new Response(JSON.stringify({ requests: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-fake-requests error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
