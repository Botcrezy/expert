import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Saudi-style professional order templates per category
const orderTemplates: Record<string, { titles: string[]; descriptions: string[] }> = {
  "تطوير مواقع الويب": {
    titles: [
      "تطوير موقع إلكتروني متكامل لشركة عقارية في الرياض",
      "بناء منصة حجوزات إلكترونية لمنتجع سياحي بجدة",
      "تطوير بوابة إلكترونية لمؤسسة حكومية بالمملكة",
      "إنشاء موقع تجارة إلكترونية لماركة أزياء سعودية",
      "تطوير موقع تعريفي متقدم لمجموعة استثمارية بالدمام",
      "بناء منصة تعليمية متكاملة لمعهد تدريب بمكة",
      "تطوير موقع لشركة لوجستيات وشحن في المنطقة الشرقية",
      "إنشاء بوابة خدمات إلكترونية لمستشفى خاص بالرياض",
      "تطوير منصة مزادات إلكترونية للسوق السعودي",
      "بناء موقع لشركة مقاولات كبرى بالمملكة",
      "تطوير منصة توظيف متخصصة للسوق السعودي",
    ],
    descriptions: [
      "نحتاج تطوير موقع إلكتروني احترافي بتصميم عصري يعكس هوية الشركة، مع لوحة تحكم متقدمة، ونظام إدارة محتوى، ودعم كامل للغتين العربية والإنجليزية. الموقع لازم يكون متجاوب مع جميع الأجهزة ومتوافق مع معايير الوصول الرقمي السعودية.",
      "المطلوب بناء منصة متكاملة تتضمن نظام حجوزات، بوابة دفع إلكتروني، لوحة تحكم للإدارة، وتقارير تفصيلية. لازم يكون التصميم فاخر ويعكس جودة الخدمات المقدمة مع دعم كامل للموبايل.",
      "نبي تطوير بوابة إلكترونية شاملة تخدم المستفيدين بكفاءة عالية، مع نظام تسجيل دخول آمن، ونماذج إلكترونية ذكية، وتكامل مع الأنظمة الحكومية. الأداء والأمان أولوية قصوى.",
    ],
  },
  "تطوير تطبيقات الموبايل": {
    titles: [
      "تطوير تطبيق توصيل طلبات لسلسلة مطاعم بالرياض",
      "بناء تطبيق إدارة عقارات للمستثمرين السعوديين",
      "تطوير تطبيق صحي لمتابعة المرضى في مستشفى بجدة",
      "إنشاء تطبيق حجز مواعيد لصالون تجميل فاخر بالرياض",
      "تطوير تطبيق تعليمي تفاعلي لمدارس أهلية بالمملكة",
      "بناء تطبيق إدارة أسطول مركبات لشركة نقل بالدمام",
      "تطوير تطبيق سوق إلكتروني للمنتجات المحلية السعودية",
      "إنشاء تطبيق لإدارة الفعاليات والمؤتمرات بالمملكة",
      "تطوير تطبيق خدمات منزلية عند الطلب للسوق السعودي",
      "بناء تطبيق تتبع شحنات لشركة لوجستيات بالمنطقة الشرقية",
      "تطوير تطبيق ولاء عملاء لسلسلة متاجر تجزئة سعودية",
    ],
    descriptions: [
      "نحتاج تطوير تطبيق موبايل احترافي (iOS و Android) بتجربة مستخدم سلسة وتصميم حديث. التطبيق لازم يتضمن نظام إشعارات، خرائط GPS، بوابة دفع إلكتروني، ولوحة تحكم للإدارة. الأداء والسرعة أولوية عالية.",
      "المطلوب بناء تطبيق متكامل يدعم العربية والإنجليزية، مع نظام تسجيل دخول آمن، وتكامل مع APIs خارجية، وتقارير تحليلية متقدمة. لازم يكون التطبيق سريع ومستقر.",
      "نبي تطوير تطبيق بتقنية حديثة مع واجهة مستخدم بديهية وسهلة الاستخدام. التطبيق لازم يشتغل بكفاءة حتى مع اتصال إنترنت ضعيف ويدعم الإشعارات الفورية.",
    ],
  },
  "التصميم الجرافيكي": {
    titles: [
      "تصميم مجموعة مطبوعات لحملة تسويقية لشركة تقنية سعودية",
      "تصميم كتالوج منتجات فاخر لماركة عطور بالرياض",
      "تصميم تقرير سنوي احترافي لمجموعة استثمارية بجدة",
      "تصميم مواد دعائية لمعرض دولي بالمملكة",
      "تصميم مجلة إلكترونية لمؤسسة ثقافية سعودية",
      "تصميم باكدج سوشيال ميديا لمطعم فاخر بالرياض",
      "تصميم بروفايل شركة مقاولات كبرى بالدمام",
      "تصميم مطبوعات لفعالية رياضية كبرى بالمملكة",
      "تصميم قوائم طعام إبداعية لسلسلة مقاهي سعودية",
      "تصميم عروض تقديمية احترافية لشركة استشارات بجدة",
      "تصميم تغليف منتجات لعلامة تجارية سعودية جديدة",
    ],
    descriptions: [
      "نحتاج تصميمات جرافيكية احترافية بجودة عالية تعكس هوية العلامة التجارية. التصميمات لازم تكون إبداعية ومبتكرة مع مراعاة الذوق السعودي والثقافة المحلية. نبي ملفات مصدرية كاملة بصيغ متعددة.",
      "المطلوب تصميمات راقية وفاخرة تناسب مستوى العلامة التجارية. لازم تكون التصميمات متناسقة مع الهوية البصرية القائمة ومتوافقة مع معايير الطباعة والعرض الرقمي.",
      "نبي تصميمات مبتكرة تجذب الانتباه وتوصل الرسالة بوضوح. التصميمات لازم تكون مناسبة للاستخدام في المنصات الرقمية والمطبوعات مع جودة عالية الدقة.",
    ],
  },
};

