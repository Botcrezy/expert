-- =====================================================
-- Training Tasks Seed (Arabic) - Category-based
-- Categories: تصميم / فيديو / برمجة
-- Tasks: 5 per category
-- Updated: 2026-01-29
--
-- ملاحظة:
-- - الملف Idempotent (قدر الإمكان): لا يعيد إدراج نفس التاسك لنفس التخصص لو موجود.
-- - هذا الملف مُخصص للاستيراد اليدوي داخل قاعدة البيانات.
-- =====================================================

-- -------------------------------
-- 1) Ensure categories exist
-- -------------------------------
INSERT INTO public.categories (name, name_ar, is_active, sort_order)
SELECT v.name, v.name_ar, true, v.sort_order
FROM (
  VALUES
    ('design', 'تصميم', 10),
    ('video', 'فيديو', 20),
    ('video_files', 'فيديو (رفع)', 25),
    ('development', 'برمجة', 30)
) AS v(name, name_ar, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.name_ar = v.name_ar
);

-- -------------------------------
-- 2) Insert tasks (5 لكل تخصص)
-- -------------------------------

-- ===== تصميم =====
WITH cat AS (
  SELECT id FROM public.categories WHERE name_ar = 'تصميم' LIMIT 1
)
INSERT INTO public.training_tasks (
  title,
  description,
  requirements,
  category_id,
  difficulty,
  credits_reward,
  stars_reward,
  deadline_hours,
  is_active,
  is_mandatory,
  audience,
  is_category_specific,
  target_categories,
  submission_method
)
SELECT t.title, t.description, t.requirements, (SELECT id FROM cat), t.difficulty, t.credits_reward, t.stars_reward, t.deadline_hours,
       true, true, 'freelancers', true, ARRAY[(SELECT id FROM cat)::text], 'files'
FROM (
  VALUES
    ('تصميم بوست سوشيال (1080×1080)',
     'صمّم بوست مربع للسوشيال: اختر فكرة (عرض/خدمة)، حدد 2-3 ألوان، واستخدم خط واضح. سلّم PNG + ملف المصدر.',
     'PNG (1080×1080) + ملف المصدر (PSD/AI) + استخدام 2-3 ألوان + قابلية قراءة واضحة',
     'beginner', 0, 2, 24),

    ('تصميم بانر هيرو لصفحة خدمات',
     'صمّم بانر Hero (1920×720) لصفحة خدمات: عنوان قوي + CTA واضح + مساحة لصورة/إليستريشن. سلّم JPG/PNG + المصدر.',
     'JPG/PNG (1920×720) + ملف المصدر + CTA واضح + مساحة آمنة للنص',
     'intermediate', 0, 3, 36),

    ('تصميم لوجو بسيط + دليل استخدام سريع',
     'صمّم شعار بسيط (نسخة ملونة + أحادية) ثم اكتب 5 نقاط كـ mini brand guide: ألوان/خطوط/مسافات/استخدامات خاطئة.',
     'نسخة ملونة + أحادية + تصدير SVG/PNG + 5 نقاط دليل استخدام',
     'intermediate', 0, 4, 48),

    ('UI: بطاقة خدمة (Service Card) مع Hover',
     'صمّم UI لبطاقة خدمة تتضمن: صورة/أيقونة، عنوان، وصف مختصر، سعر/بادج. أنشئ حالة Hover واضحة ومتماسكة.',
     'تصميم 2 حالات (Default/Hover) + هيراركي واضح + تباين جيد',
     'intermediate', 0, 3, 36),

    ('إعادة تصميم قسم Pricing بشكل مرتب',
     'اعمل تصميم لقسم تسعير: 3 باقات، تمييز الباقة الأفضل، قائمة مميزات، وزر CTA لكل باقة. ركّز على الهيراركي والوضوح.',
     '3 باقات + تمييز الباقة الأفضل + قائمة مميزات + CTA لكل باقة',
     'intermediate', 0, 4, 48)
) AS t(title, description, requirements, difficulty, credits_reward, stars_reward, deadline_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM public.training_tasks tt
  WHERE tt.category_id = (SELECT id FROM cat)
    AND tt.title = t.title
);


