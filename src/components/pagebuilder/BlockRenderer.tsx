import { PageBlock } from "./BlockTypes";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import {
  TrustBarBlockRenderer,
  ServiceCategoriesGridRenderer,
  TestimonialsCarouselRenderer,
  PricingCompareRenderer,
  FAQProRenderer,
} from "./blocks/PremiumBlocks";
import {
  Sparkles,
  Shield,
  Clock,
  Users,
  CheckCircle2,
  ArrowLeft,
  Star,
  ChevronDown,
  Target,
  Zap,
  Award,
  Send,
  UserCheck,
  Cog,
  Play,
  Quote,
  MapPin,
  Phone,
  Mail,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Github,
} from "lucide-react";
import { useState, useEffect, ReactNode } from "react";
import { Input } from "@/components/ui/input";

// Sanitize HTML content to prevent XSS attacks
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'div', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target', 'rel']
  });
};

const iconMap: Record<string, any> = {
  Sparkles, Shield, Clock, Users, Target, Zap, Award, Send, UserCheck, Cog,
  CheckCircle: CheckCircle2, Check, AlertCircle, Info, AlertTriangle,
  Linkedin, Twitter, Facebook, Instagram, Youtube, Github, Mail, Phone, MapPin,
};

// Animation classes mapping
const animationClasses: Record<string, string> = {
  "fade-in": "animate-fade-in",
  "slide-up": "animate-slide-up",
  "slide-down": "animate-slide-down",
  "zoom-in": "animate-zoom-in",
};

// Background gradient classes
const gradientClasses: Record<string, string> = {
  "from-primary to-primary/80": "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
  "from-blue-600 to-cyan-500": "bg-gradient-to-br from-blue-600 to-cyan-500 text-white",
  "from-purple-600 to-pink-500": "bg-gradient-to-br from-purple-600 to-pink-500 text-white",
  "from-orange-500 to-red-500": "bg-gradient-to-br from-orange-500 to-red-500 text-white",
  "from-green-500 to-emerald-500": "bg-gradient-to-br from-green-500 to-emerald-500 text-white",
  "from-gray-900 to-gray-800": "bg-gradient-to-br from-gray-900 to-gray-800 text-white",
};

// Helper function to build wrapper classes from settings
function getBlockWrapperClasses(settings: PageBlock['settings']): string {
  const classes: string[] = [];
  
  // Padding
  if (settings.padding) classes.push(settings.padding);
  if (settings.paddingX) classes.push(settings.paddingX);
  
  // Background
  if (settings.bgType === "color" && settings.bgColor) {
    classes.push(settings.bgColor);
    if (settings.bgColor === "bg-primary") {
      classes.push("text-primary-foreground");
    }
  }
  if (settings.bgType === "gradient" && settings.bgGradient && gradientClasses[settings.bgGradient]) {
    classes.push(gradientClasses[settings.bgGradient]);
  }
  
  // Text colors (only if not overridden by background)
  if (settings.textColor && settings.bgType !== "gradient") {
    classes.push(settings.textColor);
  }
  
  // Alignment
  if (settings.alignment === "center") classes.push("text-center");
  if (settings.alignment === "left") classes.push("text-left");
  if (settings.alignment === "right") classes.push("text-right");
  
  // Border
  if (settings.border && settings.border !== "none") {
    classes.push(settings.border, "border-border");
  }
  
  // Shadow
  if (settings.shadow && settings.shadow !== "none") {
    classes.push(settings.shadow);
  }
  
  // Animation
  if (settings.animation && settings.animation !== "none" && animationClasses[settings.animation]) {
    classes.push(animationClasses[settings.animation]);
  }
  
  return cn(classes);
}

