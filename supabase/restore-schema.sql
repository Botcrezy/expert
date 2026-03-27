-- =====================================================
-- Sity Expert - Database Restore Schema
-- =====================================================
-- هذا الملف يحتوي على كافة البيانات اللازمة لاستعادة قاعدة البيانات
-- يتم تحديثه تلقائياً مع كل تغيير في النظام
-- =====================================================
-- الاستخدام:
-- 1. افتح Supabase Dashboard
-- 2. اذهب إلى SQL Editor
-- 3. الصق محتوى هذا الملف
-- 4. اضغط RUN
-- =====================================================

-- ملاحظة مهمة:
-- هذا الملف أصبح "Seed + بيانات تكميلية" فقط.
-- شغّل أولاً: complete-schema.sql
-- ثم شغّل هذا الملف.

-- =====================================================
-- البيانات الأولية الإضافية
-- =====================================================

-- إعدادات النظام الافتراضية الإضافية
INSERT INTO site_settings (key, value, category, is_public) VALUES
  ('telegram_welcome_message', '"مرحباً بك في Sity Expert! تم ربط حسابك بنجاح 🎉"', 'telegram', false),
  ('telegram_enabled', 'true', 'telegram', false),
  ('verification_mandatory_clients', 'false', 'verification', false),
  ('verification_mandatory_freelancers', 'true', 'verification', false),
  ('auto_approve_freelancers', 'false', 'freelancers', false),
  ('max_active_tasks_per_freelancer', '5', 'freelancers', false),
  ('qc_required', 'true', 'orders', false),
  ('allow_client_direct_messages', 'true', 'messages', false),
  -- إعدادات الإحالات
  ('referral_client_required', '10', 'referrals', false),
  ('referral_client_reward_credits', '5', 'referrals', false),
  ('referral_freelancer_required', '50', 'referrals', false),
  ('referral_freelancer_reward_usd', '5', 'referrals', false),
  ('referral_usd_to_egp', '48', 'referrals', false)
ON CONFLICT (key) DO NOTHING;