-- ===== فيديو =====
WITH cat AS (
  SELECT id FROM public.categories WHERE name_ar = 'فيديو' LIMIT 1
)
INSERT INTO public.training_tasks (
  title,
  description,
  requirements,
  category_id,
  difficulty,
  credits_reward,
  stars_reward,
  deadline_hours,
  is_active,
  is_mandatory,
  audience,
  is_category_specific,
  target_categories,
  submission_method
)
SELECT t.title, t.description, t.requirements, (SELECT id FROM cat), t.difficulty, t.credits_reward, t.stars_reward, t.deadline_hours,
       true, true, 'freelancers', true, ARRAY[(SELECT id FROM cat)::text], 'gdrive'
FROM (
  VALUES
    ('مونتاج ريل 20 ثانية (إيقاع سريع)',
     'قصّ الفيديو لنسخة 20 ثانية بإيقاع سريع: Jump cuts + نص على الشاشة + موسيقى مناسبة. سلّم MP4 1080×1920.',
     'رابط Google Drive عام (Anyone with the link) + MP4 1080×1920 + مدة 20 ثانية',
     'beginner', 0, 2, 24),

    ('ثَمبنيل يوتيوب جذاب',
     'صمّم Thumbnail 1280×720: عنوان قصير، تباين قوي، عنصر بصري واضح. سلّم PNG + ملف المصدر.',
     'رابط Google Drive عام (Anyone with the link) + PNG 1280×720 + ملف المصدر',
     'beginner', 0, 2, 24),

    ('إضافة Subtitles تلقائية + تصحيح يدوي',
     'أضف Subtitles للفيديو: توليد تلقائي ثم تصحيح يدوي للأخطاء، وتوحيد ستايل الخط والخلفية. سلّم نسخة نهائية.',
     'رابط Google Drive عام + فيديو نهائي + (اختياري) ملف SRT',
     'intermediate', 0, 3, 36),

    ('Color Grading أساسي (قبل/بعد)',
     'نفّذ Color correction ثم grading بسيط. سلّم لقطة قبل/بعد أو نسختين من الفيديو، واذكر الإعدادات الأساسية المستخدمة.',
     'رابط Google Drive عام + قبل/بعد (صورتين أو نسختين فيديو) + ذكر إعدادات مختصرة',
     'intermediate', 0, 3, 36),

    ('Intro/Outro بسيط للبراند',
     'اعمل Intro/Outro (3-5 ثواني) يتضمن لوجو/اسم/سلوغان. ركّز على حركة بسيطة واحترافية. سلّم ملفات فيديو.',
     'رابط Google Drive عام + فيديوهات Intro/Outro + مدة 3-5 ثواني',
     'intermediate', 0, 4, 48)
) AS t(title, description, requirements, difficulty, credits_reward, stars_reward, deadline_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM public.training_tasks tt
  WHERE tt.category_id = (SELECT id FROM cat)
    AND tt.title = t.title
);


-- ===== فيديو (رفع) =====
WITH cat AS (
  SELECT id FROM public.categories WHERE name_ar = 'فيديو (رفع)' LIMIT 1
)
INSERT INTO public.training_tasks (
  title,
  description,
  requirements,
  category_id,
  difficulty,
  credits_reward,
  stars_reward,
  deadline_hours,
  is_active,
  is_mandatory,
  audience,
  is_category_specific,
  target_categories,
  submission_method
)
SELECT t.title, t.description, t.requirements, (SELECT id FROM cat), t.difficulty, t.credits_reward, t.stars_reward, t.deadline_hours,
       true, true, 'freelancers', true, ARRAY[(SELECT id FROM cat)::text], 'files'