// BlockWrapper component for applying styles
function BlockWrapper({ block, children, defaultClasses = "" }: { block: PageBlock; children: ReactNode; defaultClasses?: string }) {
  const { settings } = block;
  const wrapperClasses = getBlockWrapperClasses(settings);
  
  // Background image style
  const backgroundStyle = settings.bgType === "image" && settings.bgImage
    ? {
        backgroundImage: `url(${settings.bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <section 
      className={cn("relative overflow-hidden", defaultClasses, wrapperClasses)}
      style={backgroundStyle}
    >
      {settings.bgType === "image" && settings.bgImage && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className={cn("container mx-auto px-4 sm:px-6 lg:px-8 relative", settings.maxWidth || "max-w-7xl")}>
        {children}
      </div>
    </section>
  );
}

interface BlockRendererProps {
  block: PageBlock;
  isPreview?: boolean;
}

// Default settings to prevent undefined errors
const defaultSettings = {
  padding: "py-20",
  alignment: "center" as const,
  bgType: "none" as const,
};

// Normalize blocks coming from DB/PageBuilder versions:
// - Some saved pages use `props` instead of `data`
// - Some blocks may omit `settings`
function normalizeBlock<T extends PageBlock>(block: T): T {
  const anyBlock = block as any;

  const settings = {
    ...defaultSettings,
    ...(anyBlock?.props?.settings ?? {}),
    ...(anyBlock?.settings ?? {}),
  };

  const data = {
    ...(anyBlock?.props ?? {}),
    ...(anyBlock?.data ?? {}),
  };

  return {
    ...block,
    settings,
    data,
  } as T;
}

export function BlockRenderer({ block, isPreview = false }: BlockRendererProps) {
  const safeBlock = normalizeBlock(block);
  
  switch (safeBlock.type) {
    case "hero": return <HeroBlockRenderer block={safeBlock as any} />;
    case "trustbar": return <TrustBarProRenderer block={safeBlock as any} />;
    case "features": return <FeaturesBlockRenderer block={safeBlock as any} />;
    case "services": return <ServicesBlockRenderer block={safeBlock as any} />;
    case "service_categories": return <ServiceCategoriesProRenderer block={safeBlock as any} />;
    case "testimonials": return <TestimonialsBlockRenderer block={safeBlock as any} />;
    case "testimonials_carousel": return <TestimonialsCarouselProRenderer block={safeBlock as any} />;
    case "pricing": return <PricingBlockRenderer block={safeBlock as any} />;
    case "pricing_compare": return <PricingCompareProRenderer block={safeBlock as any} />;
    case "cta": return <CTABlockRenderer block={safeBlock as any} />;
    case "faq": return <FAQBlockRenderer block={safeBlock as any} />;
    case "faq_pro": return <FAQProBlockRenderer block={safeBlock as any} />;
    case "steps": return <StepsBlockRenderer block={safeBlock as any} />;
    case "text": return <TextBlockRenderer block={safeBlock as any} />;
    case "image": return <ImageBlockRenderer block={safeBlock as any} />;
    case "spacer": return <SpacerBlockRenderer block={safeBlock as any} />;
    case "divider": return <DividerBlockRenderer block={safeBlock as any} />;
    case "counter": return <CounterBlockRenderer block={safeBlock as any} />;
    case "timeline": return <TimelineBlockRenderer block={safeBlock as any} />;
    case "gallery": return <GalleryBlockRenderer block={safeBlock as any} />;
    case "team": return <TeamBlockRenderer block={safeBlock as any} />;
    case "logos": return <LogosBlockRenderer block={safeBlock as any} />;
    case "contact": return <ContactBlockRenderer block={safeBlock as any} />;
    case "newsletter": return <NewsletterBlockRenderer block={safeBlock as any} />;
    case "banner": return <BannerBlockRenderer block={safeBlock as any} />;
    case "cards": return <CardsBlockRenderer block={safeBlock as any} />;
    case "accordion": return <AccordionBlockRenderer block={safeBlock as any} />;
    case "tabs": return <TabsBlockRenderer block={safeBlock as any} />;
    case "quote": return <QuoteBlockRenderer block={safeBlock as any} />;
    case "alert": return <AlertBlockRenderer block={safeBlock as any} />;
    case "social": return <SocialBlockRenderer block={safeBlock as any} />;
    case "progress": return <ProgressBlockRenderer block={safeBlock as any} />;
    case "iconbox": return <IconBoxBlockRenderer block={safeBlock as any} />;
    case "splitcontent": return <SplitContentBlockRenderer block={safeBlock as any} />;
    case "featurelist": return <FeatureListBlockRenderer block={safeBlock as any} />;
    case "video": return <VideoBlockRenderer block={safeBlock as any} />;
    case "pricingtable": return <PricingTableBlockRenderer block={safeBlock as any} />;
    case "herovideo": return <HeroVideoBlockRenderer block={safeBlock as any} />;
    case "comparison": return <ComparisonBlockRenderer block={safeBlock as any} />;
    case "map": return <MapBlockRenderer block={safeBlock as any} />;
    case "countdown": return <CountdownBlockRenderer block={safeBlock as any} />;
    default: return <div className="p-8 bg-muted/50 text-center text-muted-foreground">بلوك: {block.type}</div>;
  }
}

// Hero Block - Premium Blue & Purple Theme
function HeroBlockRenderer({ block }: { block: PageBlock & { type: "hero" } }) {
  const data = (block.data ?? {}) as any;

  const title = typeof data.title === "string" ? data.title : "";
  const subtitle = typeof data.subtitle === "string" ? data.subtitle : "";

  // Support older/newer PageBuilder schemas
  const ctaTextRaw = data.ctaText ?? data.primaryButtonText ?? data.primaryCtaText;
  const ctaLinkRaw = data.ctaLink ?? data.primaryButtonLink ?? data.primaryCtaLink;

  const ctaText = typeof ctaTextRaw === "string" && ctaTextRaw.trim() ? ctaTextRaw : "ابدأ الآن";
  const ctaLink = typeof ctaLinkRaw === "string" && ctaLinkRaw.trim() ? ctaLinkRaw : "/services";

  const secondaryCtaText = typeof data.secondaryCtaText === "string" ? data.secondaryCtaText : "";
  const secondaryCtaLink = typeof data.secondaryCtaLink === "string" && data.secondaryCtaLink.trim() ? data.secondaryCtaLink : "#";
  const stats: Array<{ label?: string; value?: string | number }> = Array.isArray(data.stats) ? data.stats : [];

  return (
    <section className={cn("relative overflow-hidden", block.settings.padding || "py-28 lg:py-40")}>
      {/* Premium gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-background to-background" />
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary blue orb */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent rounded-full blur-3xl animate-float-slow" />
        {/* Purple accent orb */}
        <div
          className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-to-tr from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl animate-float-slow"
          style={{ animationDelay: "-4s" }}
        />
        {/* Center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-primary/8 via-accent/5 to-primary/8 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      {/* Premium grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_90%_60%_at_50%_40%,black_30%,transparent_100%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto text-center">
          {/* Premium animated badge */}
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/25 text-primary px-6 py-3 rounded-full text-sm font-semibold mb-10 animate-bounce-subtle backdrop-blur-sm shadow-lg shadow-primary/5">
            <Sparkles className="w-4 h-4 animate-pulse-soft" />
            <span>خدمات مُدارة بجودة مضمونة</span>
          </div>

          {/* Animated gradient title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight animate-fade-in-up">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {/* Subtitle with better readability */}
          {subtitle && (
            <p
              className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              {subtitle}
            </p>
          )}

          {/* Premium buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300 group"
              asChild
            >
              <Link to={ctaLink}>
                {ctaText}
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </Button>
            {secondaryCtaText && (
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-lg font-semibold border-2 border-primary/30 hover:border-primary hover:bg-primary/5 hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link to={secondaryCtaLink}>{secondaryCtaText}</Link>
              </Button>
            )}
          </div>

          {/* Premium animated stats */}
          {Boolean(data.showStats) && stats.length > 0 && (
            <div
              className="flex items-center justify-center gap-8 sm:gap-16 mt-20 animate-fade-in-up"
              style={{ animationDelay: "0.6s" }}
            >
              {stats.map((stat, i) => (
                <div key={i} className="text-center group cursor-default">
                  <p className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                    {stat?.value ?? ""}
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">{stat?.label ?? ""}</p>
                </div>
              ))}
            </div>
          )}

          {/* Keep the rest of the hero block unchanged */}
          {/* ... keep existing code (hero remainder) */}
        </div>
      </div>
    </section>
  );
}

function TrustBarProRenderer({ block }: { block: PageBlock & { type: "trustbar" } }) {
  const data = (block.data ?? {}) as any;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-12")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <TrustBarBlockRenderer title={data.title} logos={Array.isArray(data.logos) ? data.logos : []} highlights={data.highlights} />
      </div>
    </section>
  );
}

function ServiceCategoriesProRenderer({ block }: { block: PageBlock & { type: "service_categories" } }) {
  const data = (block.data ?? {}) as any;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ServiceCategoriesGridRenderer
          title={data.title}
          subtitle={data.subtitle}
          showFromDatabase={!!data.showFromDatabase}
          customItems={data.customItems}
        />
      </div>
    </section>
  );
}

function TestimonialsCarouselProRenderer({ block }: { block: PageBlock & { type: "testimonials_carousel" } }) {
  const data = (block.data ?? {}) as any;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <TestimonialsCarouselRenderer
          title={data.title}
          subtitle={data.subtitle}
          showFromDatabase={!!data.showFromDatabase}
          customTestimonials={data.customTestimonials}
        />
      </div>
    </section>
  );
}

function PricingCompareProRenderer({ block }: { block: PageBlock & { type: "pricing_compare" } }) {
  const data = (block.data ?? {}) as any;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <PricingCompareRenderer
          title={data.title}
          subtitle={data.subtitle}
          plans={Array.isArray(data.plans) ? data.plans : []}
          highlightedIndex={data.highlightedIndex}
        />
      </div>
    </section>
  );
}

function FAQProBlockRenderer({ block }: { block: PageBlock & { type: "faq_pro" } }) {
  const data = (block.data ?? {}) as any;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <FAQProRenderer
          title={data.title}
          subtitle={data.subtitle}
          enableSearch={!!data.enableSearch}
          faqs={Array.isArray(data.faqs) ? data.faqs : []}
        />
      </div>
    </section>
  );
}

// Features Block - Enhanced with Blue & Purple theme
function FeaturesBlockRenderer({ block }: { block: PageBlock & { type: "features" } }) {
  const data = (block.data ?? {}) as any;
  const columns = typeof data.columns === "number" ? data.columns : 4;
  const gridCols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";
  

  // Blue & Purple gradient variations for icons
  const iconGradients = [
    "from-[hsl(225,85%,55%)] to-[hsl(265,85%,60%)]",
    "from-[hsl(265,85%,60%)] to-[hsl(280,75%,55%)]",
    "from-[hsl(245,85%,58%)] to-[hsl(225,85%,55%)]",
    "from-[hsl(280,75%,55%)] to-[hsl(245,85%,58%)]",
  ];
  
  return (
    <section className={cn("relative bg-background overflow-hidden", block.settings.padding || "py-24")}>
      {/* Premium gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.08)_0%,transparent_50%)]" />
      </div>
      
      {/* Floating orbs */}
      <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-accent/15 via-primary/10 to-transparent rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-5s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary px-5 py-2.5 rounded-full text-sm font-medium mb-8 animate-fade-in backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>لماذا نحن؟</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 animate-fade-in-up bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">{data.title}</h2>
          <p className="text-lg lg:text-xl text-muted-foreground animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.2s' }}>{data.subtitle}</p>
        </div>
        <div className={cn("grid gap-6 lg:gap-8", gridCols)}>
          {data.features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || Sparkles;
            const gradient = iconGradients[index % iconGradients.length];
            return (
              <div 
                key={index} 
                className="group relative p-8 rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 animate-fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                {/* Gradient glow on hover */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] pointer-events-none" />
                
                <div className="relative">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg transition-all duration-500",
                    "group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-2xl",
                    gradient
                  )}>
                    <Icon className="w-8 h-8 text-white drop-shadow-sm" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Services Block
function ServicesBlockRenderer({ block }: { block: PageBlock & { type: "services" } }) {
  const data = (block.data ?? {}) as any;

  const showFromDatabase = Boolean(data.showFromDatabase);

  const { data: categories = [] } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: showFromDatabase,
  });

  const services = showFromDatabase
    ? categories
    : (data.services ?? data.customServices ?? []);

  const emojiMap: Record<string, string> = {
    palette: "🎨",
    image: "🖼️",
    layout: "🧩",
    globe: "🌐",
    smartphone: "📱",
    "trending-up": "📈",
    filetext: "✍️",
    code: "💻",
    megaphone: "📣",
    languages: "🌐",
    video: "🎬",
  };

  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {data.title || ""}
          </h2>
          {data.subtitle ? (
            <p className="text-lg text-muted-foreground">{data.subtitle}</p>
          ) : null}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any, index: number) => {
            const iconKey = String(service?.icon ?? "").toLowerCase().replace(/\s+/g, "");
            const title =
              service?.title ||
              service?.name_ar ||
              service?.name ||
              "خدمة";

            const description = service?.description || "خدمات احترافية";

            return (
              <div
                key={service?.id ?? index}
                className="group p-8 rounded-3xl bg-card border hover:border-primary/20 hover:shadow-xl transition-all"
              >
                <span className="text-4xl mb-4 block">{emojiMap[iconKey] || "🎯"}</span>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-muted-foreground">{description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Testimonials Block
function TestimonialsBlockRenderer({ block }: { block: PageBlock & { type: "testimonials" } }) {
  const data = (block.data ?? {}) as any;
  const { data: dbTestimonials = [] } = useQuery({
    queryKey: ["public-testimonials"],
    queryFn: async () => {
      const { data } = await supabase.from("testimonials").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: Boolean(data.showFromDatabase),
  });

  const testimonials = data.showFromDatabase ? dbTestimonials : (data.customTestimonials || []);
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">{data.title ?? ""}</h2>
          <p className="text-lg text-muted-foreground">{data.subtitle ?? ""}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial: any, index: number) => (
            <div key={index} className="p-8 rounded-3xl bg-muted/50 border">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="mb-6 italic">"{testimonial.content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                  {testimonial.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Block
function PricingBlockRenderer({ block }: { block: PageBlock & { type: "pricing" } }) {
  const data = (block.data ?? {}) as any;
  const { data: plans = [] } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: Boolean(data.showFromDatabase),
  });
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">{data.title ?? ""}</h2>
          <p className="text-lg text-muted-foreground">{data.subtitle ?? ""}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan: any, index: number) => (
            <div key={plan.id} className={cn("relative p-8 rounded-3xl bg-card border-2 transition-all", index === 1 ? "border-primary shadow-2xl scale-105" : "border-transparent hover:shadow-xl")}>
              {index === 1 && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium">الأكثر شعبية</div>}
              <h3 className="text-xl font-bold mb-2">{plan.name_ar || plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">{plan.price || 0}</span>
                <span className="text-muted-foreground">ج.م / شهرياً</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" />{plan.credits_per_month} كريديت شهرياً</li>
              </ul>
              <Button className="w-full" variant={index === 1 ? "default" : "outline"} asChild><Link to="/register">{plan.is_free ? "ابدأ مجاناً" : "اشترك الآن"}</Link></Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Block - Enhanced with stunning animations
function CTABlockRenderer({ block }: { block: PageBlock & { type: "cta" } }) {
  const data = (block.data ?? {}) as any;
  return (
    <section className={cn("relative overflow-hidden", block.settings.padding || "py-24")}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent animate-gradient" />
      
      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full animate-scale-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full animate-scale-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:32px_32px]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white animate-fade-in-up">
            {data.title ?? ""}
          </h2>
          <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {data.subtitle ?? ""}
          </p>
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button 
              size="lg" 
              className="h-14 px-10 text-lg font-medium bg-white text-primary hover:bg-white/90 shadow-2xl hover:shadow-white/25 hover:scale-105 transition-all duration-300 group" 
              asChild
            >
              <Link to={data.buttonLink}>
                {data.buttonText}
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// FAQ Block
function FAQBlockRenderer({ block }: { block: PageBlock & { type: "faq" } }) {
  const data = (block.data ?? {}) as any;
  const faqs: Array<any> = Array.isArray(data.faqs) ? data.faqs : [];
  const [openItems, setOpenItems] = useState<number[]>([]);
  const toggleItem = (index: number) => setOpenItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{data.title ?? ""}</h2>
          <p className="text-lg text-muted-foreground">{data.subtitle ?? ""}</p>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border rounded-2xl overflow-hidden">
              <button onClick={() => toggleItem(index)} className="w-full flex items-center justify-between p-5 text-right bg-card hover:bg-muted/50 transition-colors">
                <span className="font-medium">{faq.question}</span>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", openItems.includes(index) && "rotate-180")} />
              </button>
              {openItems.includes(index) && <div className="px-5 pb-5 pt-0 bg-card"><p className="text-muted-foreground">{faq.answer}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Steps Block - Enhanced with animated connectors
function StepsBlockRenderer({ block }: { block: PageBlock & { type: "steps" } }) {
  const data = (block.data ?? {}) as any;
  const steps: Array<any> = Array.isArray(data.steps) ? data.steps : [];
  return (
    <section className={cn("relative bg-muted/30 overflow-hidden", block.settings.padding || "py-24")}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.05)_0%,transparent_60%)]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <Target className="w-4 h-4" />
            <span>كيف يعمل؟</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 animate-fade-in-up">{data.title ?? ""}</h2>
          <p className="text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>{data.subtitle ?? ""}</p>
        </div>
        
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-24 left-16 right-16 h-0.5 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
          
          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, index) => {
              const Icon = iconMap[step.icon] || Target;
              return (
                <div 
                  key={index} 
                  className="relative text-center animate-fade-in-up"
                  style={{ animationDelay: `${0.2 * (index + 1)}s` }}
                >
                  {/* Step icon */}
                  <div className="relative inline-block mb-8">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-2xl transform transition-all duration-500 hover:scale-110 hover:rotate-3 animate-glow-pulse">
                      <Icon className="w-12 h-12" />
                    </div>
                    {/* Step number badge */}
                    <span className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-background border-2 border-primary text-primary font-bold flex items-center justify-center shadow-lg text-lg">
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step?.description ?? ""}</p>

                  {/* Arrow indicator for mobile */}
                  {index < steps.length - 1 && (
                    <div className="md:hidden flex justify-center my-6">
                      <ChevronDown className="w-6 h-6 text-primary animate-bounce" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Text Block
function TextBlockRenderer({ block }: { block: PageBlock & { type: "text" } }) {
  const { data, settings } = block;
  const alignClass =
    settings.alignment === "center"
      ? "text-center"
      : settings.alignment === "left"
      ? "text-left"
      : "text-right";

  return (
    <BlockWrapper block={block}>
      <div
        className={cn(
          "prose prose-lg max-w-4xl mx-auto dark:prose-invert",
          alignClass
        )}
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(data.htmlContent || data.content || ""),
        }}
      />
    </BlockWrapper>
  );
}

// Image Block
function ImageBlockRenderer({ block }: { block: PageBlock & { type: "image" } }) {
  const { data, settings } = block;
  return (
    <section className={cn(settings.padding || "py-12")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {data.src && <img src={data.src} alt={data.alt} className={cn("shadow-xl mx-auto", data.rounded !== false && "rounded-2xl")} style={{ width: data.width || "auto" }} />}
          {data.caption && <p className="text-muted-foreground mt-4 text-sm">{data.caption}</p>}
        </div>
      </div>
    </section>
  );
}

// Spacer Block
function SpacerBlockRenderer({ block }: { block: PageBlock & { type: "spacer" } }) {
  return <div style={{ height: block.data.height }} />;
}

// Divider Block
function DividerBlockRenderer({ block }: { block: PageBlock & { type: "divider" } }) {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <hr className={cn("border-border", block.data.style === "dashed" && "border-dashed", block.data.style === "dotted" && "border-dotted")} />
    </div>
  );
}

// Counter Block - Enhanced with animated counters
function CounterBlockRenderer({ block }: { block: PageBlock & { type: "counter" } }) {
  const { data } = block;
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className={cn("relative overflow-hidden", block.settings.padding || "py-20")}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent" />
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:40px_40px]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {data.title && (
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white animate-fade-in">
            {data.title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {data.counters.map((counter, index) => {
            const Icon = iconMap[counter.icon || ""] || null;
            return (
              <div 
                key={index} 
                className="text-center text-white group cursor-default"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {Icon && (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
                    <Icon className="w-8 h-8" />
                  </div>
                )}
                <p className={cn(
                  "text-4xl md:text-5xl lg:text-6xl font-bold mb-2 transition-all duration-1000",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )} style={{ transitionDelay: `${index * 150}ms` }}>
                  {counter.value}{counter.suffix}
                </p>
                <p className="text-sm lg:text-base opacity-80">{counter.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Timeline Block
function TimelineBlockRenderer({ block }: { block: PageBlock & { type: "timeline" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">{data.title}</h2>
        <div className="max-w-3xl mx-auto">
          {data.events.map((event, index) => (
            <div key={index} className="flex gap-6 mb-8 last:mb-0">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{index + 1}</div>
                {index < data.events.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
              </div>
              <div className="flex-1 pb-8">
                <span className="text-sm text-primary font-medium">{event.date}</span>
                <h3 className="text-xl font-bold mt-1 mb-2">{event.title}</h3>
                <p className="text-muted-foreground">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Gallery Block
function GalleryBlockRenderer({ block }: { block: PageBlock & { type: "gallery" } }) {
  const { data } = block;
  const gridCols = data.columns === 2 ? "grid-cols-2" : data.columns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4";
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <h2 className="text-3xl font-bold text-center mb-12">{data.title}</h2>}
        <div className={cn("grid gap-4", gridCols)}>
          {data.images.map((image, index) => (
            <div key={index} className="relative group overflow-hidden rounded-xl">
              <img src={image.src} alt={image.alt} className="w-full aspect-square object-cover transition-transform group-hover:scale-110" />
              {image.caption && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><p className="text-white text-center px-4">{image.caption}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Block
function TeamBlockRenderer({ block }: { block: PageBlock & { type: "team" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{data.title}</h2>
          <p className="text-lg text-muted-foreground">{data.subtitle}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {data.members.map((member, index) => (
            <div key={index} className="text-center group">
              <div className="w-32 h-32 rounded-full bg-primary/10 mx-auto mb-4 overflow-hidden">
                {member.image ? <img src={member.image} alt={member.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary">{member.name.charAt(0)}</div>}
              </div>
              <h3 className="font-bold text-lg">{member.name}</h3>
              <p className="text-muted-foreground text-sm">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Logos Block
function LogosBlockRenderer({ block }: { block: PageBlock & { type: "logos" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-12")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <p className="text-center text-muted-foreground mb-8">{data.title}</p>}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {data.logos.map((logo, index) => (
            <img key={index} src={logo.src} alt={logo.alt} className="h-8 md:h-10 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0" />
          ))}
        </div>
      </div>
    </section>
  );
}

// Contact Block
function ContactBlockRenderer({ block }: { block: PageBlock & { type: "contact" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-4">{data.title}</h2>
          <p className="text-muted-foreground">{data.subtitle}</p>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {data.email && <div className="text-center p-6 rounded-2xl bg-muted/50"><Mail className="w-8 h-8 mx-auto mb-4 text-primary" /><p className="font-medium">البريد الإلكتروني</p><a href={`mailto:${data.email}`} className="text-muted-foreground hover:text-primary">{data.email}</a></div>}
          {data.phone && <div className="text-center p-6 rounded-2xl bg-muted/50"><Phone className="w-8 h-8 mx-auto mb-4 text-primary" /><p className="font-medium">الهاتف</p><a href={`tel:${data.phone}`} className="text-muted-foreground hover:text-primary">{data.phone}</a></div>}
          {data.address && <div className="text-center p-6 rounded-2xl bg-muted/50"><MapPin className="w-8 h-8 mx-auto mb-4 text-primary" /><p className="font-medium">العنوان</p><p className="text-muted-foreground">{data.address}</p></div>}
        </div>
      </div>
    </section>
  );
}

// Newsletter Block
function NewsletterBlockRenderer({ block }: { block: PageBlock & { type: "newsletter" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-primary/10", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">{data.title}</h2>
          <p className="text-muted-foreground mb-6">{data.subtitle}</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <Input placeholder={data.placeholder || "بريدك الإلكتروني"} className="flex-1" />
            <Button>{data.buttonText}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Banner Block
function BannerBlockRenderer({ block }: { block: PageBlock & { type: "banner" } }) {
  const { data } = block;
  const styles = {
    info: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    success: "bg-green-500/10 text-green-700 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    promo: "bg-primary text-primary-foreground",
  } as const;

  const styleClass = styles[data.style as keyof typeof styles] || styles.info;

  return (
    <BlockWrapper block={block} defaultClasses="py-3">
      <div className={cn("px-4 border text-center rounded-xl", styleClass)}>
        <p className="font-medium">{data.text}</p>
        {data.buttonText && (
          <Button size="sm" variant="outline" className="mt-2" asChild>
            <Link to={data.buttonLink || "#"}>{data.buttonText}</Link>
          </Button>
        )}
      </div>
    </BlockWrapper>
  );
}

// Cards Block
function CardsBlockRenderer({ block }: { block: PageBlock & { type: "cards" } }) {
  const { data } = block;
  const gridCols = data.columns === 2 ? "sm:grid-cols-2" : data.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">{data.title}</h2>{data.subtitle && <p className="text-muted-foreground">{data.subtitle}</p>}</div>}
        <div className={cn("grid gap-6", gridCols)}>
          {data.cards.map((card, index) => (
            <div key={index} className="group rounded-2xl border bg-card overflow-hidden hover:shadow-xl transition-shadow">
              {card.image && <img src={card.image} alt={card.title} className="w-full h-48 object-cover" />}
              <div className="p-6">
                {card.badge && <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3">{card.badge}</span>}
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{card.title}</h3>
                <p className="text-muted-foreground text-sm">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Accordion Block
function AccordionBlockRenderer({ block }: { block: PageBlock & { type: "accordion" } }) {
  const { data } = block;
  const [openItems, setOpenItems] = useState<number[]>([]);
  const toggleItem = (index: number) => setOpenItems(prev => data.allowMultiple ? (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]) : (prev.includes(index) ? [] : [index]));
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <h2 className="text-3xl font-bold text-center mb-12">{data.title}</h2>}
        <div className="max-w-3xl mx-auto space-y-3">
          {data.items.map((item, index) => (
            <div key={index} className="border rounded-xl overflow-hidden">
              <button onClick={() => toggleItem(index)} className="w-full flex items-center justify-between p-4 text-right bg-card hover:bg-muted/50"><span className="font-medium">{item.title}</span><ChevronDown className={cn("w-5 h-5 transition-transform", openItems.includes(index) && "rotate-180")} /></button>
              {openItems.includes(index) && <div className="p-4 pt-0 bg-card"><p className="text-muted-foreground">{item.content}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Tabs Block
function TabsBlockRenderer({ block }: { block: PageBlock & { type: "tabs" } }) {
  const { data } = block;
  const [activeTab, setActiveTab] = useState(0);
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 border-b mb-6 overflow-x-auto">
            {data.tabs.map((tab, index) => (
              <button key={index} onClick={() => setActiveTab(index)} className={cn("px-6 py-3 font-medium transition-colors whitespace-nowrap", activeTab === index ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>{tab.title}</button>
            ))}
          </div>
          <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.tabs[activeTab]?.content || "") }} />
        </div>
      </div>
    </section>
  );
}

// Quote Block
function QuoteBlockRenderer({ block }: { block: PageBlock & { type: "quote" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <Quote className="w-12 h-12 mx-auto mb-6 text-primary opacity-50" />
          <blockquote className="text-2xl md:text-3xl font-medium italic mb-6">"{data.quote}"</blockquote>
          <div><p className="font-bold">{data.author}</p>{data.role && <p className="text-muted-foreground text-sm">{data.role}</p>}</div>
        </div>
      </div>
    </section>
  );
}

// Alert Block
function AlertBlockRenderer({ block }: { block: PageBlock & { type: "alert" } }) {
  const { data } = block;
  const styles = { info: "bg-blue-50 border-blue-200 text-blue-800", success: "bg-green-50 border-green-200 text-green-800", warning: "bg-yellow-50 border-yellow-200 text-yellow-800", error: "bg-red-50 border-red-200 text-red-800" };
  const icons = { info: Info, success: Check, warning: AlertTriangle, error: AlertCircle };
  const Icon = icons[data.type];
  return (
    <div className={cn("p-4 border rounded-xl flex gap-3", styles[data.type])}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div><p className="font-medium">{data.title}</p><p className="text-sm opacity-80">{data.message}</p></div>
    </div>
  );
}

// Social Block
function SocialBlockRenderer({ block }: { block: PageBlock & { type: "social" } }) {
  const { data } = block;
  const platformIcons: Record<string, any> = { facebook: Facebook, twitter: Twitter, instagram: Instagram, linkedin: Linkedin, youtube: Youtube, github: Github };
  return (
    <section className={cn("bg-background", block.settings.padding || "py-8")}>
      <div className="container mx-auto px-4 text-center">
        {data.title && <p className="text-muted-foreground mb-4">{data.title}</p>}
        <div className="flex justify-center gap-4">
          {data.links.map((link, index) => {
            const Icon = platformIcons[link.platform.toLowerCase()] || Mail;
            return <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"><Icon className="w-5 h-5" /></a>;
          })}
        </div>
      </div>
    </section>
  );
}

// Progress Block
function ProgressBlockRenderer({ block }: { block: PageBlock & { type: "progress" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <h2 className="text-3xl font-bold text-center mb-12">{data.title}</h2>}
        <div className="max-w-2xl mx-auto space-y-6">
          {data.items.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between mb-2"><span className="font-medium">{item.label}</span><span className="text-muted-foreground">{item.value}%</span></div>
              <div className="h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${item.value}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// IconBox Block
function IconBoxBlockRenderer({ block }: { block: PageBlock & { type: "iconbox" } }) {
  const { data } = block;
  const gridCols = data.columns === 2 ? "sm:grid-cols-2" : data.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">{data.title}</h2>{data.subtitle && <p className="text-muted-foreground">{data.subtitle}</p>}</div>}
        <div className={cn("grid gap-6", gridCols)}>
          {data.boxes.map((box, index) => {
            const Icon = iconMap[box.icon] || Sparkles;
            return (
              <div key={index} className={cn("p-6 rounded-2xl text-center transition-all", data.style === "bordered" ? "border hover:border-primary" : data.style === "shadowed" ? "shadow-lg hover:shadow-xl" : "bg-muted/50 hover:bg-muted")}>
                <div className={cn("w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center", box.color || "bg-primary/10 text-primary")}><Icon className="w-8 h-8" /></div>
                <h3 className="font-bold text-lg mb-2">{box.title}</h3>
                <p className="text-muted-foreground text-sm">{box.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Split Content Block
function SplitContentBlockRenderer({ block }: { block: PageBlock & { type: "splitcontent" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn("grid lg:grid-cols-2 gap-12 items-center", data.imagePosition === "left" && "lg:flex-row-reverse")}>
          <div className={data.imagePosition === "left" ? "lg:order-2" : ""}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">{data.title}</h2>
            <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.content || "") }} />
            {data.ctaText && <Button className="mt-6" asChild><Link to={data.ctaLink || "#"}>{data.ctaText}</Link></Button>}
          </div>
          <div className={data.imagePosition === "left" ? "lg:order-1" : ""}><img src={data.image} alt={data.title} className="rounded-2xl shadow-xl" /></div>
        </div>
      </div>
    </section>
  );
}

// Feature List Block
function FeatureListBlockRenderer({ block }: { block: PageBlock & { type: "featurelist" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">{data.title}</h2>{data.subtitle && <p className="text-muted-foreground">{data.subtitle}</p>}</div>}
        <div className="max-w-3xl mx-auto space-y-4">
          {data.features.map((feature, index) => {
            const Icon = data.showCheckmarks ? Check : (iconMap[feature.icon] || Check);
            return (
              <div key={index} className="flex gap-4 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
                <div><h3 className="font-bold">{feature.title}</h3><p className="text-muted-foreground text-sm">{feature.description}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Video Block
function VideoBlockRenderer({ block }: { block: PageBlock & { type: "video" } }) {
  const { data } = block;
  const isYoutube = data.url.includes("youtube") || data.url.includes("youtu.be");
  const getYoutubeId = (url: string) => { const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/); return match ? match[1] : ""; };
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {data.title && <h2 className="text-2xl font-bold text-center mb-8">{data.title}</h2>}
        <div className="max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-xl">
          {isYoutube ? <iframe src={`https://www.youtube.com/embed/${getYoutubeId(data.url)}${data.autoplay ? "?autoplay=1" : ""}${data.muted ? "&mute=1" : ""}`} className="w-full h-full" allow="autoplay; fullscreen" /> : <video src={data.url} controls autoPlay={data.autoplay} muted={data.muted} className="w-full h-full object-cover" />}
        </div>
      </div>
    </section>
  );
}