-- فئات إضافية
INSERT INTO categories (name, name_ar, description, icon, sort_order, is_active) VALUES
  ('Video Production', 'إنتاج الفيديو', 'خدمات تصوير وإنتاج الفيديو', 'video', 6, true),
  ('Audio Production', 'إنتاج الصوتيات', 'خدمات التسجيل والمونتاج الصوتي', 'mic', 7, true),
  ('3D Design', 'التصميم ثلاثي الأبعاد', 'نمذجة وتصميم 3D', 'box', 8, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- محتوى CMS للصفحة الرئيسية
-- =====================================================

-- إنشاء صفحة الهوم إذا لم تكن موجودة
INSERT INTO cms_pages (slug, title, title_ar, meta_title, meta_description, is_published, page_blocks)
VALUES (
  'home',
  'Home',
  'الرئيسية',
  'Sity Experts - منصة خدمات مُدارة',
  'منصة خدمات احترافية مُدارة توفر لك فريق خبراء متخصصين في التصميم والبرمجة والتسويق',
  true,
  '[
    {
      "id": "hero-1",
      "type": "hero",
      "props": {
        "title": "حوّل أفكارك إلى واقع مع فريق من الخبراء",
        "subtitle": "منصة خدمات مُدارة توفر لك تصميم احترافي، برمجة متقدمة، وتسويق ذكي - كل ذلك بجودة مضمونة وأسعار تنافسية",
        "primaryButtonText": "ابدأ الآن مجاناً",
        "primaryButtonLink": "/register",
        "secondaryButtonText": "تعرف على خدماتنا",
        "secondaryButtonLink": "/services",
        "backgroundImage": "",
        "variant": "gradient"
      }
    },
    {
      "id": "stats-1",
      "type": "stats",
      "props": {
        "stats": [
          {"value": "500+", "label": "مشروع منجز"},
          {"value": "98%", "label": "رضا العملاء"},
          {"value": "50+", "label": "خبير متخصص"},
          {"value": "24/7", "label": "دعم فني"}
        ]
      }
    },
    {
      "id": "features-1",
      "type": "features",
      "props": {
        "title": "لماذا تختار Sity Experts؟",
        "subtitle": "نقدم لك تجربة فريدة تجمع بين الجودة والسرعة والاحترافية",
        "features": [
          {
            "icon": "shield-check",
            "title": "جودة مضمونة",
            "description": "فريق مراجعة جودة متخصص يضمن لك أعلى معايير الجودة في كل تسليم"
          },
          {
            "icon": "clock",
            "title": "تسليم سريع",
            "description": "التزام تام بالمواعيد مع متابعة لحظية لتقدم مشروعك"
          },
          {
            "icon": "users",
            "title": "فريق خبراء",
            "description": "نخبة من المحترفين المعتمدين في مختلف التخصصات"
          },
          {
            "icon": "headphones",
            "title": "دعم متواصل",
            "description": "فريق دعم فني متاح على مدار الساعة لمساعدتك"
          },
          {
            "icon": "refresh-cw",
            "title": "تعديلات مجانية",
            "description": "تعديلات غير محدودة حتى رضاك التام عن العمل"
          },
          {
            "icon": "lock",
            "title": "سرية تامة",
            "description": "حماية كاملة لبياناتك ومشاريعك مع ضمان السرية"
          }
        ]
      }
    },
    {
      "id": "services-1",
      "type": "services",
      "props": {
        "title": "خدماتنا المميزة",
        "subtitle": "مجموعة متكاملة من الخدمات الاحترافية لتلبية جميع احتياجاتك",
        "services": [
          {
            "icon": "palette",
            "title": "التصميم الجرافيكي",
            "description": "تصميم هويات بصرية، شعارات، بوستات سوشيال ميديا، وتصميمات إبداعية",
            "price": "من 1 كريديت"
          },
          {
            "icon": "code",
            "title": "البرمجة والتطوير",
            "description": "مواقع إلكترونية، تطبيقات موبايل، أنظمة إدارة، وحلول برمجية متكاملة",
            "price": "من 3 كريديت"
          },
          {
            "icon": "megaphone",
            "title": "التسويق الرقمي",
            "description": "إدارة حملات إعلانية، SEO، كتابة محتوى، وإدارة السوشيال ميديا",
            "price": "من 2 كريديت"
          },
          {
            "icon": "video",
            "title": "إنتاج الفيديو",
            "description": "مونتاج احترافي، موشن جرافيك، تصوير فيديو، وإنتاج محتوى مرئي",
            "price": "من 3 كريديت"
          }
        ]
      }
    },
    {
      "id": "how-it-works-1",
      "type": "timeline",
      "props": {
        "title": "كيف يعمل النظام؟",
        "subtitle": "4 خطوات بسيطة للحصول على خدمتك",
        "steps": [
          {
            "number": "1",
            "title": "أنشئ حسابك",
            "description": "سجل مجاناً واحصل على كريديت مجاني للتجربة"
          },
          {
            "number": "2",
            "title": "قدم طلبك",
            "description": "اشرح متطلباتك بالتفصيل وارفق الملفات المطلوبة"
          },
          {
            "number": "3",
            "title": "نعمل على مشروعك",
            "description": "فريق الخبراء يعمل على تنفيذ طلبك باحترافية عالية"
          },
          {
            "number": "4",
            "title": "استلم وراجع",
            "description": "استلم عملك النهائي واطلب تعديلات حتى رضاك التام"
          }
        ]
      }
    },
    {
      "id": "testimonials-1",
      "type": "testimonials",
      "props": {
        "title": "ماذا يقول عملاؤنا؟",
        "subtitle": "آراء حقيقية من عملاء سعداء",
        "testimonials": [
          {
            "name": "أحمد محمد",
            "role": "صاحب شركة",
            "content": "خدمة ممتازة وجودة عالية. الفريق محترف جداً والتسليم في الموعد دائماً.",
            "rating": 5
          },
          {
            "name": "سارة علي",
            "role": "مديرة تسويق",
            "content": "تعاملت مع عدة منصات لكن Sity Experts الأفضل من حيث الجودة والسعر.",
            "rating": 5
          },
          {
            "name": "محمد خالد",
            "role": "رائد أعمال",
            "content": "الدعم الفني سريع جداً والتعديلات تتم بسرعة. أنصح بشدة!",
            "rating": 5
          }
        ]
      }
    },
    {
      "id": "cta-1",
      "type": "cta",
      "props": {
        "title": "جاهز للبدء؟",
        "subtitle": "انضم لآلاف العملاء الراضين واحصل على كريديت مجاني للتجربة",
        "buttonText": "ابدأ مجاناً الآن",
        "buttonLink": "/register",
        "variant": "gradient"
      }
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  page_blocks = EXCLUDED.page_blocks,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

-- صفحة الخدمات
INSERT INTO cms_pages (slug, title, title_ar, meta_title, meta_description, is_published, page_blocks)
VALUES (
  'services',
  'Services',
  'الخدمات',
  'خدماتنا - Sity Experts',
  'استكشف مجموعة خدماتنا الاحترافية في التصميم والبرمجة والتسويق',
  true,
  '[
    {
      "id": "hero-services",
      "type": "hero",
      "props": {
        "title": "خدمات احترافية بين يديك",
        "subtitle": "فريق متكامل من الخبراء جاهز لتنفيذ جميع أعمالك بجودة عالية وأسعار تنافسية",
        "primaryButtonText": "اطلب خدمة الآن",
        "primaryButtonLink": "/register",
        "variant": "minimal"
      }
    },
    {
      "id": "services-grid",
      "type": "services",
      "props": {
        "title": "تصفح خدماتنا",
        "subtitle": "",
        "services": [
          {
            "icon": "palette",
            "title": "تصميم الهوية البصرية",
            "description": "شعارات احترافية، أنظمة ألوان، خطوط، وجميع عناصر الهوية البصرية",
            "price": "من 5 كريديت"
          },
          {
            "icon": "image",
            "title": "تصميم السوشيال ميديا",
            "description": "بوستات، ستوريز، كوڤرز، وتصميمات جاهزة للنشر",
            "price": "من 1 كريديت"
          },
          {
            "icon": "layout",
            "title": "تصميم UI/UX",
            "description": "واجهات مستخدم حديثة وتجربة مستخدم سلسة لمواقعك وتطبيقاتك",
            "price": "من 3 كريديت"
          },
          {
            "icon": "globe",
            "title": "تطوير المواقع",
            "description": "مواقع إلكترونية متجاوبة، متاجر إلكترونية، ولاندينج بيدج",
            "price": "من 5 كريديت"
          },
          {
            "icon": "smartphone",
            "title": "تطوير التطبيقات",
            "description": "تطبيقات iOS و Android بأحدث التقنيات",
            "price": "من 10 كريديت"
          },
          {
            "icon": "trending-up",
            "title": "التسويق الرقمي",
            "description": "حملات إعلانية، SEO، وإدارة حسابات التواصل الاجتماعي",
            "price": "من 3 كريديت"
          }
        ]
      }
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  page_blocks = EXCLUDED.page_blocks;

-- صفحة الأسعار
INSERT INTO cms_pages (slug, title, title_ar, meta_title, meta_description, is_published, page_blocks)
VALUES (
  'pricing',
  'Pricing',
  'الأسعار',
  'الأسعار والباقات - Sity Experts',
  'تعرف على باقات الأسعار المناسبة لاحتياجاتك',
  true,
  '[
    {
      "id": "hero-pricing",
      "type": "hero",
      "props": {
        "title": "باقات مرنة تناسب احتياجاتك",
        "subtitle": "اختر الباقة المناسبة لك وابدأ في تنفيذ مشاريعك فوراً",
        "variant": "minimal"
      }
    },
    {
      "id": "pricing-note",
      "type": "text",
      "props": {
        "content": "جميع الباقات تشمل: مراجعة جودة، تعديلات مجانية، ودعم فني"
      }
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  page_blocks = EXCLUDED.page_blocks;

-- صفحة كيف يعمل
INSERT INTO cms_pages (slug, title, title_ar, meta_title, meta_description, is_published, page_blocks)
VALUES (
  'how-it-works',
  'How It Works',
  'كيف يعمل',
  'كيف يعمل النظام - Sity Experts',
  'تعرف على خطوات العمل البسيطة للحصول على خدماتنا',
  true,
  '[
    {
      "id": "hero-how",
      "type": "hero",
      "props": {
        "title": "كيف يعمل Sity Experts؟",
        "subtitle": "عملية بسيطة وسهلة من البداية للنهاية",
        "variant": "minimal"
      }
    },
    {
      "id": "timeline-how",
      "type": "timeline",
      "props": {
        "title": "",
        "steps": [
          {
            "number": "1",
            "title": "سجل حسابك مجاناً",
            "description": "أنشئ حسابك في دقائق واحصل على كريديت مجاني للتجربة. لا نحتاج بطاقة ائتمان."
          },
          {
            "number": "2",
            "title": "اشرح متطلباتك",
            "description": "قدم طلبك مع وصف تفصيلي لما تحتاجه. يمكنك إرفاق ملفات ومراجع للتوضيح."
          },
          {
            "number": "3",
            "title": "نخصص لك خبير",
            "description": "نختار أفضل خبير متخصص في مجال طلبك ليعمل على مشروعك."
          },
          {
            "number": "4",
            "title": "مراجعة الجودة",
            "description": "قبل التسليم، فريق الجودة يراجع العمل ليضمن أعلى المعايير."
          },
          {
            "number": "5",
            "title": "التسليم والتعديلات",
            "description": "تستلم عملك النهائي ويمكنك طلب تعديلات حتى رضاك التام."
          }
        ]
      }
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  page_blocks = EXCLUDED.page_blocks;

-- صفحة الأسئلة الشائعة
INSERT INTO cms_pages (slug, title, title_ar, meta_title, meta_description, is_published, page_blocks)
VALUES (
  'faq',
  'FAQ',
  'الأسئلة الشائعة',
  'الأسئلة الشائعة - Sity Experts',
  'إجابات على أكثر الأسئلة شيوعاً حول خدماتنا',
  true,
  '[
    {
      "id": "hero-faq",
      "type": "hero",
      "props": {
        "title": "الأسئلة الشائعة",
        "subtitle": "كل ما تحتاج معرفته عن خدماتنا",
        "variant": "minimal"
      }
    },
    {
      "id": "faq-list",
      "type": "faq",
      "props": {
        "questions": [
          {
            "question": "ما هو نظام الكريديت؟",
            "answer": "الكريديت هو وحدة قياس لحجم العمل. كل خدمة لها تكلفة بالكريديت حسب حجمها وتعقيدها."
          },
          {
            "question": "هل يمكنني استرداد أموالي؟",
            "answer": "نعم، نقدم ضمان استرداد الأموال خلال 30 يوم إذا لم تكن راضياً عن الخدمة."
          },
          {
            "question": "كم تستغرق الخدمات؟",
            "answer": "يختلف الوقت حسب حجم المشروع. المهام الصغيرة تنجز خلال 24-48 ساعة، والمشاريع الكبيرة قد تستغرق أسابيع."
          },
          {
            "question": "هل يمكنني طلب تعديلات؟",
            "answer": "نعم! جميع الباقات تشمل تعديلات مجانية حتى رضاك التام عن العمل."
          },
          {
            "question": "كيف أتواصل مع فريق الدعم؟",
            "answer": "يمكنك التواصل معنا عبر الدردشة المباشرة، البريد الإلكتروني، أو تيليجرام. فريقنا متاح 24/7."
          }
        ]
      }
    }
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  page_blocks = EXCLUDED.page_blocks;

-- =====================================================
-- ملاحظات للمطور
-- =====================================================
-- • يجب تشغيل هذا الملف بعد complete-schema.sql
-- • يحتوي على بيانات تكميلية وإعدادات إضافية
-- • لا تقم بتعديل هذا الملف يدوياً
-- =====================================================