FROM (
  VALUES
    ('رفع فيديو MP4 (1080×1920) - ريل 20 ثانية',
     'ارفع ملف MP4 نهائي: 20 ثانية، 1080×1920، مع نص على الشاشة وإيقاع مناسب.',
     'MP4 1080×1920 + مدة 20 ثانية + اسم ملف واضح',
     'beginner', 0, 2, 24),

    ('رفع Thumbnail + ملف المصدر',
     'ارفع Thumbnail 1280×720 بصيغة PNG مع ملف المصدر (PSD/AI).',
     'PNG 1280×720 + ملف المصدر + تباين عالي',
     'beginner', 0, 2, 24),

    ('رفع فيديو مع Subtitles (نسخة نهائية)',
     'ارفع نسخة نهائية للفيديو مع Subtitles (مُدمجة أو ملف SRT).',
     'MP4 نهائي + (اختياري) SRT + قراءة واضحة للنص',
     'intermediate', 0, 3, 36),

    ('رفع قبل/بعد للـ Color Grading',
     'ارفع نسختين: قبل وبعد (فيديو أو لقطات) واذكر أهم الإعدادات المستخدمة.',
     'قبل/بعد + وصف إعدادات مختصر + تنظيم الملفات',
     'intermediate', 0, 3, 36),

    ('رفع Intro/Outro (3-5 ثواني)',
     'ارفع ملفات Intro وOutro (3-5 ثواني) بجودة مناسبة.',
     'Intro + Outro + مدة 3-5 ثواني + تصدير نظيف',
     'intermediate', 0, 4, 48)
) AS t(title, description, requirements, difficulty, credits_reward, stars_reward, deadline_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM public.training_tasks tt
  WHERE tt.category_id = (SELECT id FROM cat)
    AND tt.title = t.title
);


-- ===== برمجة =====
WITH cat AS (
  SELECT id FROM public.categories WHERE name_ar = 'برمجة' LIMIT 1
)
INSERT INTO public.training_tasks (
  title,
  description,
  requirements,
  category_id,
  difficulty,
  credits_reward,
  stars_reward,
  deadline_hours,
  is_active,
  is_mandatory,
  audience,
  is_category_specific,
  target_categories,
  submission_method
)
SELECT t.title, t.description, t.requirements, (SELECT id FROM cat), t.difficulty, t.credits_reward, t.stars_reward, t.deadline_hours,
       true, true, 'freelancers', true, ARRAY[(SELECT id FROM cat)::text], 'files'
FROM (
  VALUES
    ('React: صفحة قائمة بيانات + فلترة',
     'ابنِ صفحة React تعرض قائمة عناصر (mock data) مع Input للفلترة وEmpty state. ركّز على تنظيم الكود وإعادة الاستخدام.',
     'قائمة + فلترة + Empty state + فصل مكونات',
     'beginner', 0, 2, 24),

    ('Form Validation بـ react-hook-form + zod',
     'اعمل فورم (اسم/ايميل/رسالة) باستخدام react-hook-form + zod مع رسائل أخطاء واضحة. أضف حالة loading عند الإرسال.',
     'react-hook-form + zod + رسائل أخطاء + Loading state',
     'intermediate', 0, 3, 36),

    ('UI Dashboard Cards + Skeleton Loading',
     'صمّم Dashboard بسيطة من 4 cards مع Skeleton أثناء التحميل، ثم اعرض بيانات بعد Promise fake. حافظ على فصل المكونات.',
     '4 Cards + Skeleton + Promise fake + فصل المكونات',
     'intermediate', 0, 3, 36),

    ('حماية Route + Redirect للـ Login',
     'نفّذ حماية route: لو المستخدم غير مسجل دخول يتم تحويله لصفحة Login. أضف شاشة Loading قصيرة أثناء التحقق.',
     'Protected route + Redirect + Loading state',
     'intermediate', 0, 3, 36),

    ('CRUD بسيط (إضافة/تعديل/حذف) على قائمة محلية',
     'اعمل CRUD على قائمة محلية (بدون قاعدة بيانات): Add/Edit/Delete مع Dialog للتأكيد عند الحذف. ركّز على UX.',
     'Add/Edit/Delete + Dialog تأكيد حذف + UX واضح',
     'intermediate', 0, 4, 48)
) AS t(title, description, requirements, difficulty, credits_reward, stars_reward, deadline_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM public.training_tasks tt
  WHERE tt.category_id = (SELECT id FROM cat)
    AND tt.title = t.title
);