// Pricing Table Block
function PricingTableBlockRenderer({ block }: { block: PageBlock & { type: "pricingtable" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-muted/30", block.settings.padding || "py-20")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12"><h2 className="text-3xl font-bold mb-4">{data.title}</h2>{data.subtitle && <p className="text-muted-foreground">{data.subtitle}</p>}</div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {data.plans.map((plan, index) => (
            <div key={index} className={cn("relative p-8 rounded-3xl bg-card border-2 transition-all", plan.popular ? "border-primary shadow-2xl scale-105" : "border-transparent hover:shadow-xl")}>
              {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium">الأفضل</div>}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6"><span className="text-4xl font-bold">{plan.price}</span>{plan.period && <span className="text-muted-foreground">/{plan.period}</span>}</div>
              <ul className="space-y-3 mb-8">{plan.features.map((feature, i) => <li key={i} className="flex items-center gap-2"><Check className="w-5 h-5 text-primary" />{feature}</li>)}</ul>
              <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild><Link to={plan.ctaLink}>{plan.ctaText}</Link></Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Hero Video Block
function HeroVideoBlockRenderer({ block }: { block: PageBlock & { type: "herovideo" } }) {
  const { data } = block;
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <video src={data.videoUrl} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black" style={{ opacity: data.overlayOpacity || 0.5 }} />
      <div className="relative z-10 text-center text-white px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">{data.title}</h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">{data.subtitle}</p>
        {data.ctaText && <Button size="lg" asChild><Link to={data.ctaLink || "#"}>{data.ctaText}</Link></Button>}
      </div>
    </section>
  );
}

// Comparison Block
function ComparisonBlockRenderer({ block }: { block: PageBlock & { type: "comparison" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">{data.title}</h2>
        <div className="max-w-3xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b"><th className="p-4 text-right">الميزة</th><th className="p-4 text-center">{data.option1Label}</th><th className="p-4 text-center">{data.option2Label}</th></tr></thead>
            <tbody>{data.items.map((item, index) => <tr key={index} className="border-b"><td className="p-4">{item.feature}</td><td className="p-4 text-center">{typeof item.option1 === "boolean" ? (item.option1 ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <span className="text-muted-foreground">-</span>) : item.option1}</td><td className="p-4 text-center">{typeof item.option2 === "boolean" ? (item.option2 ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <span className="text-muted-foreground">-</span>) : item.option2}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Map Block
function MapBlockRenderer({ block }: { block: PageBlock & { type: "map" } }) {
  const { data } = block;
  return (
    <section className={cn("bg-background", block.settings.padding || "py-0")}>
      <iframe src={data.embedUrl} width="100%" height={data.height} style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </section>
  );
}

// Countdown Block
function CountdownBlockRenderer({ block }: { block: PageBlock & { type: "countdown" } }) {
  const { data } = block;
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(data.targetDate).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { clearInterval(interval); return; }
      setTimeLeft({ days: Math.floor(diff / (1000 * 60 * 60 * 24)), hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)), seconds: Math.floor((diff % (1000 * 60)) / 1000) });
    }, 1000);
    return () => clearInterval(interval);
  }, [data.targetDate]);
  return (
    <section className={cn("bg-primary text-primary-foreground", block.settings.padding || "py-16")}>
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-8">{data.title}</h2>
        <div className="flex justify-center gap-4 md:gap-8">
          {Object.entries(timeLeft).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-4xl md:text-6xl font-bold">{value}</div>
              <div className="text-sm opacity-80">{{ days: "يوم", hours: "ساعة", minutes: "دقيقة", seconds: "ثانية" }[key]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
