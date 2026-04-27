
-- =====================================================================
-- PART 1: Scale back-payments from 100,100 → 40,000 (factor ≈ 0.3996)
-- =====================================================================
DO $$
DECLARE
  v_original_total numeric;
  v_target_total numeric := 40000;
  v_factor numeric;
  r RECORD;
  v_new_amount numeric;
  v_diff numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_original_total
  FROM public.wallet_ledger
  WHERE reason = 'دفعة تسليم معتمد (مرتجع)' AND type = 'credit';

  IF v_original_total = 0 THEN
    RAISE NOTICE 'No backfill payments to scale. Skipping.';
    RETURN;
  END IF;

  v_factor := v_target_total / v_original_total;

  -- Update each ledger entry proportionally and adjust freelancer total_earnings
  FOR r IN
    SELECT id, user_id, amount
    FROM public.wallet_ledger
    WHERE reason = 'دفعة تسليم معتمد (مرتجع)' AND type = 'credit'
    ORDER BY created_at, id
  LOOP
    v_new_amount := round(r.amount * v_factor, 2);
    v_diff := v_new_amount - r.amount; -- negative

    UPDATE public.wallet_ledger
    SET amount = v_new_amount,
        balance_after = balance_after + v_diff,
        reason = 'دفعة تسليم معتمد (معدّلة)'
    WHERE id = r.id;

    UPDATE public.freelancer_profiles
    SET total_earnings = GREATEST(COALESCE(total_earnings, 0) + v_diff, 0),
        updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- =====================================================================
-- PART 2: Insert 20 fresh detailed marketplace projects with real URLs
-- =====================================================================
DO $$
DECLARE
  v_client_id uuid := '76096b98-e2d3-4a78-adac-88498932cdb1';
  v_cat_security uuid;
  v_cat_ai uuid;
  v_cat_mobile uuid;
  v_cat_web uuid;
  v_cat_frontend uuid;
  v_cat_backend uuid;
  v_cat_seo uuid;
  v_cat_motion uuid;
  v_cat_brand uuid;
  v_cat_logo uuid;
  v_cat_ui uuid;
  v_cat_ux uuid;
  v_cat_video uuid;
  v_cat_content uuid;
  v_cat_copy uuid;
  v_cat_shopify uuid;
  v_cat_wordpress uuid;
  v_cat_devops uuid;
  v_cat_data uuid;
  v_cat_translation uuid;
  v_deadline_short timestamptz := now() + interval '7 days';
  v_deadline_med   timestamptz := now() + interval '14 days';
  v_deadline_long  timestamptz := now() + interval '21 days';
