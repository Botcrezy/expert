import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CheckCircle2,
  Star,
  Zap,
  Award,
  Briefcase,
  Users,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  Shield,
  Clock,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useCMSSections, getCMSContent, getCMSTitle } from "@/hooks/useCMSSections";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/seo/SEO";
import freelancerHero1 from "@/assets/freelancer-hero-1.jpg";
import freelancerHero2 from "@/assets/freelancer-hero-2.jpg";
import { motion } from "framer-motion";

const emojiMap: Record<string, string> = {
  Palette: "🎨",
  FileText: "✍️",
  Code: "💻",
  Megaphone: "📈",
  Languages: "🌐",
  Video: "🎬",
  Layout: "🖼️",
  Share2: "📱",
};

export default function Index() {
  const { data: cmsSections } = useCMSSections();
  const { data: settings } = usePlatformSettings();
  
  // Fetch categories from database
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
  });

  // Fetch plans from database
  const { data: dbPlans = [] } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Static testimonials (UI-focused, no backend dependency)
  const testimonials = [
    {
      id: "t1",
      name: "أحمد - صاحب وكالة تسويق",
      role: "عميل باقة الشركات",
      rating: 5,
      content:
        "أخيرًا لقيت حل يخلّيني أركّز في البزنس نفسه بدل ما أضيّع وقتي في متابعة الفريلانسرز واحد واحد.",
    },
    {
      id: "t2",
      name: "سارة - مؤسسة متجر إلكتروني",
      role: "عميلة باقة النمو",
      rating: 5,
      content:
        "الشغل من أول مرة معمول صح، وفيه حد مسؤول قدامي أرجع له لو محتاجة تعديل أو إضافة.",
    },
    {
      id: "t3",
      name: "محمد - صانع محتوى",
      role: "عميل باقة المبدعين",
      rating: 5,
      content:
        "فريق منظم، تواصل واضح، وتسليم أسرع من المتوقع. حقيقي فارق عن التعامل الفردي.",
    },
    {
      id: "t4",
      name: "منى - مؤسسة شركة ناشئة",
      role: "عميلة باقة الانطلاق",
      rating: 4,
      content:
        "قدرت أطلق البراند من غير ما أدوّر على مصممين وكتّاب ومطوّرين كل واحد لوحده.",
    },
    {
      id: "t5",
      name: "عمر - مدير منتج",
      role: "عميل باقة المؤسسات",
      rating: 5,
      content:
        "النظام كله structured من أول استلام الطلب لحد التسليم وتقارير المتابعة.",
    },
  ];

  // Fetch stats
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const [requests, freelancers, clients] = await Promise.all([
        supabase.from("requests").select("id", { count: "exact", head: true }),
        supabase.from("freelancer_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalProjects: requests.count || 0,
        totalFreelancers: freelancers.count || 0,
        totalClients: clients.count || 0,
      };
    },
  });
  
  const siteName = settings?.siteName || "Sity Experts";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEO
        title={getCMSTitle(cmsSections, "meta_title") || `${siteName} - منصة الخدمات المُدارة الأولى`}
        description={
          getCMSContent(cmsSections, "meta_description") ||
          "منصة الخدمات المُدارة - احصل على شغل بجودة مضمونة من خبراء معتمدين"
        }
        path="/"
      />

      <DynamicNavbar />

      {/* Hero Section - Modern Glassmorphism */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
        {/* Advanced Background (optimized for smooth scroll) */}
        <div className="absolute inset-0 pointer-events-none" style={{ contain: "paint" }}>
          {/* Base Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
          
          {/* Mesh Gradient (static to avoid expensive background repaint during scroll) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 20% 40%, hsl(var(--primary) / 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 20%, hsl(var(--accent) / 0.12) 0%, transparent 50%)",
            }}
          />

          {/* Geometric Grid Pattern with Fade */}
          <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:60px_60px]" />
          </div>
          
          {/* Radial Fade Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_70%,hsl(var(--background)/0.8)_100%)]" />

          {/* Primary Aurora Orb */}
          <motion.div
            className="absolute -top-40 -right-40 w-[820px] h-[820px] rounded-full"
            style={{
              background: "conic-gradient(from 0deg at 50% 50%, hsl(var(--primary) / 0.20), hsl(var(--accent) / 0.15), hsl(var(--primary) / 0.10), hsl(var(--accent) / 0.20), hsl(var(--primary) / 0.20))",
              filter: "blur(52px)",
              willChange: "transform",
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 60, repeat: Infinity, ease: "linear" },
              scale: { duration: 15, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Secondary Aurora Orb */}
          <motion.div
            className="absolute -bottom-60 -left-40 w-[760px] h-[760px] rounded-full"
            style={{
              background: "conic-gradient(from 180deg at 50% 50%, hsl(var(--accent) / 0.18), hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.15), hsl(var(--primary) / 0.18), hsl(var(--accent) / 0.18))",
              filter: "blur(58px)",
              willChange: "transform",
            }}
            animate={{
              rotate: [360, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              rotate: { duration: 50, repeat: Infinity, ease: "linear" },
              scale: { duration: 18, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Center Pulse Orb */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, hsl(var(--accent) / 0.05) 40%, transparent 70%)",
              willChange: "transform, opacity",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Floating Light Streaks */}
          <motion.div
            className="absolute top-1/4 left-1/3 w-[400px] h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded-full"
            style={{ filter: "blur(1px)" }}
            animate={{
              x: [-200, 200, -200],
              opacity: [0, 1, 0],
              scaleX: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/4 w-[300px] h-[2px] bg-gradient-to-r from-transparent via-accent/25 to-transparent rounded-full"
            style={{ filter: "blur(1px)" }}
            animate={{
              x: [150, -150, 150],
              opacity: [0, 0.8, 0],
              scaleX: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          {/* Floating Geometric Shapes */}
          <motion.div
            className="absolute top-20 left-[15%] w-24 h-24 border border-primary/15 rounded-3xl backdrop-blur-sm"
            animate={{ 
              rotate: [0, 90, 180, 270, 360], 
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ 
              rotate: { duration: 30, repeat: Infinity, ease: "linear" },
              y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          <motion.div
            className="absolute bottom-24 right-[18%] w-20 h-20 border border-accent/15 rounded-full"
            animate={{ 
              rotate: [360, 0],
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{ 
              rotate: { duration: 25, repeat: Infinity, ease: "linear" },
              scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          <motion.div
            className="absolute top-1/3 right-[8%] w-16 h-16 bg-gradient-to-br from-primary/8 to-accent/8 rounded-2xl backdrop-blur-sm"
            animate={{ 
              rotate: [0, 180, 360],
              x: [0, 40, 0],
              y: [0, -20, 0],
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/4 left-[12%] w-14 h-14 border border-primary/10 rounded-xl"
            animate={{ 
              rotate: [45, 135, 225, 315, 405],
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 7, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Floating Particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-primary/20"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                willChange: "transform, opacity",
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, Math.random() > 0.5 ? 20 : -20, 0],
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 6 + Math.random() * 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5,
              }}
            />
          ))}

          {/* Gradient Noise Overlay */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center max-w-7xl mx-auto">
            {/* Right: Copy & CTAs */}
            <motion.div
              className="text-center lg:text-right order-2 lg:order-1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-l from-primary/10 to-accent/10 border border-primary/20 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                </span>
                <span className="text-sm font-semibold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                  {getCMSContent(cmsSections, "hero_badge") || "منصة الخدمات المُدارة الأولى في مصر"}
                </span>
                <Sparkles className="w-4 h-4 text-primary" />
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-8 leading-[1.1]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <span className="block mb-2">
                  مش منصة فريلانسرز
                </span>
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-l from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift bg-clip-text text-transparent">
                    دي منظومة شغل كاملة
                  </span>
                  <motion.span
                    className="absolute -inset-1 bg-gradient-to-l from-primary/20 to-accent/20 blur-2xl rounded-lg"
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </span>
              </motion.h1>

              {/* Subtitle with styled keywords */}
              <motion.p
                className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {getCMSContent(cmsSections, "hero_subtitle") || (
                  <>
                    هنا <span className="text-destructive font-semibold">مفيش مزايدات</span>،{" "}
                    <span className="text-destructive font-semibold">مفيش عروض بالكوم</span>،{" "}
                    و<span className="text-destructive font-semibold">مفيش صداع</span>. إنت تبعت طلبك، وإحنا نختار الفريق المناسب، وتستلم{" "}
                    <span className="text-primary font-semibold">شغل بجودة مضمونة</span>.
                  </>
                )}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  size="lg"
                  className="group relative text-lg px-10 py-7 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                  asChild
                >
                  <Link to="/register" className="flex items-center gap-3">
                    <span className="absolute inset-0 bg-gradient-to-l from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift" />
                    <span className="relative flex items-center gap-3 text-primary-foreground">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <Zap className="w-5 h-5" />
                      </span>
                      <span className="font-bold">اطلب خدمتك الآن</span>
                      <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-2" />
                    </span>
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="group text-lg px-10 py-7 rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-500 hover:-translate-y-1 backdrop-blur-sm"
                  asChild
                >
                  <Link to="/freelancer-register" className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                      <Users className="w-5 h-5 text-primary" />
                    </span>
                    <span className="font-bold">انضم كفريلانسر</span>
                    <ArrowUpRight className="w-5 h-5 text-primary transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                className="flex flex-wrap items-center gap-6 justify-center lg:justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {[
                  { icon: Shield, text: "جودة مضمونة" },
                  { icon: Clock, text: "تسليم سريع" },
                  { icon: Star, text: "خبراء معتمدين" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Left: Visual Preview Card */}
            <motion.div
              className="order-1 lg:order-2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative">
                {/* Main Card */}
                <motion.div
                  className="relative rounded-3xl overflow-hidden"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Gradient Border Effect */}
                  <div className="absolute -inset-[2px] bg-gradient-to-br from-primary via-accent to-primary rounded-3xl opacity-70 blur-sm" />
                  
                  <div className="relative bg-card/95 backdrop-blur-xl rounded-3xl p-8 border border-border/50">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-foreground">لوحة تحكم {siteName}</span>
                          <p className="text-xs text-muted-foreground">نظرة سريعة</p>
                        </div>
                      </div>
                      <span className="px-4 py-1.5 rounded-full bg-success/10 text-success text-xs font-bold border border-success/20">
                        ● تجربة فعلية
                      </span>
                    </div>

                    {/* Workflow Steps */}
                    <div className="space-y-4">
                      {/* Step 1 */}
                      <motion.div
                        className="group relative p-5 rounded-2xl bg-gradient-to-l from-primary/5 to-transparent border border-primary/20 hover:border-primary/40 transition-all duration-300"
                        whileHover={{ x: -5 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground mb-1">عميل يرسل طلباً جديداً</p>
                            <p className="text-xs text-muted-foreground">وصف، ملفات، أولويات التسليم</p>
                          </div>
                          <div className="text-left">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              <Clock className="w-3 h-3" />
                              00:02
                            </span>
                          </div>
                        </div>
                        {/* Connector Line */}
                        <div className="absolute left-6 top-full h-4 w-0.5 bg-gradient-to-b from-primary/30 to-transparent" />
                      </motion.div>

                      {/* Step 2 */}
                      <motion.div
                        className="group relative p-5 rounded-2xl bg-gradient-to-l from-accent/5 to-transparent border border-accent/20 hover:border-accent/40 transition-all duration-300"
                        whileHover={{ x: -5 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6 text-accent" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground mb-1">المنصة تعيّن أفضل فريق</p>
                            <p className="text-xs text-muted-foreground">اختيار تلقائي حسب التخصص والمستوى</p>
                          </div>
                          <div className="text-left">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold">
                              <Users className="w-3 h-3" />
                              +3 خبراء
                            </span>
                          </div>
                        </div>
                        <div className="absolute left-6 top-full h-4 w-0.5 bg-gradient-to-b from-accent/30 to-transparent" />
                      </motion.div>

                      {/* Step 3 */}
                      <motion.div
                        className="group p-5 rounded-2xl bg-gradient-to-l from-success/5 to-transparent border border-success/20 hover:border-success/40 transition-all duration-300"
                        whileHover={{ x: -5 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-foreground mb-1">تسليم مع مراجعة جودة</p>
                            <p className="text-xs text-muted-foreground">مراجعة داخلية قبل وصول الشغل للعميل</p>
                          </div>
                          <div className="text-left">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold">
                              <Star className="w-3 h-3" />
                              4.9
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-8 grid grid-cols-3 gap-4">
                      {[
                        { value: `${platformStats?.totalProjects || 1}+`, label: "مشروع", icon: Target },
                        { value: `${platformStats?.totalFreelancers || 2}+`, label: "خبير معتمد", icon: Award },
                        { value: "24h", label: "متوسط تسليم", icon: Clock },
                      ].map((stat, i) => (
                        <motion.div
                          key={i}
                          className="relative p-4 rounded-2xl bg-muted/50 border border-border/50 text-center group hover:border-primary/30 transition-all duration-300"
                          whileHover={{ y: -3 }}
                        >
                          <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                          <p className="text-xl font-black text-foreground">{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Floating Elements */}
                <motion.div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 blur-2xl"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-gradient-to-tr from-accent/25 to-primary/15 blur-2xl"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                />

                {/* Decorative Badge */}
                <motion.div
                  className="absolute -top-4 left-8 px-4 py-2 rounded-full bg-card border border-border shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    <span className="text-xs font-bold text-foreground">أسرع منصة في مصر</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">اكتشف المزيد</span>
            <ChevronDown className="w-6 h-6 text-primary" />
          </div>
        </motion.div>
      </section>

      {/* Problem Section - Enhanced */}
      <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
          <div className="absolute -top-32 -right-10 w-72 h-72 rounded-3xl bg-destructive/15 blur-3xl" />
          <div className="absolute -bottom-40 -left-10 w-80 h-80 rounded-3xl bg-primary/5 blur-3xl" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive mb-4">
              <span className="text-xl">💡</span>
              <span className="text-sm font-medium">
                {getCMSTitle(cmsSections, "problem_badge") || "المشكلة"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
              {getCMSTitle(cmsSections, "problem_title") || "المشكلة اللي كل السوق بيعاني منها"}
            </h2>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg">
              من ناحية العميل ومن ناحية الفريلانسر.. نفس الوجع، بأشكال مختلفة.
            </p>
          </div>
          
          {/* Two problem cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Client Problems */}
            <div className="group relative p-8 rounded-3xl bg-card/95 border border-border/60 hover:border-destructive/40 transition-all duration-500 overflow-hidden hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-background opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -top-10 -left-4 text-7xl font-black text-destructive/5 select-none">
                عميل
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-primary" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                    للعميل
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">إيه اللي بيوجّع العميل؟</h3>
                <ul className="space-y-3">
                  {[
                    "محتار بين مئات العروض والأسعار",
                    "جودة مش مضمونة ومفيش معيار",
                    "تفاوض وتضييع وقت ومجهود",
                    "مفيش حد مسؤول غيرك لو حصلت مشكلة",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-muted-foreground group-hover:text-foreground/90 transition-colors"
                    >
                      <span className="mt-1 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse-soft" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Freelancer Problems */}
            <div className="group relative p-8 rounded-3xl bg-card/95 border border-border/60 hover:border-destructive/40 transition-all duration-500 overflow-hidden hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/8 via-transparent to-background opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -top-10 -left-6 text-7xl font-black text-destructive/5 select-none">
                فريلانسر
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-accent" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30">
                    للفريلانسر
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">وإيه اللي بيوجّع الفريلانسر؟</h3>
                <ul className="space-y-3">
                  {[
                    "عروض كتير بدون رد ولا نتيجة",
                    "ضغط أسعار واستغلال مستمر",
                    "شغل عشوائي ومفيش استقرار",
                    "مفيش تطوير حقيقي لمستواك",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-muted-foreground group-hover:text-foreground/90 transition-colors"
                    >
                      <span className="mt-1 w-2.5 h-2.5 rounded-full bg-destructive/80 animate-pulse-soft" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Closing line */}
          <div className="text-center mt-16">
            <p className="inline-flex items-center gap-3 text-xl sm:text-2xl font-bold text-primary animate-bounce-subtle">
              <Sparkles className="w-6 h-6" />
              وده بالظبط اللي قررنا نغيره
              <span className="text-2xl">🚀</span>
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section - Enhanced */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
        {/* Background accents */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.06),transparent_55%)]" />
          <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-3xl bg-success/10 blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success mb-4">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">
                {getCMSTitle(cmsSections, "solution_badge") || "الحل"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
              {getCMSTitle(cmsSections, "solution_title") || (
                <>
                  منصة بتشتغل <span className="text-primary">بعقل</span> مش بعشوائية
                </>
              )}
            </h2>
            <p className="text-lg text-muted-foreground">
              {getCMSContent(cmsSections, "solution_subtitle") || "إحنا عملنا إيه مختلف؟"}
            </p>
          </div>
          
          {/* Three pillars */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {[
              {
                icon: "👍",
                title: "العميل ما بيستقبلش عروض",
                description: "إنت بتطلب، وإحنا بنختار الأنسب ليك من فريق معتمد ومختبر.",
                gradient: "from-primary/25 to-primary/5",
              },
              {
                icon: "✅",
                title: "الفريلانسر ما بيقدّمش على شغل",
                description: "الشغل بييجي له على حسب مستواه وتخصصه وتقييماته.",
                gradient: "from-accent/25 to-accent/5",
              },
              {
                icon: "📈",
                title: "المنصة هي اللي بتدير كل حاجة",
                description: "من استلام الطلب لحد التسليم النهائي ومتابعة الجودة.",
                gradient: "from-sity-indigo/25 to-sity-indigo/5",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative h-full p-8 rounded-3xl bg-card/95 border border-border/60 hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-glow overflow-hidden"
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div
                  className={cn(
                    "absolute inset-0 rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    item.gradient,
                  )}
                />
                <div className="relative flex flex-col gap-4">
                  <span className="text-5xl mb-2 block group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </span>
                  <h3 className="text-xl font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground mb-3">{item.description}</p>
                  <div className="mt-auto pt-2 text-xs text-muted-foreground/80 border-t border-border/40">
                    {item.title.includes("العميل") && (
                      <p>مفيش مزايدات، مفيش وجع دماغ، طلب واحد واضح والمنصة تدير الباقي.</p>
                    )}
                    {item.title.includes("الفريلانسر") && (
                      <p>مفيش سيل عروض، الشغل المناسب يوصل للفريلانسر المناسب تلقائيًا.</p>
                    )}
                    {item.title.includes("تدير كل حاجة") && (
                      <p>سير عمل واضح: استلام، تنفيذ، مراجعة جودة، تسليم… في سيستم واحد.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Process Flow */}
          <div className="relative max-w-4xl mx-auto p-8 lg:p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/25 overflow-hidden">
            <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.16),transparent_70%)]" />
            <div className="relative text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6">رحلة طلبك معانا</h3>
              <div className="flex flex-wrap justify-center items-center gap-4 text-sm sm:text-lg">
                {["تراجع الطلب", "تظبطه", "توزعه للأنسب", "تراجع الجودة", "تسلم النتيجة"].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-xl bg-card/85 backdrop-blur-sm border border-border/50 text-foreground font-medium hover:border-primary/60 transition-colors">
                      {step}
                    </span>
                    {i < 4 && <ArrowLeft className="w-5 h-5 text-primary hidden sm:block" />}
                  </div>
                ))}
              </div>
              <p className="text-lg text-primary font-semibold mt-8">
                إنت تركّز في اللي بتعرف تعمله… والباقي علينا ✨
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Comparison */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-destructive/0 via-destructive/40 to-primary/0" />
          <div className="absolute -top-40 -left-10 w-72 h-72 rounded-full bg-gradient-to-br from-destructive/20 via-background to-muted blur-3xl" />
          <div className="absolute -bottom-40 -right-10 w-80 h-80 rounded-full bg-gradient-to-tl from-primary/25 via-accent/20 to-background blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 text-sm font-medium">
              المقارنة الحقيقية
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
              من فوضى السوق التقليدي إلى منصة مُدارة بالكامل
            </h2>
            <p className="text-lg text-muted-foreground">
              شوف الفرق بعينك بين الطريقة القديمة اللي بتستهلك وقتك وأعصابك، والطريقة الذكية اللي بتقدمها {siteName}.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-stretch">
            {/* Before - المشكلة */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative rounded-3xl border border-destructive/30 bg-destructive/5 overflow-hidden shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-destructive/10 to-transparent" />
              <div className="relative h-56 sm:h-72 overflow-hidden">
                <img
                  src={freelancerHero1}
                  alt="فريلانسر يعمل في جو غير منظم يمثل مشكلة السوق التقليدي"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="relative p-6 sm:p-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-2">
                  السوق التقليدي
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">المشكلة</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  عشوائية، تفاوض لا ينتهي، ومفيش حد مسؤول عن الجودة ولا عن حماية العميل أو الفريلانسر.
                </p>
                <ul className="space-y-2 text-sm sm:text-base">
                  {[
                    "تضيع وقت بين العروض والأسعار المتفاوتة",
                    "جودة غير مستقرة ومفيش معيار تقييم حقيقي",
                    "مفيش إدارة مركزية ولا متابعة بعد التسليم",
                    "توتر مستمر بين العميل والفريلانسر عند أي مشكلة",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-destructive font-medium/">
                      <span className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center text-[11px] text-destructive">✕</span>
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* After - الحل */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-background to-accent/20 overflow-hidden shadow-glow"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,hsl(var(--primary)/0.25),transparent_55%),radial-gradient(circle_at_100%_100%,hsl(var(--accent)/0.2),transparent_55%)]" />
              <div className="relative h-56 sm:h-72 overflow-hidden">
                <img
                  src={freelancerHero2}
                  alt="فريلانسر يعمل في بيئة منظمة تمثل حل المنصة"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="relative p-6 sm:p-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold mb-2">
                  مع {siteName}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">الحل</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  منصة خدمات مُدارة بالكامل؛ إحنا اللي بندير الطلب، نختار الأنسب، نراجع الجودة، ونحمي الطرفين.
                </p>
                <ul className="space-y-2 text-sm sm:text-base">
                  {[
                    "طلب واحد واضح.. والمنصة تتولى الباقي",
                    "اختيار فريلانسر مناسب بناءً على مستوى وأداء حقيقي",
                    "نظام مراجعة جودة (QC) وتعديلات مضمونة",
                    "تجربة هادئة ومنظمة للعميل والفريلانسر معاً",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center text-[11px] text-primary-foreground">✓</span>
                      <span className="text-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Enhanced */}
      <section className="py-24 lg:py-32 bg-muted/40 relative overflow-hidden">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-px bg-gradient-to-l from-primary/0 via-primary/40 to-primary/0" />
          <div className="absolute -top-24 right-6 w-40 h-40 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 blur-2xl" />
          <div className="absolute -bottom-24 left-0 w-48 h-48 rounded-3xl bg-gradient-to-tr from-background to-primary/20 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 shadow-sm shadow-primary/20">
              <span className="text-xl">🧩</span>
              <span className="text-sm font-medium">كيف نعمل</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-3">
              3 خطوات بسيطة
            </h2>
            <p className="text-lg text-muted-foreground flex flex-col gap-1 md:flex-row md:items-center md:justify-center">
              <span>من الفكرة للتسليم.. من غير صداع</span>
              <span className="hidden md:inline-block w-px h-4 bg-border mx-3" />
              <span className="inline-flex items-center gap-2 text-sm md:text-base text-destructive">
                <span className="text-base">💡</span>
                <span>المشكلة اللي كل السوق بيعاني منها: للعميل</span>
              </span>
            </p>
          </div>

          {/* Steps */}
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  number: "01", 
                  title: "العميل يبعِت طلبه", 
                  description: "يكتب اللي محتاجه، يرفع الملفات، ويحدد المطلوب بالتفصيل.",
                  icon: MessageSquare,
                  color: "primary"
                },
                { 
                  number: "02", 
                  title: "نوزّع الشغل بذكاء", 
                  description: "الطلب بيروح لفريلانسر مناسب حسب التخصص والمستوى والأداء.",
                  icon: Zap,
                  color: "accent"
                },
                { 
                  number: "03", 
                  title: "تسليم بجودة مضمونة", 
                  description: "مراجعة جودة (QC) + تعديلات + تسليم في الوقت المتفق عليه.",
                  icon: Award,
                  color: "success"
                }
              ].map((step, i) => (
                <div key={i} className="group relative animate-enter" style={{ animationDelay: `${i * 0.12}s` }}>
                  {/* Connector Line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-l from-primary/50 to-transparent -translate-x-1/2 z-0" />
                  )}
                  
                  <div className="relative h-full p-8 rounded-3xl bg-card/95 border border-border/60 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-glow z-10 overflow-hidden">
                    {/* Big ghost number */}
                    <div className="absolute -top-6 -left-2 text-7xl font-black text-muted-foreground/5 select-none">
                      {step.number}
                    </div>

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-background to-accent/5" />

                    <div className="relative pt-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                            step.color === "primary" && "bg-primary/10",
                            step.color === "accent" && "bg-accent/10",
                            step.color === "success" && "bg-success/10"
                          )}
                        >
                          <step.icon
                            className={cn(
                              "w-7 h-7",
                              step.color === "primary" && "text-primary",
                              step.color === "accent" && "text-accent",
                              step.color === "success" && "text-success"
                            )}
                          />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/20">
                          خطوة {step.number}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground leading-relaxed mb-3">{step.description}</p>
                        <ul className="text-sm text-muted-foreground/90 space-y-1">
                          {step.number === "01" && [
                            "محتار بين مئات العروض والأسعار؟ هنا مفيش عروض، فيه طلب واحد واضح.",
                            "بتكتب المطلوب مرة واحدة والمنصة هي اللي تدير الباقي."
                          ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                          {step.number === "02" && [
                            "جودة مش مضمونة ومفيش معيار؟ إحنا بنختار خبير بمستوى متجرب.",
                            "مفيش تفاوض ولا تضييع وقت، النظام هو اللي يوزّع الشغل."
                          ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent" />
                              <span>{item}</span>
                            </li>
                          ))}
                          {step.number === "03" && [
                            "مفيش حد مسؤول غيرك لو حصلت مشكلة؟ هنا في فريق جودة مسؤول.",
                            "مراجعة، تعديلات، وتسليم منظم… وأنت مرتاح."
                          ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-success" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {categories.length > 0 && (
        <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {getCMSTitle(cmsSections, "services_badge") || "خدماتنا"}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                {getCMSTitle(cmsSections, "services_title") || "خدمات متنوعة تغطي احتياجاتك"}
              </h2>
              <p className="text-lg text-muted-foreground">
                {getCMSContent(cmsSections, "services_subtitle") || "اختر الخدمة المناسبة ليك"}
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {categories.slice(0, 8).map((category: any, index) => (
                <div
                  key={category.id}
                  className="group relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 cursor-pointer"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <span className="text-4xl block mb-4 group-hover:scale-110 transition-transform duration-300">
                      {emojiMap[category.icon] || "🎯"}
                    </span>
                    <h3 className="text-lg font-bold text-foreground mb-2">{category.name_ar || category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description || "خدمات احترافية بجودة عالية"}</p>
                    <ArrowUpRight className="absolute top-4 left-4 w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Button size="lg" variant="outline" className="rounded-2xl" asChild>
                <Link to="/services">
                  عرض جميع الخدمات
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Why Freelancers Section - Enhanced */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.08),transparent_55%)]" />
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_minmax(0,1fr)] gap-10 items-center">
            {/* Copy & bullets */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 text-sm font-medium mb-4">
                <span className="text-lg">👨‍💻</span>
                <span>للفريلانسر المحترف</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                ليه الفريلانسر يختارنا؟
              </h2>
              <p className="text-base sm:text-lg text-white/80 mb-8 max-w-xl">
                لو زهقت من الجري ورا الشغل والعروض اللي ما بتكملش، هنا الشغل هو اللي بيجيلك، بنظام واضح يحترم وقتك ومجهودك.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {[ 
                  "شغل جاهز يوصلك", 
                  "مفيش عروض ولا تفاوض", 
                  "تقييمك على شغلك مش كلامك", 
                  "نظام عادل وواضح", 
                  "دخل مستقر أكتر", 
                  "حماية من العملاء غير الجادين" 
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                    <span className="text-sm sm:text-base font-medium text-white/95">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-2xl sm:text-3xl font-bold text-white mb-6">
                والأهم؟ إنت بتكبر مش بس بتشتغل 🚀
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" variant="secondary" className="rounded-2xl text-lg px-8" asChild>
                  <Link to="/freelancer-register">
                    انضم لفريقنا الآن
                    <ArrowLeft className="w-5 h-5 mr-2" />
                  </Link>
                </Button>
                <span className="text-sm text-white/70">
                  أماكن محدودة للفريلانسرز الملتزمين والجاديين.
                </span>
              </div>
            </div>

            {/* Visual card */}
            <div className="relative hidden md:block">
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-3xl bg-white/20 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-3xl bg-black/20 blur-2xl" />

              <div className="relative rounded-3xl bg-black/40 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-white/60 mb-1">لوحة تحكم الفريلانسر</p>
                    <p className="text-sm font-semibold text-white">إحصائيات الشهر</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-medium">
                    شغال معنا
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-lg font-bold text-white">+8</p>
                    <p className="text-white/70 mt-1">مهام مكتملة</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-lg font-bold text-white">4.9</p>
                    <p className="text-white/70 mt-1">تقييم العملاء</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-lg font-bold text-white">+3</p>
                    <p className="text-white/70 mt-1">مشاريع مكررة</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-white/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      متفرغ للشغل
                    </span>
                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px]">متاح لطلبات جديدة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-300" />
                      تدريب مستمر
                    </span>
                    <span>+12 ساعة هذا الشهر</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-300" />
                      مكافآت الأداء
                    </span>
                    <span>مفعّلة</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sity Expert Studio - Enhanced */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_hsl(var(--accent)/0.18),transparent_70%)]" />
          <div className="absolute -bottom-40 right-0 w-80 h-80 rounded-3xl bg-primary/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] gap-10 items-center">
            {/* Copy side */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-4">
                <span className="text-xl">👑</span>
                <span className="text-sm font-medium">الفرق الحقيقي</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 leading-tight">
                🎓 {siteName} Studio
              </h2>
              <p className="text-lg text-muted-foreground mb-8">مش مجرد منصة شغل</p>

              <div className="space-y-4 mb-8">
                <h3 className="text-2xl font-bold text-foreground">استوديو تدريبي متكامل للفريلانسرز:</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    "كورسات قوية في كل التخصصات",
                    "تدريب عملي على شغل حقيقي",
                    "تطوير مستواك خطوة بخطوة",
                    "متابعة وتقييم مستمر",
                    "شغل مدفوع أثناء التعلم",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-foreground">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm sm:text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 text-center">
                <div className="flex flex-wrap justify-center items-center gap-3 text-xl sm:text-2xl font-bold text-foreground">
                  {["بتتعلم", "بتطبّق", "بتكسب", "بتترقّى"].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-primary">{step}</span>
                      {i < 3 && <span className="text-accent">←</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual side */}
            <div className="relative">
              <div className="absolute -top-6 -right-4 w-36 h-36 rounded-3xl bg-primary/15 blur-2xl" />
              <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-3xl bg-accent/15 blur-2xl" />

              <div className="relative rounded-3xl bg-card border border-border/60 shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-border/50 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">لوحة تقدمك في {siteName} Studio</p>
                    <p className="text-sm font-semibold text-foreground">خريطة رحلتك</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    بتترقّى فعلًا
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>المسار التدريبي</span>
                      <span>75% مكتمل</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-accent" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-2xl bg-muted/60 border border-border/60">
                      <p className="text-foreground font-semibold mb-1">المستوى الحالي</p>
                      <p className="text-primary font-bold text-lg">Advanced</p>
                      <p className="text-muted-foreground mt-1">بعد 3 مسارات مكتملة</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-muted/60 border border-border/60">
                      <p className="text-foreground font-semibold mb-1">شغل مدفوع</p>
                      <p className="text-primary font-bold text-lg">3 مهام</p>
                      <p className="text-muted-foreground mt-1">أثناء التدريب</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        جلسات مراجعة
                      </span>
                      <span className="text-muted-foreground">أسبوعية</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        تقييم مهاري
                      </span>
                      <span className="text-muted-foreground">بعد كل مشروع</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        فرص ترقّي
                      </span>
                      <span className="text-muted-foreground">مرتبطة بالأداء</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Clients Trust Us - Enhanced */}
      <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),transparent_70%)]" />
          <div className="absolute -bottom-40 left-0 w-72 h-72 rounded-3xl bg-primary/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">
                {getCMSTitle(cmsSections, "trust_badge") || "لماذا نحن"}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
              {getCMSTitle(cmsSections, "trust_title") || "ليه العميل يثق فينا؟"}
            </h2>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg">
              مش بس خدمة.. منظومة كاملة بتحمي وقتك وفلوسك وجودة شغلك.
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[ 
              { emoji: "✅", title: "جودة مضمونة", description: "كل شغل بيتراجع قبل التسليم" },
              { emoji: "⏰", title: "التزام بالمواعيد", description: "نضمن التسليم في الوقت" },
              { emoji: "🔄", title: "تعديلات مجانية", description: "حسب باقتك لحد ما ترضى" },
              { emoji: "💬", title: "دعم مستمر", description: "فريق متاح لمساعدتك" },
            ].map((reason, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-card/95 border border-border/60 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow text-center overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 via-background to-accent/5" />
                <div className="relative flex flex-col items-center gap-3">
                  <span className="text-4xl mb-1 group-hover:scale-110 transition-transform duration-300">{reason.emoji}</span>
                  <h3 className="text-lg font-bold text-foreground mb-1">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{reason.description}</p>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 border border-border/60 rounded-full px-3 py-1">
                    سبب اختيار العملاء لــ {siteName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials - Enhanced Carousel */}
      {testimonials.length > 0 && (
        <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),transparent_70%)]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">آراء العملاء</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                ماذا يقول عملاؤنا
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                شهادات حقيقية من عملاء جربوا {siteName} في مشاريع مختلفة.
              </p>
            </div>
            
            <div className="max-w-5xl mx-auto relative">
              <Carousel
                opts={{ align: "start", loop: true }}
                className="w-full"
              >
                <CarouselContent>
                  {testimonials.map((testimonial: any) => (
                    <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                      <div className="h-full">
                        <div
                          className="group relative h-full p-8 rounded-3xl bg-card/95 border border-border/60 hover:border-primary/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow overflow-hidden"
                        >
                          <div className="absolute -top-6 -left-4 text-7xl font-black text-primary/5 select-none">
                            “
                          </div>
                          <div className="relative flex flex-col h-full">
                            <div className="flex gap-1 mb-4">
                              {[...Array(testimonial.rating || 5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                              ))}
                            </div>
                            <p className="mb-6 text-muted-foreground leading-relaxed">
                              "{testimonial.content}"
                            </p>
                            <div className="mt-auto pt-4 border-t border-border/40 flex items-center gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold" />
                                <div className="absolute inset-0 rounded-full border border-primary/50" />
                                <span className="sr-only">Avatar</span>
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{testimonial.name}</p>
                                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex bg-background/90 border-border/60" />
                <CarouselNext className="hidden md:flex bg-background/90 border-border/60" />
              </Carousel>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section - Enhanced */}
      {dbPlans.length > 0 && (
        <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),transparent_70%)]" />
            <div className="absolute -bottom-40 right-0 w-72 h-72 rounded-3xl bg-primary/15 blur-3xl pulse" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-10 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">الباقات</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                باقات تناسب احتياجاتك
              </h2>
              <p className="text-lg text-muted-foreground">
                اختر الباقة الأنسب لحجم الشغل وطبيعة احتياجك.. تقدر تبدأ صغير وتكبر وقت ما تحب.
              </p>
            </div>

            {/* Small legend row */}
            <div className="max-w-4xl mx-auto mb-8 flex flex-wrap justify-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-background/80 border border-border/60 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                الأفضل للتشغيل المستمر
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-background/80 border border-border/60 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-accent" />
                مناسب للتجربة والبدء
              </span>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
              {dbPlans.slice(0, 3).map((plan: any, index) => {
                const isFeatured = index === 1;
                const isFree = plan.price === 0;
                return (
                  <div 
                    key={plan.id}
                    className={cn(
                      "relative h-full p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-2 overflow-hidden",
                      isFeatured
                        ? "bg-gradient-to-b from-primary to-primary/90 text-white border-primary shadow-glow scale-105"
                        : "bg-card border-border/50 hover:border-primary/30"
                    )}
                  >
                    {isFeatured && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-white text-sm font-medium shadow-sm">
                        الأكثر طلباً
                      </div>
                    )}

                    {!isFeatured && isFree && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-background text-primary text-xs font-semibold border border-primary/40">
                        ممتاز للبداية
                      </div>
                    )}
                    
                    <h3 className={cn("text-2xl font-bold mb-2", isFeatured ? "text-white" : "text-foreground")}>
                      {plan.name_ar || plan.name}
                    </h3>
                    
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className={cn("text-4xl font-bold", isFeatured ? "text-white" : "text-foreground")}>
                        {isFree ? "مجاناً" : `${plan.price}`}
                      </span>
                      {!isFree && (
                        <span className={cn("text-sm", isFeatured ? "text-white/80" : "text-muted-foreground")}>ج.م/شهر</span>
                      )}
                    </div>

                    <p className={cn("text-xs font-medium mb-4", isFeatured ? "text-white/80" : "text-muted-foreground/90")}>
                      {isFree ? "ابدأ بدون التزام وجرب الخدمة" : "مناسب للأعمال اللي شغلها مستمر"}
                    </p>
                    
                    <ul className="space-y-3 mb-8 text-sm">
                      {[
                        `${plan.credits_per_month} كريديت شهرياً`,
                        `${plan.revisions_limit} تعديل مجاني`,
                        plan.priority_assignment ? "أولوية في التعيين" : "تعيين عادي",
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className={cn("w-5 h-5 shrink-0", isFeatured ? "text-white" : "text-primary")} />
                          <span className={isFeatured ? "text-white/90" : "text-muted-foreground"}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={cn(
                        "w-full rounded-xl",
                        isFeatured ? "bg-white text-primary hover:bg-white/90" : ""
                      )}
                      variant={isFeatured ? "secondary" : "default"}
                      asChild
                    >
                      <Link to="/register">
                        ابدأ الآن
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 -top-40 h-72 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.35),transparent_60%)]" />
          <div className="absolute -bottom-32 left-12 w-64 h-64 rounded-full bg-gradient-to-tr from-accent/20 via-primary/15 to-background blur-3xl" />
          <div className="absolute -bottom-40 right-0 w-80 h-80 rounded-full bg-gradient-to-tl from-primary/25 via-muted to-background blur-3xl" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6 border border-primary/30 backdrop-blur-sm">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                🚀
              </span>
              <span className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase">
                Ready to start
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 leading-tight">
              جاهز تبدأ؟
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              انضم لآلاف العملاء والفريلانسرز اللي بيثقوا في {siteName} عشان ينجزوا شغلهم بأعلى جودة وفي أقل وقت.
            </p>
            
            <div className="inline-flex flex-col sm:flex-row gap-4 justify-center items-stretch bg-card/60 border border-border/70 rounded-full px-3 py-3 sm:px-4 sm:py-4 backdrop-blur-xl shadow-glow max-w-xl mx-auto">
              <Button
                size="lg"
                className="group flex-1 rounded-full text-base sm:text-lg px-8 py-5 bg-gradient-to-l from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift text-primary-foreground shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] border border-primary/60"
                asChild
              >
                <Link to="/register" className="flex items-center justify-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/10 border border-primary/40">
                    <Zap className="w-4 h-4" />
                  </span>
                  <span className="font-semibold tracking-tight">ابدأ كعميل</span>
                </Link>
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="group flex-1 rounded-full text-base sm:text-lg px-8 py-5 border border-border/70 hover:border-primary/70 hover:bg-primary/5 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
                asChild
              >
                <Link to="/freelancer-register" className="flex items-center justify-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 border border-primary/30">
                    <Users className="w-4 h-4 text-primary" />
                  </span>
                  <span className="font-semibold tracking-tight">انضم كفريلانسر</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <DynamicFooter />
    </div>
  );
}