// Generic templates for categories not explicitly listed
const genericTemplates = {
  titles: [
    "مشروع احترافي متقدم في مجال {category} لشركة رائدة بالرياض",
    "خدمة متخصصة في {category} لمؤسسة كبرى بجدة",
    "مشروع شامل في {category} لعميل مميز بالمنطقة الشرقية",
    "تنفيذ متطلبات متقدمة في {category} لشركة ناشئة سعودية",
    "مشروع {category} متكامل لجهة حكومية بالمملكة",
    "خدمة {category} احترافية لمجموعة تجارية بالدمام",
    "تنفيذ مهمة كبيرة في {category} لمنظمة غير ربحية سعودية",
    "مشروع {category} عالي الجودة لشركة في قطاع الطاقة",
    "خدمة {category} شاملة لمستشفى خاص بمكة المكرمة",
    "مشروع متخصص في {category} لشركة تقنية بالرياض",
    "تنفيذ {category} لمشروع رؤية 2030 بالمملكة",
  ],
  descriptions: [
    "نحتاج خدمة احترافية عالية الجودة في مجال {category}. المتطلبات واضحة والمعايير عالية. نتوقع تسليم احترافي متكامل يلبي معايير الجودة السعودية والدولية. المشروع كبير ويحتاج خبرة متقدمة وتركيز عالي على التفاصيل. نبي شغل يعكس مستوى الشركة ويكون قابل للتطوير مستقبلاً.",
    "المطلوب تنفيذ مشروع متكامل في {category} بأعلى معايير الجودة. المشروع يستهدف السوق السعودي والخليجي ولازم يراعي الثقافة المحلية والمتطلبات التنظيمية. نحتاج فريق عمل متخصص يقدر يسلم العمل بجودة استثنائية وفي الوقت المحدد.",
    "نبي تنفيذ احترافي ومتقن في مجال {category}. المشروع كبير ومعقد ويحتاج خبرة عميقة. لازم يكون العمل النهائي بمستوى عالمي ويتوافق مع أحدث المعايير والممارسات. نحتاج تقارير تقدم دورية وتواصل مستمر خلال فترة التنفيذ.",
    "عندنا مشروع ضخم في {category} يحتاج تنفيذ سريع واحترافي. المشروع جزء من خطة تطوير أعمال كبيرة ولازم يكون بأعلى مستوى. نحتاج التزام كامل بالجودة والمواعيد مع مرونة في التعديلات.",
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { user_id, num_orders = 500 } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all active categories
    const { data: categories, error: catError } = await supabaseAdmin
      .from("categories")
      .select("id, name, name_ar")
      .eq("is_active", true)
      .order("sort_order");

    if (catError || !categories || categories.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to fetch categories", details: catError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating ${num_orders} orders across ${categories.length} categories for user ${user_id}`);

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < num_orders; i++) {
      const category = categories[i % categories.length];
      const catNameAr = category.name_ar;

      // Get templates
      const templates = orderTemplates[catNameAr] || null;
      let title: string;
      let description: string;

      if (templates) {
        title = templates.titles[i % templates.titles.length];
        description = templates.descriptions[i % templates.descriptions.length];
      } else {
        const gt = genericTemplates;
        title = gt.titles[i % gt.titles.length].replace(/\{category\}/g, catNameAr);
        description = gt.descriptions[i % gt.descriptions.length].replace(/\{category\}/g, catNameAr);
      }

      // Add unique suffix to avoid duplicate titles
      const suffix = ` #${String(i + 1).padStart(3, "0")}`;
      title = title + suffix;

      const requestId = crypto.randomUUID();
      const idempKey = `bulk-${user_id}-${i}-${Date.now()}`;

      try {
        const { data, error } = await supabaseAdmin.rpc("create_request_with_credits", {
          p_user_id: user_id,
          p_request_id: requestId,
          p_idempotency_key: idempKey,
          p_category_id: category.id,
          p_title: title,
          p_description: description,
          p_size: "large",
          p_deadline: null,
          p_files: [],
        });

        if (error) {
          results.failed++;
          results.errors.push(`Order ${i + 1}: ${error.message}`);
          if (results.failed >= 5) {
            return new Response(
              JSON.stringify({
                error: "Too many failures, stopping",
                results,
              }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          results.success++;
        }
      } catch (e) {
        results.failed++;
        results.errors.push(`Order ${i + 1}: ${e.message}`);
      }

      // Small delay every 10 orders to avoid overwhelming the DB
      if (i > 0 && i % 10 === 0) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    console.log(`Bulk creation complete: ${results.success} success, ${results.failed} failed`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bulk create error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
