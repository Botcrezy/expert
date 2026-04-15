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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { deliveryId } = await req.json();
    if (!deliveryId) throw new Error("Missing deliveryId");

    // Get delivery details
    const { data: delivery, error: delError } = await supabase
      .from("deliveries")
      .select("*, requests(title, description, category_id, categories(name_ar))")
      .eq("id", deliveryId)
      .single();
    if (delError) throw delError;

    const checks: Array<{ name: string; status: string; details: string }> = [];
    let totalScore = 0;

    // Check 1: Has files or links
    const files = delivery.files as any[] || [];
    const links = delivery.delivery_links as any[] || [];
    const hasContent = files.length > 0 || links.length > 0;
    checks.push({
      name: "محتوى التسليم",
      status: hasContent ? "pass" : "fail",
      details: hasContent 
        ? `يحتوي على ${files.length} ملف و ${links.length} رابط`
        : "لا يوجد ملفات أو روابط مرفقة",
    });
    if (hasContent) totalScore += 25;

    // Check 2: Has delivery notes
    const hasNotes = delivery.notes && delivery.notes.trim().length > 10;
    checks.push({
      name: "ملاحظات التسليم",
      status: hasNotes ? "pass" : "warn",
      details: hasNotes 
        ? `ملاحظات مكتوبة (${delivery.notes.length} حرف)`
        : "ملاحظات قصيرة أو غير موجودة",
    });
    if (hasNotes) totalScore += 15;

    // Check 3: File types validation
    if (files.length > 0) {
      const validTypes = files.every((f: any) => f.name || f.url);
      checks.push({
        name: "صحة الملفات",
        status: validTypes ? "pass" : "warn",
        details: validTypes ? "جميع الملفات صالحة" : "بعض الملفات قد تكون تالفة",
      });
      if (validTypes) totalScore += 20;
    }

    // Check 4: Revision number
    checks.push({
      name: "رقم المراجعة",
      status: delivery.revision_number <= 2 ? "pass" : "warn",
      details: `المراجعة رقم ${delivery.revision_number}`,
    });
    if (delivery.revision_number <= 2) totalScore += 15;

    // AI-powered summary if LOVABLE_API_KEY is available
    let summary = `تقييم تلقائي: ${totalScore}/75 - `;
    if (totalScore >= 60) summary += "جودة ممتازة";
    else if (totalScore >= 40) summary += "جودة مقبولة";
    else summary += "يحتاج مراجعة يدوية";

    if (lovableKey) {
      try {
        const requestTitle = (delivery.requests as any)?.title || "";
        const requestDesc = (delivery.requests as any)?.description || "";
        const categoryName = (delivery.requests as any)?.categories?.name_ar || "";

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "أنت مراجع جودة محترف. قيّم التسليم بناءً على المعلومات المتاحة وأعطِ ملخصاً مختصراً بالعربية (جملتين فقط).",
              },
              {
                role: "user",
                content: `طلب: ${requestTitle}\nوصف: ${requestDesc}\nتصنيف: ${categoryName}\nعدد الملفات: ${files.length}\nعدد الروابط: ${links.length}\nملاحظات الفريلانسر: ${delivery.notes || "لا يوجد"}\nرقم المراجعة: ${delivery.revision_number}\nالنتيجة الأولية: ${totalScore}/75`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiSummary = aiData.choices?.[0]?.message?.content;
          if (aiSummary) {
            summary = aiSummary;
            totalScore += 25; // Bonus for AI analysis
          }
        }
      } catch (aiErr) {
        console.error("AI analysis failed (non-fatal):", aiErr);
      }
    }

    // Save results
    const { data: result, error: insertError } = await supabase
      .from("ai_qc_results")
      .insert({
        delivery_id: deliveryId,
        request_id: delivery.request_id,
        freelancer_id: delivery.freelancer_id,
        score: Math.min(totalScore, 100),
        checks,
        summary,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("AI QC error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
