import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Smart pricing algorithm based on task complexity
function calculateSmartPrice(params: {
  requestSize: string;
  requestCredits: number;
  categoryName: string;
  clientCredits: number;
  clientWalletBalance: number;
  creditToEgp: number;
  taskTitle?: string;
  taskDescription?: string;
}): { suggested_price: number; min_price: number; max_price: number; reasoning: string } {
  const { requestSize, requestCredits, categoryName, creditToEgp, taskTitle, taskDescription } = params;

  // Base pricing by size
  const basePrices: Record<string, number> = {
    micro: creditToEgp * 0.5,
    small: creditToEgp * 1,
    medium: creditToEgp * 2.5,
    large: creditToEgp * 5,
  };

  let basePrice = basePrices[requestSize] || creditToEgp;

  // Category complexity multipliers
  const categoryMultipliers: Record<string, number> = {
    "تصميم": 1.2,
    "برمجة": 1.5,
    "كتابة": 0.9,
    "ترجمة": 1.0,
    "تسويق": 1.1,
    "فيديو": 1.4,
    "صوت": 1.1,
    "عام": 1.0,
  };

  // Find matching category
  let categoryMultiplier = 1.0;
  for (const [cat, mult] of Object.entries(categoryMultipliers)) {
    if (categoryName.includes(cat)) {
      categoryMultiplier = mult;
      break;
    }
  }

  // Task complexity analysis from title/description
  let complexityBonus = 0;
  const complexityKeywords = [
    { words: ["عاجل", "سريع", "فوري"], bonus: 0.2 },
    { words: ["تعديل", "بسيط", "صغير"], bonus: -0.1 },
    { words: ["متقدم", "احترافي", "معقد"], bonus: 0.3 },
    { words: ["موشن", "animation", "3d"], bonus: 0.4 },
    { words: ["api", "integration", "ربط"], bonus: 0.25 },
    { words: ["logo", "لوجو", "هوية"], bonus: 0.15 },
  ];

  const textToAnalyze = `${taskTitle || ""} ${taskDescription || ""}`.toLowerCase();
  for (const { words, bonus } of complexityKeywords) {
    if (words.some(w => textToAnalyze.includes(w.toLowerCase()))) {
      complexityBonus += bonus;
    }
  }

  // Credit cost factor (more credits = more valuable task)
  const creditFactor = Math.log2(requestCredits + 1) / 2;

  // Calculate final price
  let suggestedPrice = basePrice * categoryMultiplier * (1 + complexityBonus) * (1 + creditFactor);
  
  // Round to nearest 5
  suggestedPrice = Math.round(suggestedPrice / 5) * 5;
  
  // Ensure minimum prices
  const minPrices: Record<string, number> = {
    micro: 25,
    small: 50,
    medium: 100,
    large: 200,
  };
  suggestedPrice = Math.max(suggestedPrice, minPrices[requestSize] || 50);

  const minPrice = Math.round(suggestedPrice * 0.7 / 5) * 5;
  const maxPrice = Math.round(suggestedPrice * 1.5 / 5) * 5;

  // Generate reasoning
  const reasons = [];
  if (categoryMultiplier > 1.1) reasons.push(`تصنيف ${categoryName} يتطلب مهارات متخصصة`);
  if (complexityBonus > 0) reasons.push("المهمة تتضمن متطلبات إضافية");
  if (requestCredits > 3) reasons.push(`المهمة تستهلك ${requestCredits} كريديت`);
  reasons.push(`حجم المهمة: ${requestSize === "micro" ? "صغير جداً" : requestSize === "small" ? "صغير" : requestSize === "medium" ? "متوسط" : "كبير"}`);

  return {
    suggested_price: suggestedPrice,
    min_price: minPrice,
    max_price: maxPrice,
    reasoning: reasons.join(" • ") || "تسعير قياسي بناءً على حجم المهمة",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId, taskTitle, taskDescription, clientId } = await req.json();

    if (!requestId || !clientId) {
      throw new Error("Missing required parameters");
    }

    // Fetch client data
    const { data: clientSubscription } = await supabase
      .from("client_subscriptions")
      .select("*, plans(*)")
      .eq("user_id", clientId)
      .eq("is_active", true)
      .maybeSingle();

    // Get client wallet balance
    const { data: walletData } = await supabase
      .from("wallet_ledger")
      .select("balance_after")
      .eq("user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get request details
    const { data: request } = await supabase
      .from("requests")
      .select("*, categories(*)")
      .eq("id", requestId)
      .single();

    // Get credit to EGP rate
    const { data: rateSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "credit_to_egp_rate")
      .single();

    const creditToEgp = parseFloat(rateSetting?.value || "50");
    const clientCredits = clientSubscription?.credits_remaining || 0;
    const clientWalletBalance = walletData?.balance_after || 0;
    const requestCredits = request?.credits_cost || 1;
    const requestSize = request?.size || "small";
    const categoryName = request?.categories?.name_ar || "عام";

    // Calculate price using smart algorithm
    const result = calculateSmartPrice({
      requestSize,
      requestCredits,
      categoryName,
      clientCredits,
      clientWalletBalance,
      creditToEgp,
      taskTitle: taskTitle || request?.title,
      taskDescription: taskDescription || request?.description,
    });

    console.log("Price calculation:", {
      requestSize,
      requestCredits,
      categoryName,
      result,
    });

    return new Response(
      JSON.stringify({
        ...result,
        source: "smart_algorithm",
        pricing_factors: {
          client_credits: clientCredits,
          client_wallet: clientWalletBalance,
          request_credits: requestCredits,
          request_size: requestSize,
          credit_rate: creditToEgp,
          category: categoryName,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in suggest-task-price:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
