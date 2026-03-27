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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId } = await req.json();
    if (!requestId) throw new Error("Missing requestId");

    // Fetch request details
    const { data: request, error: reqError } = await supabase
      .from("requests")
      .select("*, categories(name_ar, name)")
      .eq("id", requestId)
      .single();
    if (reqError) throw reqError;

    // Get credit rate
    const { data: rateSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "credit_to_egp_rate")
      .single();
    const creditToEgp = parseFloat(rateSetting?.value || "50");

    // Get recent completed assignments for pricing context
    const { data: recentAssignments } = await supabase
      .from("assignments")
      .select("payment_amount, request_id, requests(size, credits_cost, categories(name_ar))")
      .not("payment_amount", "is", null)
      .gt("payment_amount", 0)
      .order("assigned_at", { ascending: false })
      .limit(20);

    const recentPrices = (recentAssignments || []).map((a: any) => ({
      amount: a.payment_amount,
      size: a.requests?.size,
      credits: a.requests?.credits_cost,
      category: a.requests?.categories?.name_ar,
    }));

    const prompt = `أنت خبير تسعير مهام فريلانسينج في السوق المصري. حلل المهمة التالية واقترح سعر عادل بالجنيه المصري.

بيانات المهمة:
- العنوان: ${request.title}
- الوصف: ${request.description || "غير متوفر"}
- التصنيف: ${request.categories?.name_ar || "عام"}
- الحجم: ${request.size}
- الكريديت: ${request.credits_cost}
- سعر الكريديت: ${creditToEgp} ج.م

أسعار مهام سابقة مشابهة:
${recentPrices.map((p: any) => `- ${p.category} (${p.size}): ${p.amount} ج.م`).join("\n") || "لا توجد بيانات سابقة"}

اقترح سعر يراعي:
1. تعقيد المهمة والمهارات المطلوبة
2. حجم المهمة والوقت المتوقع
3. أسعار السوق المصري الحالية
4. الأسعار السابقة للمهام المشابهة`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "أنت محلل تسعير ذكي. ترد فقط بـ JSON. لا تضف أي نص خارج الـ JSON.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_price",
              description: "اقترح سعر ذكي للمهمة بالجنيه المصري",
              parameters: {
                type: "object",
                properties: {
                  suggested_price: {
                    type: "number",
                    description: "السعر المقترح بالجنيه المصري (مقرب لأقرب 5)",
                  },
                  min_price: {
                    type: "number",
                    description: "الحد الأدنى للسعر",
                  },
                  max_price: {
                    type: "number",
                    description: "الحد الأقصى للسعر",
                  },
                  reasoning: {
                    type: "string",
                    description: "شرح مختصر لسبب التسعير بالعربية",
                  },
                  complexity_level: {
                    type: "string",
                    enum: ["بسيط", "متوسط", "معقد", "متقدم"],
                    description: "مستوى تعقيد المهمة",
                  },
                  estimated_hours: {
                    type: "number",
                    description: "عدد الساعات المتوقعة للتنفيذ",
                  },
                },
                required: ["suggested_price", "min_price", "max_price", "reasoning", "complexity_level", "estimated_hours"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_price" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد الأقصى للطلبات، حاول مرة أخرى لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد AI غير كافي" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const pricing = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        ...pricing,
        source: "ai_smart_pricing",
        request_info: {
          size: request.size,
          credits: request.credits_cost,
          category: request.categories?.name_ar,
          credit_rate: creditToEgp,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("AI pricing error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
