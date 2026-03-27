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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requestId } = await req.json();
    if (!requestId) throw new Error("Missing requestId");

    // Get request with category
    const { data: request, error: reqError } = await supabase
      .from("requests")
      .select("*, categories(id, name_ar)")
      .eq("id", requestId)
      .single();
    if (reqError) throw reqError;

    // Get all verified freelancers with profiles
    const { data: freelancers } = await supabase
      .from("freelancer_profiles")
      .select("*")
      .eq("is_verified", true);

    if (!freelancers || freelancers.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], message: "لا يوجد فريلانسرز متاحين" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get freelancer names
    const userIds = freelancers.map((f) => f.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    // Get active assignments count per freelancer
    const { data: activeAssignments } = await supabase
      .from("assignments")
      .select("freelancer_id")
      .eq("is_active", true)
      .in("freelancer_id", userIds);

    const activeCountMap: Record<string, number> = {};
    (activeAssignments || []).forEach((a) => {
      activeCountMap[a.freelancer_id] = (activeCountMap[a.freelancer_id] || 0) + 1;
    });

    // Score each freelancer
    const scored = freelancers.map((f) => {
      let score = 0;
      const reasons: string[] = [];

      // Category match (highest weight)
      const categoryMatch = request.category_id && (f.categories || []).includes(request.category_id);
      if (categoryMatch) {
        score += 50;
        reasons.push("متخصص في نفس التصنيف");
      }

      // Stars/Rating
      const stars = f.stars || 0;
      score += stars * 8;
      if (stars >= 4) reasons.push(`تقييم ${stars} نجوم`);

      // Completed tasks (experience)
      const completed = f.completed_tasks || 0;
      score += Math.min(completed * 2, 20);
      if (completed >= 10) reasons.push(`خبرة ${completed} مهمة`);

      // Availability bonus
      if (f.is_available) {
        score += 10;
        reasons.push("متاح حالياً");
      }

      // Active tasks penalty (less is better)
      const activeCount = activeCountMap[f.user_id] || 0;
      score -= activeCount * 5;
      if (activeCount === 0) reasons.push("لا يوجد مهام نشطة");
      else if (activeCount >= 3) reasons.push(`مشغول (${activeCount} مهام)`);

      const profile = profiles?.find((p) => p.user_id === f.user_id);

      return {
        user_id: f.user_id,
        name: profile?.full_name || "غير معروف",
        email: profile?.email,
        stars,
        completed_tasks: completed,
        is_available: f.is_available,
        active_tasks: activeCount,
        category_match: !!categoryMatch,
        score,
        reasons,
        bio: f.bio,
        categories: f.categories,
      };
    });

    // Sort by score descending, take top 5
    scored.sort((a, b) => b.score - a.score);
    const suggestions = scored.slice(0, 5);

    return new Response(
      JSON.stringify({
        suggestions,
        request_category: request.categories?.name_ar || "عام",
        total_freelancers: freelancers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Suggest assignment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