BEGIN
  SELECT id INTO v_cat_security    FROM categories WHERE name='Cyber Security' LIMIT 1;
  SELECT id INTO v_cat_ai          FROM categories WHERE name='AI & Machine Learning' LIMIT 1;
  SELECT id INTO v_cat_mobile      FROM categories WHERE name='Mobile App Development' LIMIT 1;
  SELECT id INTO v_cat_web         FROM categories WHERE name='Web Development' LIMIT 1;
  SELECT id INTO v_cat_frontend    FROM categories WHERE name='Frontend Development' LIMIT 1;
  SELECT id INTO v_cat_backend     FROM categories WHERE name='Backend Development' LIMIT 1;
  SELECT id INTO v_cat_seo         FROM categories WHERE name='SEO Optimization' LIMIT 1;
  SELECT id INTO v_cat_motion      FROM categories WHERE name='Motion Graphics' LIMIT 1;
  SELECT id INTO v_cat_brand       FROM categories WHERE name='Brand Identity' LIMIT 1;
  SELECT id INTO v_cat_logo        FROM categories WHERE name='Logo Design' LIMIT 1;
  SELECT id INTO v_cat_ui          FROM categories WHERE name='UI Design' LIMIT 1;
  SELECT id INTO v_cat_ux          FROM categories WHERE name='UX Design' LIMIT 1;
  SELECT id INTO v_cat_video       FROM categories WHERE name='Video Editing' LIMIT 1;
  SELECT id INTO v_cat_content     FROM categories WHERE name='Content Writing' LIMIT 1;
  SELECT id INTO v_cat_copy        FROM categories WHERE name='Copywriting' LIMIT 1;
  SELECT id INTO v_cat_shopify     FROM categories WHERE name='Shopify Development' LIMIT 1;
  SELECT id INTO v_cat_devops      FROM categories WHERE name='DevOps & Cloud' LIMIT 1;
  SELECT id INTO v_cat_data        FROM categories WHERE name='Data Science' LIMIT 1;
  SELECT id INTO v_cat_translation FROM categories WHERE name='Translation' LIMIT 1;

  INSERT INTO public.requests (user_id, category_id, title, description, size, status, deadline, credits_cost, source) VALUES

  (v_client_id, v_cat_security, 'اختبار اختراق شامل لمنصة fintech',
'مطلوب إجراء Penetration Test كامل لمنصة fintech تشبه فوري وآمن باي قبل الإطلاق التجاري.

🔗 مراجع للاطلاع:
- نموذج المنصة المرجعي: https://www.fawry.com
- نموذج تقني: https://www.aman.com.eg

📋 المتطلبات التفصيلية:
• اختبار OWASP Top 10 (Injection, Broken Auth, XSS, CSRF, IDOR...)
• فحص API endpoints (/api/v1/transactions, /api/v1/users, /api/v1/wallets)
• اختبار authentication flow كامل (JWT, refresh tokens, session)
• فحص rate limiting و brute force protection
• اختبار payment flow (Kashier integration)
• Network scanning + port enumeration
• Source code review للأجزاء الحساسة
• اختبار SQL injection على Supabase RLS policies

📦 المخرجات:
• تقرير PDF احترافي بصيغة Pentest Report
• قائمة CVE-numbered vulnerabilities مع CVSS score
• Proof of Concept لكل ثغرة
• خطة تصحيح (Remediation Plan) مرتبة حسب الأولوية
• إعادة اختبار بعد الإصلاح

⚙️ المؤهلات:
• شهادة OSCP أو CEH
• خبرة 3+ سنوات في pentesting
• معرفة بأدوات Burp Suite, Metasploit, Nmap, OWASP ZAP', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_ai, 'بناء chatbot ذكي للرد على عملاء متجر إلكتروني',
'مطلوب بناء شات بوت ذكي بالعربي واللغة العامية المصرية يخدم عملاء متجر مشابه لـ نون.

🔗 مراجع:
- نموذج المتجر: https://www.noon.com/egypt-ar
- مرجع للشات بوت: https://www.intercom.com

📋 المتطلبات:
• استخدام OpenAI GPT-4 أو Anthropic Claude
• fine-tuning على بيانات المتجر (منتجات، سياسات، أسعار)
• دعم RAG (Retrieval Augmented Generation) من قاعدة بيانات المنتجات
• ربط مع API المتجر لمعرفة حالة الطلبات
• دعم اللهجة المصرية بشكل طبيعي
• Escalation لموظف بشري عند الحاجة
• Analytics dashboard لمتابعة أداء البوت

📦 المخرجات:
• Backend API (Node.js / Python FastAPI)
• Web widget قابل للتضمين في أي موقع
• Admin panel للتحكم في responses
• Documentation كامل
• تكامل مع WhatsApp Business

⚙️ Stack مقترح: Python + LangChain + Pinecone + FastAPI + Next.js', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_mobile, 'تطبيق توصيل أكل مشابه لطلبات',
'مطلوب تطبيق موبايل (iOS + Android) لخدمة توصيل طعام في الإسكندرية.

🔗 مراجع:
- النموذج الأساسي: https://www.talabat.com/egypt
- مرجع UX: https://www.elmenus.com

📋 المتطلبات:
• تطبيق Customer (Flutter)
• تطبيق Restaurant Dashboard (Web React)
• تطبيق Driver (Flutter)
• Backend (Node.js + PostgreSQL + Redis)
• تكامل مع Google Maps + Mapbox
• Real-time order tracking (Socket.io)
• Push notifications (FCM)
• دفع إلكتروني (Kashier/Paymob/Fawry)
• نظام تقييمات وتعليقات
• كوبونات وعروض
• Multi-language (AR/EN)

📦 المخرجات:
• 3 تطبيقات جاهزة للنشر
• Backend مرفوع على AWS/Hetzner
• APK + IPA + Play Store + App Store listings
• Admin documentation', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_web, 'منصة حجز مواعيد أطباء (مشابهة لـ فيزيتا)',
'مطلوب بناء MVP لمنصة حجز مواعيد أطباء في القاهرة.

🔗 المرجع الأساسي:
- https://www.vezeeta.com
- مرجع تقني: https://www.zocdoc.com

📋 المتطلبات:
• بحث وتصفية الأطباء (تخصص، منطقة، سعر، تقييم)
• حجز موعد فوري + جدول الطبيب
• ملف صحي للمريض
• تذكير بالموعد عبر SMS + Email
• تقييمات ومراجعات
• Telemedicine (مكالمة فيديو) باستخدام Daily.co أو Twilio
• Dashboard للأطباء
• Dashboard للأدمن

📦 المخرجات:
• Next.js 14 + Supabase + Stripe
• Responsive web app
• تكامل دفع كامل
• Documentation + deployment على Vercel', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_frontend, 'لاندينج بيج لشركة SaaS مع animations احترافية',
'مطلوب لاندينج بيج modern لشركة SaaS تخدم شركات HR.

🔗 مراجع:
- https://www.linear.app
- https://www.notion.so
- https://www.framer.com

📋 المتطلبات:
• Next.js 14 + Tailwind + Framer Motion
• Hero section مع 3D illustration أو video
• Features grid مع scroll-triggered animations
• Pricing table responsive
• Testimonials carousel
• FAQ accordion
• Newsletter signup مع Mailchimp
• Dark mode toggle
• Lighthouse score 95+
• SEO optimized + sitemap

📦 المخرجات:
• كود Next.js كامل
• Design tokens system
• 5+ pages (Home, Features, Pricing, About, Contact)
• Deployment على Vercel', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_backend, 'API Gateway مع microservices architecture',
'مطلوب تصميم وبناء API Gateway لشركة logistics.

📋 المتطلبات:
• Kong Gateway أو NestJS Gateway
• 5 microservices: Auth, Orders, Tracking, Notifications, Reports
• Service-to-service communication (gRPC + RabbitMQ)
• PostgreSQL (per service) + Redis cache
• Centralized logging (ELK stack)
• Monitoring (Prometheus + Grafana)
• CI/CD pipeline (GitHub Actions → Docker → K8s)
• Rate limiting + API key management
• OpenAPI 3.0 documentation

🔗 مراجع: https://konghq.com | https://docs.nestjs.com/microservices/basics

📦 المخرجات:
• Docker Compose للتطوير المحلي
• Kubernetes manifests للإنتاج
• CI/CD pipelines
• Postman collection + OpenAPI specs
• Architecture diagram', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_seo, 'SEO Audit + استراتيجية لموقع e-commerce',
'مطلوب SEO Audit شامل + خطة 6 أشهر لمتجر إلكتروني عربي.

🔗 الموقع المرجعي للأداء المستهدف: https://www.namshi.com

📋 المتطلبات:
• Technical SEO audit (Screaming Frog + Ahrefs)
• Keyword research (1000+ keyword arabic + english)
• Competitor analysis (5 منافسين رئيسيين)
• Content gap analysis
• On-page optimization (titles, meta, schema)
• Internal linking strategy
• Backlink analysis + outreach plan
• Local SEO (Google Business Profile)
• Site speed optimization recommendations
• Mobile-first indexing audit

📦 المخرجات:
• تقرير PDF (50+ صفحة)
• خطة شهرية لـ 6 أشهر
• Tracking dashboard (Google Data Studio)
• Content calendar', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_motion, 'فيديو موشن جرافيك تعريفي لتطبيق مالي (60 ثانية)',
'مطلوب فيديو explainer animated بالعربي لتطبيق fintech.

🔗 مراجع لأسلوب الفيديو:
- https://www.revolut.com (شاهد فيديوهاتهم على YouTube)
- https://www.cashcall.app

📋 المتطلبات:
• 60 ثانية (intro 5s + middle 50s + outro 5s)
• Style: 2D character animation
• Voice over احترافي بالعربي الفصحى
• Background music + sound effects
• Subtitles (AR + EN)
• Resolution: 4K
• 3 revisions مدفوعة
• تسليم: MP4 + project file (After Effects)

📦 Storyboard أولاً ثم animation', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_brand, 'هوية بصرية كاملة لشركة عقارات فاخرة',
'مطلوب تصميم هوية بصرية متكاملة لشركة تطوير عقاري في العاصمة الإدارية.

🔗 مراجع للأسلوب:
- https://www.emaar.com
- https://www.tatweermisr.com

📋 المتطلبات:
• Logo (3 concepts → 1 final)
• Color palette + typography system
• Brand guidelines book (40+ صفحة)
• Business cards + letterhead + envelope
• Social media templates (Instagram, LinkedIn)
• Email signature
• Brochure design (A4, 20 صفحة)
• Roll-up banners (3 designs)
• Office signage mockups

📦 جميع الملفات: AI + EPS + PDF + PNG + JPG', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_ui, 'UI Design لتطبيق صحة نفسية (iOS + Android)',
'مطلوب UI design لتطبيق mental health عربي.

🔗 مراجع:
- https://www.calm.com
- https://www.headspace.com
- https://shezlong.com

📋 المتطلبات:
• 50+ شاشة (Onboarding, Home, Sessions, Therapist, Profile, Chat)
• Design system كامل (colors, typography, components, icons)
• Light + Dark mode
• Animations (Lottie files)
• Prototype interactive في Figma
• Handoff ready (Figma → Dev with specs)

📦 ملفات Figma + Style guide PDF + Lottie animations', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_video, 'مونتاج 10 فيديوهات تعليمية لـ YouTube',
'مطلوب مونتاج 10 فيديوهات تعليمية لقناة برمجة عربية.

🔗 مرجع لأسلوب المونتاج:
- https://www.youtube.com/@FreeCodeCamp
- قناة عربية مرجعية: https://www.youtube.com/@elzeroweb

📋 المتطلبات لكل فيديو:
• المدة: 15-25 دقيقة
• Color grading احترافي
• Cuts ديناميكية + B-rolls
• Lower thirds + animated titles
• Background music + sound design
• Captions ثابتة (CC) عربي
• Thumbnail design (3 خيارات)
• Intro + Outro موحد

📦 Premiere Pro projects + final MP4 (4K)', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_content, '20 مقال SEO عن الاستثمار العقاري بالعربي',
'مطلوب كتابة 20 مقال احترافي عن الاستثمار العقاري في مصر للسوق المحلي.

🔗 المنافس المرجعي: https://aqarmap.com.eg/ar/blog

📋 المتطلبات:
• كل مقال 1500-2000 كلمة
• SEO optimized (keyword research مرفق)
• H1, H2, H3 منظمة
• Meta description لكل مقال
• Internal linking suggestions
• 3-5 images suggestions لكل مقال
• Schema markup recommendations
• Tone: احترافي مبسّط للجمهور العام
• مراجعة لغوية احترافية

📦 Google Docs + Excel sheet للـ keywords', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_copy, 'Copy لـ Landing page + 30 إعلان فيسبوك',
'مطلوب كتابة copywriting احترافي لكورس أونلاين.

🔗 مراجع للأسلوب:
- https://www.copyhackers.com
- https://nas.io

📋 المتطلبات:
• Landing page copy كامل (Hero, Features, Testimonials, FAQ, CTA)
• 30 ad copy للـ Facebook/Instagram (variations: short/long, emoji/no-emoji)
• 10 Email subject lines
• 5 Email sequences (welcome, abandoned cart, promo, re-engagement, thank you)
• A/B testing variations
• Tone: convincing لكن غير spammy

📦 Google Docs + Notion document', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_shopify, 'متجر Shopify كامل لبراند ملابس نسائية',
'مطلوب بناء متجر Shopify احترافي.

🔗 مراجع:
- https://www.namshi.com
- https://www.6thstreet.com
- https://www.shein.com

📋 المتطلبات:
• Shopify Plus theme customization (Dawn أو premium theme)
• 100+ منتج مع variants (size, color)
• Mega menu navigation
• Quick view + wishlist
• Size guide popup
• Customer reviews (Loox / Judge.me)
• Email automation (Klaviyo)
• ربط بـ Instagram Shopping
• Multi-currency (EGP, USD, SAR, AED)
• Arabic + English (RTL support)
• Speed optimization (90+ score)

📦 متجر جاهز للإطلاق + Documentation + 1hr training', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_devops, 'إعداد Kubernetes cluster + CI/CD pipeline',
'مطلوب setup كامل لـ Kubernetes cluster على AWS EKS.

📋 المتطلبات:
• AWS EKS cluster setup (Terraform)
• 3 environments (dev, staging, production)
• ArgoCD للـ GitOps
• Ingress controller (NGINX)
• Cert-manager للـ SSL
• Prometheus + Grafana monitoring
• ELK stack للـ logging
• Vault للـ secrets management
• Backup strategy (Velero)
• Disaster recovery plan
• CI/CD pipelines (GitHub Actions)
• Auto-scaling policies

🔗 مراجع: https://aws.amazon.com/eks | https://argo-cd.readthedocs.io

📦 Terraform code + K8s manifests + Runbook documentation', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_data, 'تحليل بيانات وبناء dashboard لمتجر إلكتروني',
'مطلوب تحليل بيانات مبيعات سنة كاملة + بناء BI dashboard.

📋 المتطلبات:
• تحليل CSV/database (10M+ rows)
• Customer segmentation (RFM analysis)
• Cohort analysis
• Churn prediction model (Python + scikit-learn)
• Sales forecasting (Prophet أو ARIMA)
• Product affinity analysis
• Geographic heatmap
• Power BI أو Tableau dashboard
• Automated daily refresh
• Alerts على KPIs مهمة

🔗 مرجع dashboard: https://www.tableau.com/learn/articles/best-tableau-dashboard-examples

📦 Jupyter notebooks + Dashboard + PDF report + Python scripts', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_translation, 'ترجمة موقع تقني (15,000 كلمة) من EN إلى AR',
'مطلوب ترجمة موقع شركة SaaS تقنية بالكامل.

🔗 الموقع للترجمة (مثال): https://www.notion.so

📋 المتطلبات:
• 15,000 كلمة (Marketing pages + Help docs + Blog)
• ترجمة احترافية (لا machine translation)
• Localization للسوق المصري والخليجي
• الحفاظ على المصطلحات التقنية
• تنسيق RTL مراعى
• Glossary موحد للمصطلحات
• Proofreading من مترجم آخر

📦 Google Docs منظمة بالـ pages + Glossary Excel', 'medium', 'submitted', v_deadline_med, 5, 'managed'),

  (v_client_id, v_cat_logo, 'لوجو + بطاقات شخصية لطبيب أسنان',
'مطلوب تصميم لوجو احترافي لعيادة أسنان جديدة.

🔗 مراجع للأسلوب:
- https://www.dentaldesignsmiami.com
- https://www.smileinternational.com

📋 المتطلبات:
• 3 concepts للوجو
• 2 revisions لكل concept
• Final logo: AI + EPS + PNG (transparent) + PDF
• Color variations (full color, mono, white)
• Brand guidelines mini (10 صفحات)
• Business cards (single + double sided)
• Letterhead + Envelope
• Social media profile pictures (FB, IG, LinkedIn)

📦 جميع الملفات في Google Drive منظمة', 'small', 'submitted', v_deadline_short, 3, 'managed'),

  (v_client_id, v_cat_ux, 'UX research + redesign لتطبيق بنكي',
'مطلوب UX research شامل + إعادة تصميم لتطبيق mobile banking عربي.

🔗 مراجع للمستوى المستهدف:
- https://www.revolut.com
- https://www.monzo.com
- https://nbe.com.eg (التطبيق الحالي للمراجعة)

📋 المتطلبات:
• User interviews (10 مستخدمين)
• Usability testing على التطبيق الحالي
• Personas (3-5 personas)
• User journey maps
• Information architecture
• Wireframes (low + high fidelity)
• Prototype interactive
• Usability testing على الـ prototype
• Accessibility audit (WCAG 2.1 AA)
• Final UI design (50+ screens)

📦 Figma + Research report PDF + Video recordings للـ usability tests', 'large', 'submitted', v_deadline_long, 10, 'managed'),

  (v_client_id, v_cat_web, 'موقع portfolio لمصور احترافي',
'مطلوب موقع portfolio أنيق ومميز لمصور fashion.

🔗 مراجع للأسلوب:
- https://www.annieleibovitz.com
- https://www.peterlindbergh.com
- https://format.com (platform مرجع)

📋 المتطلبات:
• Next.js 14 + Sanity CMS
• Image optimization (Next/Image + Cloudinary)
• Lazy loading + smooth animations (Framer Motion)
• Lightbox للصور
• Categorization (Editorial, Commercial, Personal)
• Contact form مع reCAPTCHA
• Blog section
• SEO optimized
• Multi-language (AR/EN)
• Lighthouse 95+

📦 موقع منشور على Vercel + CMS access + Documentation', 'medium', 'submitted', v_deadline_med, 5, 'managed');
END $$;

-- =====================================================================
-- PART 3: Insert 15 fresh advanced training tasks
-- =====================================================================
DO $$
DECLARE
  v_cat_security uuid;
  v_cat_ai uuid;
  v_cat_mobile uuid;
  v_cat_web uuid;
  v_cat_frontend uuid;
  v_cat_backend uuid;
  v_cat_seo uuid;
  v_cat_motion uuid;
  v_cat_brand uuid;
  v_cat_ui uuid;
  v_cat_ux uuid;
  v_cat_video uuid;
  v_cat_content uuid;
  v_cat_devops uuid;
  v_cat_data uuid;
BEGIN
  SELECT id INTO v_cat_security    FROM categories WHERE name='Cyber Security' LIMIT 1;
  SELECT id INTO v_cat_ai          FROM categories WHERE name='AI & Machine Learning' LIMIT 1;
  SELECT id INTO v_cat_mobile      FROM categories WHERE name='Mobile App Development' LIMIT 1;
  SELECT id INTO v_cat_web         FROM categories WHERE name='Web Development' LIMIT 1;
  SELECT id INTO v_cat_frontend    FROM categories WHERE name='Frontend Development' LIMIT 1;
  SELECT id INTO v_cat_backend     FROM categories WHERE name='Backend Development' LIMIT 1;
  SELECT id INTO v_cat_seo         FROM categories WHERE name='SEO Optimization' LIMIT 1;
  SELECT id INTO v_cat_motion      FROM categories WHERE name='Motion Graphics' LIMIT 1;
  SELECT id INTO v_cat_brand       FROM categories WHERE name='Brand Identity' LIMIT 1;
  SELECT id INTO v_cat_ui          FROM categories WHERE name='UI Design' LIMIT 1;
  SELECT id INTO v_cat_ux          FROM categories WHERE name='UX Design' LIMIT 1;
  SELECT id INTO v_cat_video       FROM categories WHERE name='Video Editing' LIMIT 1;
  SELECT id INTO v_cat_content     FROM categories WHERE name='Content Writing' LIMIT 1;
  SELECT id INTO v_cat_devops      FROM categories WHERE name='DevOps & Cloud' LIMIT 1;
  SELECT id INTO v_cat_data        FROM categories WHERE name='Data Science' LIMIT 1;

  INSERT INTO public.training_tasks
    (title, description, requirements, category_id, difficulty, credits_reward, stars_reward, deadline_hours, is_active, audience, is_category_specific, submission_method)
  VALUES
  ('Security Audit لموقع OWASP Juice Shop',
   'قم بإجراء security audit شامل على https://juice-shop.herokuapp.com واكتب تقرير مفصل بالثغرات اللي اكتشفتها.',
   'استخدام Burp Suite Community + OWASP ZAP. التقرير لازم يحتوي على 5 ثغرات على الأقل مع PoC وخطة تصحيح.',
   v_cat_security, 'hard', 5, 3, 72, true, 'freelancers', true, 'gdrive'),

  ('بناء AI chatbot بسيط بـ OpenAI API',
   'ابني chatbot بسيط بالعربي يجاوب على أسئلة عن منتجات متجر إلكتروني وهمي.',
   'استخدام OpenAI GPT-4 + Node.js/Python. تسليم: كود + فيديو demo (2-3 دقائق) + Postman collection.',
   v_cat_ai, 'medium', 4, 2, 48, true, 'freelancers', true, 'gdrive'),

  ('تطبيق Flutter بسيط: Todo List مع Supabase',
   'ابني Todo app بـ Flutter مع authentication + CRUD operations عبر Supabase.',
   'Auth (email/password) + Add/Edit/Delete tasks + Realtime sync + Dark mode. تسليم: GitHub link + APK.',
   v_cat_mobile, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('نسخة من landing page Linear.app',
   'اعمل clone للـ landing page الخاصة بـ https://linear.app باستخدام Next.js + Tailwind + Framer Motion.',
   'Pixel-perfect copy + animations + responsive + dark mode default. تسليم: GitHub + Vercel deployment.',
   v_cat_frontend, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('REST API لنظام مكتبة بـ Node.js + PostgreSQL',
   'ابني REST API كامل لإدارة مكتبة (books, members, borrowing).',
   'JWT auth + role-based access (admin/member) + pagination + Swagger docs + Docker compose. تسليم: GitHub + Postman collection.',
   v_cat_backend, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('Performance audit لموقع تجاري',
   'اعمل performance audit شامل لـ https://www.amazon.eg باستخدام Lighthouse + WebPageTest.',
   'تقرير PDF بالنتائج + 10 توصيات تحسين مفصلة مع expected impact. مدعوم بـ screenshots.',
   v_cat_web, 'easy', 3, 2, 48, true, 'freelancers', true, 'gdrive'),

  ('SEO Audit لموقع متجر إلكتروني صغير',
   'اختار متجر صغير على Shopify (مش معروف) واعمل له SEO audit كامل.',
   'استخدام Ahrefs/SEMrush trial + Screaming Frog. تسليم: PDF report (15+ صفحة) + خطة تنفيذية لـ 3 شهور.',
   v_cat_seo, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('فيديو موشن جرافيك 30 ثانية لتطبيق وهمي',
   'صمّم فيديو explainer 30 ثانية لتطبيق fitness وهمي.',
   '2D animation + voice over (يمكن استخدام AI voice) + background music + subtitles. تسليم: MP4 (1080p) + project file.',
   v_cat_motion, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('Brand identity مصغّر لمقهى وهمي',
   'اعمل هوية بصرية كاملة لمقهى متخصص في القهوة المختصة.',
   'Logo + color palette + typography + business card + menu mockup + Instagram template (3 posts). PDF + AI files.',
   v_cat_brand, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('UI redesign لتطبيق موجود (challenge)',
   'اختار تطبيق مصري معروف وقدّم UI redesign مقترح لـ 5 شاشات رئيسية.',
   'Figma file + before/after comparison + design rationale (1 صفحة). Prototype interactive مفضل.',
   v_cat_ui, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('UX case study (Behance-style)',
   'اعمل UX case study شامل لمشروع وهمي أو حقيقي ونشره بأسلوب Behance.',
   'Problem statement + research + personas + wireframes + final design + reflection. PDF + Behance link.',
   v_cat_ux, 'hard', 5, 3, 96, true, 'freelancers', true, 'gdrive'),

  ('مونتاج فيديو YouTube تعليمي 5 دقائق',
   'اختار موضوع تعليمي بسيط وقدّم فيديو 5 دقائق منتج باحترافية.',
   'Cuts + lower thirds + B-rolls + music + thumbnail. تسليم: MP4 (1080p) + thumbnail PNG.',
   v_cat_video, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('5 مقالات SEO بالعربي عن topic من اختيارك',
   'اكتب 5 مقالات SEO عن مجال تخصصك (1500 كلمة لكل مقال).',
   'Keyword research + meta description + H tags منظمة + internal linking suggestions. Google Docs.',
   v_cat_content, 'medium', 4, 2, 72, true, 'freelancers', true, 'gdrive'),

  ('Dockerize تطبيق Node.js + PostgreSQL',
   'دوكر تطبيق Node.js مع database PostgreSQL باستخدام docker-compose.',
   'Dockerfile محسّن (multi-stage build) + docker-compose.yml + .env.example + README. GitHub link.',
   v_cat_devops, 'easy', 3, 2, 48, true, 'freelancers', true, 'gdrive'),

  ('تحليل dataset عام (Kaggle)',
   'اختار dataset من Kaggle ونفّذ EDA + visualization + insights كاملة.',
   'Jupyter notebook + 5 visualizations على الأقل + 5 insights مكتوبة. تسليم: notebook + PDF.',
   v_cat_data, 'medium', 4, 2, 96, true, 'freelancers', true, 'gdrive');
END $$;
