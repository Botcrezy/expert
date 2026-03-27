export interface BlockSettings {
  backgroundColor?: string;
  textColor?: string;
  titleColor?: string;
  padding?: string;
  paddingX?: string;
  alignment?: "left" | "center" | "right";
  fullWidth?: boolean;
  bgType?: "none" | "color" | "gradient" | "image";
  bgColor?: string;
  bgGradient?: string;
  bgImage?: string;
  maxWidth?: string;
  border?: string;
  shadow?: string;
  animation?: string;
}

export interface BaseBlock {
  id: string;
  type: string;
  settings: BlockSettings;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
  data: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
    backgroundImage?: string;
    showStats?: boolean;
    stats?: { value: string; label: string }[];
    style?: "default" | "gradient" | "image" | "split" | "minimal";
  };
}

export interface FeaturesBlock extends BaseBlock {
  type: "features";
  data: {
    title: string;
    subtitle: string;
    features: {
      icon: string;
      title: string;
      description: string;
      color?: string;
    }[];
    columns: 2 | 3 | 4;
    style?: "cards" | "icons" | "list" | "grid";
  };
}

export interface ServicesBlock extends BaseBlock {
  type: "services";
  data: {
    title: string;
    subtitle: string;
    showFromDatabase: boolean;
    customServices?: {
      icon: string;
      name: string;
      description: string;
      price?: string;
    }[];
    style?: "cards" | "list" | "grid";
  };
}

export interface TestimonialsBlock extends BaseBlock {
  type: "testimonials";
  data: {
    title: string;
    subtitle: string;
    showFromDatabase: boolean;
    customTestimonials?: {
      name: string;
      role: string;
      content: string;
      avatar?: string;
      rating: number;
    }[];
    style?: "cards" | "carousel" | "quotes";
  };
}

export interface PricingBlock extends BaseBlock {
  type: "pricing";
  data: {
    title: string;
    subtitle: string;
    showFromDatabase: boolean;
    style?: "cards" | "table" | "minimal";
  };
}

export interface CTABlock extends BaseBlock {
  type: "cta";
  data: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    style: "primary" | "gradient" | "dark" | "outlined" | "banner";
  };
}

export interface FAQBlock extends BaseBlock {
  type: "faq";
  data: {
    title: string;
    subtitle: string;
    faqs: {
      question: string;
      answer: string;
    }[];
    style?: "accordion" | "list" | "cards";
  };
}

export interface StepsBlock extends BaseBlock {
  type: "steps";
  data: {
    title: string;
    subtitle: string;
    steps: {
      number: string;
      icon: string;
      title: string;
      description: string;
    }[];
    style?: "horizontal" | "vertical" | "timeline";
  };
}

export interface TextBlock extends BaseBlock {
  type: "text";
  data: {
    content: string;
    htmlContent?: string;
  };
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  data: {
    src: string;
    alt: string;
    caption?: string;
    width?: string;
    rounded?: boolean;
  };
}

export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  data: {
    height: number;
  };
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  data: {
    style: "solid" | "dashed" | "dotted";
  };
}

// New Advanced Blocks
export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  data: {
    title: string;
    images: { src: string; alt: string; caption?: string }[];
    columns: 2 | 3 | 4;
    style?: "grid" | "masonry" | "carousel";
  };
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  data: {
    url: string;
    title?: string;
    autoplay?: boolean;
    muted?: boolean;
  };
}

export interface CounterBlock extends BaseBlock {
  type: "counter";
  data: {
    title: string;
    counters: {
      value: number;
      suffix?: string;
      label: string;
      icon?: string;
    }[];
  };
}

export interface TeamBlock extends BaseBlock {
  type: "team";
  data: {
    title: string;
    subtitle: string;
    members: {
      name: string;
      role: string;
      image?: string;
      social?: { platform: string; url: string }[];
    }[];
  };
}

export interface LogosBlock extends BaseBlock {
  type: "logos";
  data: {
    title?: string;
    logos: { src: string; alt: string; url?: string }[];
    style?: "grid" | "carousel" | "marquee";
  };
}

export interface ContactBlock extends BaseBlock {
  type: "contact";
  data: {
    title: string;
    subtitle: string;
    showMap?: boolean;
    mapUrl?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface NewsletterBlock extends BaseBlock {
  type: "newsletter";
  data: {
    title: string;
    subtitle: string;
    buttonText: string;
    placeholder?: string;
    style?: "inline" | "stacked" | "banner";
  };
}

export interface BannerBlock extends BaseBlock {
  type: "banner";
  data: {
    text: string;
    buttonText?: string;
    buttonLink?: string;
    dismissible?: boolean;
    style?: "info" | "success" | "warning" | "promo";
  };
}

export interface CardsBlock extends BaseBlock {
  type: "cards";
  data: {
    title: string;
    subtitle?: string;
    cards: {
      title: string;
      description: string;
      image?: string;
      link?: string;
      badge?: string;
    }[];
    columns: 2 | 3 | 4;
  };
}

export interface AccordionBlock extends BaseBlock {
  type: "accordion";
  data: {
    title: string;
    items: {
      title: string;
      content: string;
    }[];
    allowMultiple?: boolean;
  };
}

export interface TabsBlock extends BaseBlock {
  type: "tabs";
  data: {
    tabs: {
      title: string;
      content: string;
      icon?: string;
    }[];
  };
}

export interface TimelineBlock extends BaseBlock {
  type: "timeline";
  data: {
    title: string;
    events: {
      date: string;
      title: string;
      description: string;
      icon?: string;
    }[];
  };
}

export interface MapBlock extends BaseBlock {
  type: "map";
  data: {
    embedUrl: string;
    height: number;
  };
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  data: {
    quote: string;
    author: string;
    role?: string;
    style?: "simple" | "boxed" | "highlight";
  };
}

export interface AlertBlock extends BaseBlock {
  type: "alert";
  data: {
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    dismissible?: boolean;
  };
}

export interface SocialBlock extends BaseBlock {
  type: "social";
  data: {
    title?: string;
    links: {
      platform: string;
      url: string;
    }[];
    style?: "icons" | "buttons" | "filled";
  };
}

export interface ComparisonBlock extends BaseBlock {
  type: "comparison";
  data: {
    title: string;
    items: {
      feature: string;
      option1: boolean | string;
      option2: boolean | string;
    }[];
    option1Label: string;
    option2Label: string;
  };
}

export interface ProgressBlock extends BaseBlock {
  type: "progress";
  data: {
    title: string;
    items: {
      label: string;
      value: number;
      color?: string;
    }[];
  };
}

export interface IconBoxBlock extends BaseBlock {
  type: "iconbox";
  data: {
    title: string;
    subtitle?: string;
    boxes: {
      icon: string;
      title: string;
      description: string;
      link?: string;
      color?: string;
    }[];
    columns: 2 | 3 | 4;
    style?: "default" | "bordered" | "shadowed";
  };
}

export interface HeroVideoBlock extends BaseBlock {
  type: "herovideo";
  data: {
    title: string;
    subtitle: string;
    videoUrl: string;
    ctaText?: string;
    ctaLink?: string;
    overlayOpacity?: number;
  };
}

export interface SplitContentBlock extends BaseBlock {
  type: "splitcontent";
  data: {
    title: string;
    content: string;
    image: string;
    imagePosition: "left" | "right";
    ctaText?: string;
    ctaLink?: string;
  };
}

export interface FeatureListBlock extends BaseBlock {
  type: "featurelist";
  data: {
    title: string;
    subtitle?: string;
    features: {
      icon: string;
      title: string;
      description: string;
    }[];
    showCheckmarks?: boolean;
  };
}

export interface CodeBlock extends BaseBlock {
  type: "code";
  data: {
    code: string;
    language: string;
    showLineNumbers?: boolean;
  };
}

export interface TableBlock extends BaseBlock {
  type: "table";
  data: {
    headers: string[];
    rows: string[][];
    striped?: boolean;
    hoverable?: boolean;
  };
}

export interface FormBlock extends BaseBlock {
  type: "form";
  data: {
    title: string;
    fields: {
      type: "text" | "email" | "textarea" | "select";
      label: string;
      placeholder?: string;
      required?: boolean;
      options?: string[];
    }[];
    submitText: string;
    successMessage?: string;
  };
}

export interface CtaButtonsBlock extends BaseBlock {
  type: "ctabuttons";
  data: {
    buttons: {
      text: string;
      link: string;
      variant: "primary" | "secondary" | "outline" | "ghost";
      icon?: string;
    }[];
    alignment: "left" | "center" | "right";
  };
}

export interface PricingTableBlock extends BaseBlock {
  type: "pricingtable";
  data: {
    title: string;
    subtitle?: string;
    plans: {
      name: string;
      price: string;
      period?: string;
      features: string[];
      ctaText: string;
      ctaLink: string;
      popular?: boolean;
      color?: string;
    }[];
  };
}

export interface TrustBarBlock extends BaseBlock {
  type: "trustbar";
  data: {
    title?: string;
    logos: { src: string; alt: string; url?: string }[];
    highlights?: { icon?: "sparkles" | "shield" | "check"; label: string }[];
  };
}

export interface ServiceCategoriesBlock extends BaseBlock {
  type: "service_categories";
  data: {
    title: string;
    subtitle?: string;
    showFromDatabase: boolean;
    customItems?: { name: string; name_ar?: string; description?: string; url?: string }[];
  };
}

export interface TestimonialsCarouselBlock extends BaseBlock {
  type: "testimonials_carousel";
  data: {
    title: string;
    subtitle?: string;
    showFromDatabase: boolean;
    customTestimonials?: { name: string; role?: string; content: string; rating?: number }[];
  };
}

export interface PricingCompareBlock extends BaseBlock {
  type: "pricing_compare";
  data: {
    title: string;
    subtitle?: string;
    highlightedIndex?: number;
    plans: {
      name: string;
      price: string;
      period?: string;
      features: string[];
      ctaText: string;
      ctaLink: string;
    }[];
  };
}

export interface FAQProBlock extends BaseBlock {
  type: "faq_pro";
  data: {
    title: string;
    subtitle?: string;
    enableSearch?: boolean;
    faqs: { question: string; answer: string; category?: string }[];
  };
}

export interface BreadcrumbBlock extends BaseBlock {
  type: "breadcrumb";
  data: {
    items: { label: string; link?: string }[];
  };
}

export interface CountdownBlock extends BaseBlock {
  type: "countdown";
  data: {
    title: string;
    targetDate: string;
    style?: "cards" | "inline" | "minimal";
  };
}

export type PageBlock = 
  | HeroBlock 
  | FeaturesBlock 
  | ServicesBlock 
  | TestimonialsBlock 
  | PricingBlock 
  | CTABlock 
  | FAQBlock 
  | StepsBlock 
  | TextBlock 
  | ImageBlock 
  | SpacerBlock 
  | DividerBlock
  | GalleryBlock
  | VideoBlock
  | CounterBlock
  | TeamBlock
  | LogosBlock
  | ContactBlock
  | NewsletterBlock
  | BannerBlock
  | CardsBlock
  | AccordionBlock
  | TabsBlock
  | TimelineBlock
  | MapBlock
  | QuoteBlock
  | AlertBlock
  | SocialBlock
  | ComparisonBlock
  | ProgressBlock
  | IconBoxBlock
  | HeroVideoBlock
  | SplitContentBlock
  | FeatureListBlock
  | CodeBlock
  | TableBlock
  | FormBlock
  | CtaButtonsBlock
  | PricingTableBlock
  | TrustBarBlock
  | ServiceCategoriesBlock
  | TestimonialsCarouselBlock
  | PricingCompareBlock
  | FAQProBlock
  | BreadcrumbBlock
  | CountdownBlock;

export const BLOCK_TYPES = [
  // Layout & Hero
  { type: "hero", label: "قسم البطل", icon: "Layout", description: "عنوان رئيسي مع CTA", category: "layout" },
  { type: "herovideo", label: "هيرو فيديو", icon: "Video", description: "خلفية فيديو", category: "layout" },
  { type: "splitcontent", label: "محتوى مقسم", icon: "Columns", description: "صورة ونص", category: "layout" },
  { type: "banner", label: "بانر", icon: "Flag", description: "شريط إعلاني", category: "layout" },
  
  // Content
  { type: "text", label: "نص", icon: "Type", description: "محتوى نصي", category: "content" },
  { type: "image", label: "صورة", icon: "Image", description: "صورة مع تعليق", category: "content" },
  { type: "video", label: "فيديو", icon: "PlayCircle", description: "فيديو مضمن", category: "content" },
  { type: "gallery", label: "معرض صور", icon: "Images", description: "شبكة صور", category: "content" },
  { type: "quote", label: "اقتباس", icon: "Quote", description: "اقتباس مميز", category: "content" },
  { type: "code", label: "كود", icon: "Code", description: "عرض كود", category: "content" },
  { type: "table", label: "جدول", icon: "Table", description: "جدول بيانات", category: "content" },
  
  // Features & Lists
  { type: "features", label: "المميزات", icon: "Sparkles", description: "شبكة مميزات", category: "features" },
  { type: "featurelist", label: "قائمة مميزات", icon: "ListChecks", description: "قائمة عمودية", category: "features" },
  { type: "iconbox", label: "صناديق أيقونات", icon: "BoxSelect", description: "أيقونات مع نص", category: "features" },
  { type: "cards", label: "بطاقات", icon: "LayoutGrid", description: "شبكة بطاقات", category: "features" },
  { type: "comparison", label: "مقارنة", icon: "GitCompare", description: "جدول مقارنة", category: "features" },
  { type: "progress", label: "تقدم", icon: "BarChart2", description: "أشرطة تقدم", category: "features" },
  
  // Services & Business
  { type: "services", label: "الخدمات", icon: "Briefcase", description: "عرض الخدمات", category: "business" },
  { type: "service_categories", label: "تصنيفات الخدمات (Pro)", icon: "LayoutGrid", description: "شبكة تصنيفات قوية", category: "business" },
  { type: "pricing", label: "الأسعار", icon: "CreditCard", description: "جدول الأسعار", category: "business" },
  { type: "pricingtable", label: "باقات مخصصة", icon: "DollarSign", description: "باقات تفصيلية", category: "business" },
  { type: "pricing_compare", label: "مقارنة الأسعار (Pro)", icon: "GitCompare", description: "كروت مقارنة قوية", category: "business" },
  { type: "team", label: "الفريق", icon: "Users", description: "أعضاء الفريق", category: "business" },
  { type: "logos", label: "شعارات العملاء", icon: "Building", description: "شعارات الشركاء", category: "business" },
  { type: "trustbar", label: "شريط الثقة (Pro)", icon: "Shield", description: "شعارات + ضمانات", category: "business" },
  { type: "counter", label: "عدادات", icon: "Hash", description: "أرقام وإحصائيات", category: "business" },
  
  // Social Proof
  { type: "testimonials", label: "آراء العملاء", icon: "MessageSquare", description: "شهادات العملاء", category: "social" },
  { type: "testimonials_carousel", label: "آراء العملاء (Carousel)", icon: "Quote", description: "سلايدر آراء Premium", category: "social" },
  { type: "social", label: "روابط اجتماعية", icon: "Share2", description: "أيقونات التواصل", category: "social" },
  
  // Actions & Forms
  { type: "cta", label: "دعوة للعمل", icon: "MousePointer", description: "زر CTA", category: "actions" },
  { type: "ctabuttons", label: "مجموعة أزرار", icon: "ToggleLeft", description: "أزرار متعددة", category: "actions" },
  { type: "newsletter", label: "نشرة بريدية", icon: "Mail", description: "اشتراك بريد", category: "actions" },
  { type: "contact", label: "تواصل معنا", icon: "Phone", description: "معلومات التواصل", category: "actions" },
  { type: "form", label: "نموذج", icon: "FileInput", description: "نموذج مخصص", category: "actions" },
  
  // Information
  { type: "faq", label: "أسئلة شائعة", icon: "HelpCircle", description: "أكورديون FAQ", category: "info" },
  { type: "faq_pro", label: "أسئلة شائعة (Pro)", icon: "Search", description: "FAQ مع بحث وتصنيفات", category: "info" },
  { type: "accordion", label: "أكورديون", icon: "ChevronDown", description: "قوائم قابلة للطي", category: "info" },
  { type: "tabs", label: "تبويبات", icon: "Layers", description: "محتوى بتبويبات", category: "info" },
  { type: "steps", label: "الخطوات", icon: "ListOrdered", description: "خطوات مرقمة", category: "info" },
  { type: "timeline", label: "خط زمني", icon: "Clock", description: "أحداث زمنية", category: "info" },
  { type: "alert", label: "تنبيه", icon: "AlertCircle", description: "رسالة تنبيه", category: "info" },
  { type: "breadcrumb", label: "مسار التنقل", icon: "ChevronRight", description: "breadcrumb", category: "info" },
  
  // Media & Embeds
  { type: "map", label: "خريطة", icon: "MapPin", description: "خريطة مضمنة", category: "media" },
  { type: "countdown", label: "عد تنازلي", icon: "Timer", description: "مؤقت", category: "media" },
  
  // Structure
  { type: "spacer", label: "مساحة فارغة", icon: "Minus", description: "تباعد", category: "structure" },
  { type: "divider", label: "فاصل", icon: "Divide", description: "خط فاصل", category: "structure" },
] as const;

export function createDefaultBlock(type: string): PageBlock {
  const baseSettings: BlockSettings = {
    padding: "py-16",
    alignment: "center",
    fullWidth: true,
  };

  switch (type) {
    case "hero":
      return {
        id: crypto.randomUUID(),
        type: "hero",
        settings: baseSettings,
        data: {
          title: "عنوان رئيسي جذاب",
          subtitle: "وصف مختصر يشرح قيمة خدماتك",
          ctaText: "ابدأ الآن",
          ctaLink: "/register",
          secondaryCtaText: "تعرف علينا",
          secondaryCtaLink: "/how-it-works",
          showStats: true,
          stats: [
            { value: "+5000", label: "مشروع مكتمل" },
            { value: "4.9", label: "تقييم العملاء" },
            { value: "24 ساعة", label: "متوسط التسليم" },
          ],
          style: "default",
        },
      };
    case "features":
      return {
        id: crypto.randomUUID(),
        type: "features",
        settings: baseSettings,
        data: {
          title: "لماذا تختارنا؟",
          subtitle: "مميزات تجعلنا الخيار الأفضل",
          columns: 4,
          features: [
            { icon: "Sparkles", title: "جودة مضمونة", description: "مراجعة دقيقة لكل عمل", color: "from-blue-500 to-cyan-500" },
            { icon: "Shield", title: "أمان تام", description: "حماية بياناتك أولوية", color: "from-emerald-500 to-teal-500" },
            { icon: "Clock", title: "سرعة التسليم", description: "التزام بالمواعيد", color: "from-orange-500 to-amber-500" },
            { icon: "Users", title: "فريق محترف", description: "خبراء في مجالاتهم", color: "from-purple-500 to-pink-500" },
          ],
        },
      };
    case "services":
      return {
        id: crypto.randomUUID(),
        type: "services",
        settings: baseSettings,
        data: {
          title: "خدماتنا",
          subtitle: "نقدم مجموعة واسعة من الخدمات",
          showFromDatabase: true,
        },
      };
    case "testimonials":
      return {
        id: crypto.randomUUID(),
        type: "testimonials",
        settings: baseSettings,
        data: {
          title: "آراء عملائنا",
          subtitle: "ماذا يقول عملاؤنا عنا",
          showFromDatabase: true,
        },
      };
    case "pricing":
      return {
        id: crypto.randomUUID(),
        type: "pricing",
        settings: baseSettings,
        data: {
          title: "الأسعار والباقات",
          subtitle: "اختر الباقة المناسبة لك",
          showFromDatabase: true,
        },
      };
    case "cta":
      return {
        id: crypto.randomUUID(),
        type: "cta",
        settings: { ...baseSettings, padding: "py-20" },
        data: {
          title: "جاهز تبدأ مشروعك؟",
          subtitle: "سجل الآن واحصل على أول مهمة مجانية",
          buttonText: "ابدأ مجاناً",
          buttonLink: "/register",
          style: "primary",
        },
      };
    case "faq":
      return {
        id: crypto.randomUUID(),
        type: "faq",
        settings: baseSettings,
        data: {
          title: "أسئلة شائعة",
          subtitle: "إجابات على أكثر الأسئلة شيوعاً",
          faqs: [
            { question: "ما هي خدماتكم؟", answer: "نقدم خدمات متنوعة في التصميم والبرمجة والتسويق" },
            { question: "كيف يمكنني البدء؟", answer: "سجل حساب مجاني وابدأ بطلب خدمتك الأولى" },
          ],
        },
      };
    case "steps":
      return {
        id: crypto.randomUUID(),
        type: "steps",
        settings: baseSettings,
        data: {
          title: "كيف نعمل؟",
          subtitle: "خطوات بسيطة للحصول على خدمتك",
          steps: [
            { number: "01", icon: "Send", title: "أرسل طلبك", description: "اشرح ما تحتاجه" },
            { number: "02", icon: "UserCheck", title: "نختار الخبير", description: "نختار أفضل خبير" },
            { number: "03", icon: "CheckCircle", title: "استلم جاهز", description: "تستلم شغلك" },
          ],
        },
      };
    case "text":
      return {
        id: crypto.randomUUID(),
        type: "text",
        settings: { ...baseSettings, alignment: "right" },
        data: {
          content: "أضف نصك هنا...",
        },
      };
    case "image":
      return {
        id: crypto.randomUUID(),
        type: "image",
        settings: baseSettings,
        data: {
          src: "",
          alt: "صورة",
          caption: "",
        },
      };
    case "spacer":
      return {
        id: crypto.randomUUID(),
        type: "spacer",
        settings: {},
        data: {
          height: 48,
        },
      };
    case "divider":
      return {
        id: crypto.randomUUID(),
        type: "divider",
        settings: {},
        data: {
          style: "solid",
        },
      };
    case "gallery":
      return {
        id: crypto.randomUUID(),
        type: "gallery",
        settings: baseSettings,
        data: {
          title: "معرض الصور",
          images: [],
          columns: 3,
        },
      };
    case "video":
      return {
        id: crypto.randomUUID(),
        type: "video",
        settings: baseSettings,
        data: {
          url: "",
          title: "فيديو",
        },
      };
    case "counter":
      return {
        id: crypto.randomUUID(),
        type: "counter",
        settings: baseSettings,
        data: {
          title: "إحصائياتنا",
          counters: [
            { value: 5000, suffix: "+", label: "عميل سعيد", icon: "Users" },
            { value: 10000, suffix: "+", label: "مشروع مكتمل", icon: "CheckCircle" },
            { value: 99, suffix: "%", label: "رضا العملاء", icon: "Star" },
            { value: 24, suffix: "/7", label: "دعم فني", icon: "Headphones" },
          ],
        },
      };
    case "team":
      return {
        id: crypto.randomUUID(),
        type: "team",
        settings: baseSettings,
        data: {
          title: "فريقنا",
          subtitle: "خبراء متميزون في خدمتك",
          members: [],
        },
      };
    case "logos":
      return {
        id: crypto.randomUUID(),
        type: "logos",
        settings: baseSettings,
        data: {
          title: "عملاؤنا",
          logos: [],
        },
      };
    case "trustbar":
      return {
        id: crypto.randomUUID(),
        type: "trustbar",
        settings: { ...baseSettings, padding: "py-12" },
        data: {
          title: "موثوق من مئات العلامات التجارية",
          logos: [
            { src: "https://placehold.co/180x60?text=Logo+1", alt: "Logo 1" },
            { src: "https://placehold.co/180x60?text=Logo+2", alt: "Logo 2" },
            { src: "https://placehold.co/180x60?text=Logo+3", alt: "Logo 3" },
            { src: "https://placehold.co/180x60?text=Logo+4", alt: "Logo 4" },
          ],
          highlights: [
            { icon: "check", label: "مراجعة جودة" },
            { icon: "shield", label: "حماية بيانات" },
            { icon: "sparkles", label: "نتائج احترافية" },
          ],
        },
      };
    case "service_categories":
      return {
        id: crypto.randomUUID(),
        type: "service_categories",
        settings: baseSettings,
        data: {
          title: "اختر مجال الخدمة",
          subtitle: "تصنيفات منظمة تساعدك تبدأ بسرعة",
          showFromDatabase: true,
          customItems: [
            { name: "Design", name_ar: "تصميم", description: "هوية، سوشيال، واجهات" },
            { name: "Development", name_ar: "تطوير", description: "ويب، تطبيقات، تكاملات" },
            { name: "Marketing", name_ar: "تسويق", description: "حملات، محتوى، SEO" },
          ],
        },
      };
    case "testimonials_carousel":
      return {
        id: crypto.randomUUID(),
        type: "testimonials_carousel",
        settings: baseSettings,
        data: {
          title: "ماذا يقول عملاؤنا؟",
          subtitle: "شهادات حقيقية من عملائنا",
          showFromDatabase: true,
          customTestimonials: [
            { name: "أحمد", role: "Founder", content: "تجربة ممتازة وسرعة في التسليم.", rating: 5 },
            { name: "سارة", role: "Marketing", content: "جودة عالية وتواصل رائع.", rating: 5 },
          ],
        },
      };
    case "pricing_compare":
      return {
        id: crypto.randomUUID(),
        type: "pricing_compare",
        settings: baseSettings,
        data: {
          title: "اختر خطتك",
          subtitle: "خطط واضحة، قيمة حقيقية",
          highlightedIndex: 1,
          plans: [
            {
              name: "أساسية",
              price: "99",
              period: "شهر",
              features: ["5 طلبات", "دعم بريدي", "تسليم قياسي"],
              ctaText: "ابدأ",
              ctaLink: "/register",
            },
            {
              name: "احترافية",
              price: "199",
              period: "شهر",
              features: ["طلبات أكثر", "دعم أولوية", "تسليم أسرع"],
              ctaText: "جرّب الآن",
              ctaLink: "/register",
            },
            {
              name: "أعمال",
              price: "399",
              period: "شهر",
              features: ["مخصص للشركات", "مدير حساب", "تقارير"],
              ctaText: "تواصل معنا",
              ctaLink: "/contact",
            },
          ],
        },
      };
    case "faq_pro":
      return {
        id: crypto.randomUUID(),
        type: "faq_pro",
        settings: baseSettings,
        data: {
          title: "أسئلة شائعة",
          subtitle: "إجابات سريعة وواضحة",
          enableSearch: true,
          faqs: [
            { category: "الدفع", question: "كيف يتم الدفع؟", answer: "يمكنك الدفع عبر وسائل متعددة داخل المنصة." },
            { category: "التسليم", question: "متى أستلم؟", answer: "مدة التسليم تختلف حسب نوع الخدمة وحجم العمل." },
          ],
        },
      };
    case "contact":
      return {
        id: crypto.randomUUID(),
        type: "contact",
        settings: baseSettings,
        data: {
          title: "تواصل معنا",
          subtitle: "نحن هنا لمساعدتك",
          email: "info@example.com",
          phone: "+966 555 123 456",
          address: "الرياض، المملكة العربية السعودية",
        },
      };
    case "newsletter":
      return {
        id: crypto.randomUUID(),
        type: "newsletter",
        settings: baseSettings,
        data: {
          title: "اشترك في نشرتنا البريدية",
          subtitle: "احصل على آخر الأخبار والعروض",
          buttonText: "اشترك",
          placeholder: "بريدك الإلكتروني",
        },
      };
    case "banner":
      return {
        id: crypto.randomUUID(),
        type: "banner",
        settings: { padding: "py-4" },
        data: {
          text: "🎉 عرض خاص! خصم 20% على جميع الخدمات",
          buttonText: "احصل على العرض",
          buttonLink: "/pricing",
          style: "promo",
        },
      };
    case "cards":
      return {
        id: crypto.randomUUID(),
        type: "cards",
        settings: baseSettings,
        data: {
          title: "خدماتنا المميزة",
          cards: [
            { title: "تصميم جرافيك", description: "تصاميم احترافية لعلامتك التجارية", badge: "الأكثر طلباً" },
            { title: "تطوير مواقع", description: "مواقع عصرية وسريعة", badge: "" },
            { title: "تسويق رقمي", description: "حملات تسويقية فعالة", badge: "جديد" },
          ],
          columns: 3,
        },
      };
    case "accordion":
      return {
        id: crypto.randomUUID(),
        type: "accordion",
        settings: baseSettings,
        data: {
          title: "معلومات مهمة",
          items: [
            { title: "ما هي سياسة الاسترجاع؟", content: "يمكنك استرجاع المبلغ خلال 30 يوم" },
            { title: "كيف أتواصل مع الدعم؟", content: "عبر البريد أو الهاتف أو الدردشة المباشرة" },
          ],
        },
      };
    case "tabs":
      return {
        id: crypto.randomUUID(),
        type: "tabs",
        settings: baseSettings,
        data: {
          tabs: [
            { title: "الميزات", content: "محتوى الميزات هنا", icon: "Sparkles" },
            { title: "المواصفات", content: "محتوى المواصفات هنا", icon: "Settings" },
            { title: "التسعير", content: "محتوى التسعير هنا", icon: "DollarSign" },
          ],
        },
      };
    case "timeline":
      return {
        id: crypto.randomUUID(),
        type: "timeline",
        settings: baseSettings,
        data: {
          title: "رحلتنا",
          events: [
            { date: "2020", title: "البداية", description: "تأسيس الشركة" },
            { date: "2022", title: "التوسع", description: "افتتاح فروع جديدة" },
            { date: "2024", title: "الريادة", description: "أصبحنا الأول في المجال" },
          ],
        },
      };
    case "map":
      return {
        id: crypto.randomUUID(),
        type: "map",
        settings: baseSettings,
        data: {
          embedUrl: "",
          height: 400,
        },
      };
    case "quote":
      return {
        id: crypto.randomUUID(),
        type: "quote",
        settings: baseSettings,
        data: {
          quote: "النجاح ليس نهاية المطاف، والفشل ليس قاتلاً: إنها الشجاعة للاستمرار هي ما يهم",
          author: "ونستون تشرشل",
          role: "رئيس وزراء بريطانيا السابق",
          style: "boxed",
        },
      };
    case "alert":
      return {
        id: crypto.randomUUID(),
        type: "alert",
        settings: baseSettings,
        data: {
          title: "تنبيه",
          message: "هذا تنبيه مهم يجب الانتباه إليه",
          type: "info",
        },
      };
    case "social":
      return {
        id: crypto.randomUUID(),
        type: "social",
        settings: baseSettings,
        data: {
          title: "تابعنا",
          links: [
            { platform: "twitter", url: "#" },
            { platform: "facebook", url: "#" },
            { platform: "instagram", url: "#" },
            { platform: "linkedin", url: "#" },
          ],
        },
      };
    case "comparison":
      return {
        id: crypto.randomUUID(),
        type: "comparison",
        settings: baseSettings,
        data: {
          title: "مقارنة الباقات",
          option1Label: "الباقة الأساسية",
          option2Label: "الباقة المتقدمة",
          items: [
            { feature: "عدد المشاريع", option1: "5", option2: "غير محدود" },
            { feature: "دعم فني", option1: true, option2: true },
            { feature: "تحديثات مجانية", option1: false, option2: true },
          ],
        },
      };
    case "progress":
      return {
        id: crypto.randomUUID(),
        type: "progress",
        settings: baseSettings,
        data: {
          title: "مهاراتنا",
          items: [
            { label: "تصميم", value: 95, color: "from-blue-500 to-cyan-500" },
            { label: "تطوير", value: 90, color: "from-emerald-500 to-teal-500" },
            { label: "تسويق", value: 85, color: "from-purple-500 to-pink-500" },
          ],
        },
      };
    case "iconbox":
      return {
        id: crypto.randomUUID(),
        type: "iconbox",
        settings: baseSettings,
        data: {
          title: "خدماتنا",
          boxes: [
            { icon: "Palette", title: "تصميم", description: "تصاميم احترافية", color: "from-blue-500 to-cyan-500" },
            { icon: "Code", title: "برمجة", description: "حلول برمجية متكاملة", color: "from-emerald-500 to-teal-500" },
            { icon: "Megaphone", title: "تسويق", description: "حملات تسويقية فعالة", color: "from-orange-500 to-amber-500" },
          ],
          columns: 3,
        },
      };
    case "herovideo":
      return {
        id: crypto.randomUUID(),
        type: "herovideo",
        settings: { ...baseSettings, padding: "py-32" },
        data: {
          title: "اكتشف عالماً جديداً",
          subtitle: "تجربة مميزة تنتظرك",
          videoUrl: "",
          ctaText: "ابدأ الآن",
          ctaLink: "/register",
          overlayOpacity: 50,
        },
      };
    case "splitcontent":
      return {
        id: crypto.randomUUID(),
        type: "splitcontent",
        settings: baseSettings,
        data: {
          title: "لماذا نحن مختلفون",
          content: "نقدم خدمات استثنائية تجمع بين الجودة والسرعة والأسعار المناسبة",
          image: "",
          imagePosition: "right",
          ctaText: "تعرف أكثر",
          ctaLink: "/about",
        },
      };
    case "featurelist":
      return {
        id: crypto.randomUUID(),
        type: "featurelist",
        settings: baseSettings,
        data: {
          title: "ما يميزنا",
          features: [
            { icon: "Check", title: "جودة عالية", description: "نضمن أعلى معايير الجودة" },
            { icon: "Check", title: "سرعة التسليم", description: "التزام تام بالمواعيد" },
            { icon: "Check", title: "دعم متواصل", description: "فريق دعم على مدار الساعة" },
          ],
          showCheckmarks: true,
        },
      };
    case "code":
      return {
        id: crypto.randomUUID(),
        type: "code",
        settings: baseSettings,
        data: {
          code: "console.log('Hello World');",
          language: "javascript",
          showLineNumbers: true,
        },
      };
    case "table":
      return {
        id: crypto.randomUUID(),
        type: "table",
        settings: baseSettings,
        data: {
          headers: ["الاسم", "السعر", "المدة"],
          rows: [
            ["الباقة الأساسية", "99 ج.م", "شهر"],
            ["الباقة المتقدمة", "199 ج.م", "شهر"],
          ],
          striped: true,
          hoverable: true,
        },
      };
    case "form":
      return {
        id: crypto.randomUUID(),
        type: "form",
        settings: baseSettings,
        data: {
          title: "تواصل معنا",
          fields: [
            { type: "text", label: "الاسم", placeholder: "أدخل اسمك", required: true },
            { type: "email", label: "البريد الإلكتروني", placeholder: "أدخل بريدك", required: true },
            { type: "textarea", label: "الرسالة", placeholder: "اكتب رسالتك", required: true },
          ],
          submitText: "إرسال",
          successMessage: "شكراً لتواصلك معنا!",
        },
      };
    case "ctabuttons":
      return {
        id: crypto.randomUUID(),
        type: "ctabuttons",
        settings: baseSettings,
        data: {
          buttons: [
            { text: "ابدأ مجاناً", link: "/register", variant: "primary" },
            { text: "تعرف أكثر", link: "/about", variant: "outline" },
          ],
          alignment: "center",
        },
      };
    case "pricingtable":
      return {
        id: crypto.randomUUID(),
        type: "pricingtable",
        settings: baseSettings,
        data: {
          title: "اختر خطتك",
          plans: [
            {
              name: "الأساسية",
              price: "99",
              period: "شهرياً",
              features: ["5 مشاريع", "دعم بريدي", "تحديثات أساسية"],
              ctaText: "اختر الخطة",
              ctaLink: "/register",
            },
            {
              name: "الاحترافية",
              price: "199",
              period: "شهرياً",
              features: ["مشاريع غير محدودة", "دعم أولوية", "جميع الميزات"],
              ctaText: "اختر الخطة",
              ctaLink: "/register",
              popular: true,
            },
          ],
        },
      };
    case "breadcrumb":
      return {
        id: crypto.randomUUID(),
        type: "breadcrumb",
        settings: { padding: "py-4" },
        data: {
          items: [
            { label: "الرئيسية", link: "/" },
            { label: "الخدمات", link: "/services" },
            { label: "الصفحة الحالية" },
          ],
        },
      };
    case "countdown":
      return {
        id: crypto.randomUUID(),
        type: "countdown",
        settings: baseSettings,
        data: {
          title: "العرض ينتهي في",
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          style: "cards",
        },
      };
    default:
      return {
        id: crypto.randomUUID(),
        type: "text",
        settings: baseSettings,
        data: {
          content: "",
        },
      } as TextBlock;
  }
}
