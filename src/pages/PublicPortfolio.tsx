import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DynamicNavbar } from "@/components/layout/DynamicNavbar";
import { DynamicFooter } from "@/components/layout/DynamicFooter";
import {
  Star,
  CheckCircle2,
  Briefcase,
  Clock,
  Calendar as CalendarIcon,
  ExternalLink,
  Mail,
  Phone,
  Github,
  Linkedin,
  Shield,
  TrendingUp,
  Sparkles,
  Layers3,
  ArrowUpRight,
  Image as ImageIcon,
  ShoppingBag,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ServiceDetailsDialog } from "@/components/portfolio/ServiceDetailsDialog";
import { ProjectDetailsDialog } from "@/components/portfolio/ProjectDetailsDialog";
import { EditorialSectionHeader } from "@/components/ui/EditorialSectionHeader";

export default function PublicPortfolio() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const detailsOpen = !!selectedService;
  const projectDetailsOpen = !!selectedProject;

  const fixedAgreementSummary = useMemo(() => {
    if (!selectedService) return null;
    return {
      title: selectedService.title,
      price: Number(selectedService.price_egp || 0),
      days: selectedService.estimated_days,
    };
  }, [selectedService]);

  const heroParticles = useMemo(() => {
    return Array.from({ length: 18 }).map(() => {
      const size = 1 + Math.random() * 2;
      return {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: `${size}px`,
        delay: `${Math.random() * 5}s`,
        duration: `${7 + Math.random() * 6}s`,
        opacity: 0.12 + Math.random() * 0.18,
      };
    });
  }, []);

  // Fetch public portfolio page (portfolio + safe freelancer fields)
  const { data: pageData, isLoading } = useQuery({
    queryKey: ["public-portfolio-page", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Missing slug");

      const { data, error } = await (supabase as any).rpc("get_public_portfolio_page", {
        p_slug: slug,
      });

      if (error) throw error;
      if (data) return { ...(data as any), redirectTo: null as string | null };

      // Not found: try resolve old slug -> new slug (redirect)
      const { data: resolved, error: resolveError } = await (supabase as any).rpc(
        "resolve_portfolio_slug",
        { p_slug: slug }
      );
      if (resolveError) throw resolveError;

      const resolvedSlug = typeof resolved === "string" ? resolved : null;
      if (!resolvedSlug || resolvedSlug === slug) {
        throw new Error("Portfolio not found");
      }

      const { data: redirectedData, error: redirectedError } = await (supabase as any).rpc(
        "get_public_portfolio_page",
        { p_slug: resolvedSlug }
      );

      if (redirectedError) throw redirectedError;
      if (!redirectedData) throw new Error("Portfolio not found");

      return { ...(redirectedData as any), redirectTo: resolvedSlug };
    },
    enabled: !!slug,
  });

  // If slug changed, redirect while keeping old link working
  useEffect(() => {
    if (!pageData?.redirectTo) return;
    navigate(`/u/${pageData.redirectTo}`, { replace: true });
  }, [pageData?.redirectTo, navigate]);

  const portfolio = pageData?.portfolio;
  const freelancer = pageData?.freelancer;

  // Primary specialization label (category)
  const freelancerProfileForPublic = (freelancer as any)?.freelancer;
  const initialCategoryId = Array.isArray((freelancerProfileForPublic as any)?.categories)
    ? (freelancerProfileForPublic as any).categories[0]
    : null;

  // In some deployments, the public RPC may not include `categories` in the freelancer payload.
  // Fallback: fetch it from freelancer_profiles by portfolio.user_id.
  const { data: fallbackCategories } = useQuery({
    queryKey: ["public-portfolio-fallback-categories", portfolio?.user_id],
    queryFn: async () => {
      if (!portfolio?.user_id) return null;
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("categories")
        .eq("user_id", portfolio.user_id)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.categories || null;
    },
    enabled: !!portfolio?.user_id && !initialCategoryId,
  });

  const categoryId =
    initialCategoryId ||
    (Array.isArray(fallbackCategories) && fallbackCategories.length > 0
      ? fallbackCategories[0]
      : null);

  const { data: primaryCategory } = useQuery({
    queryKey: ["public-portfolio-primary-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, name_ar")
        .eq("id", categoryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  const isUuidLike = (value: unknown) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

  const categoryLabelFallback =
    categoryId && typeof categoryId === "string" && !isUuidLike(categoryId) ? categoryId : null;

  const primaryCategoryLabel =
    (primaryCategory as any)?.name_ar || (primaryCategory as any)?.name || categoryLabelFallback;

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["public-projects", portfolio?.user_id],
    queryFn: async () => {
      if (!portfolio?.user_id) return [];

      const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .eq("freelancer_id", portfolio.user_id)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!portfolio?.user_id,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["public-services", portfolio?.user_id],
    queryFn: async () => {
      if (!portfolio?.user_id) return [];

      const { data, error } = await supabase
        .from("portfolio_services")
        .select("*")
        .eq("freelancer_id", portfolio.user_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!portfolio?.user_id,
  });

  const { data: serviceStatsByService = {} } = useQuery({
    queryKey: [
      "public-portfolio-service-stats",
      portfolio?.user_id,
      services.map((s: any) => s.id).join(","),
    ],
    queryFn: async () => {
      if (!portfolio?.user_id) return {};
      const serviceIds = (services || []).map((s: any) => s.id);
      if (serviceIds.length === 0) return {};

      const { data: reqs, error: reqErr } = await supabase
        .from("requests")
        .select("id, portfolio_service_id")
        .eq("preferred_freelancer_id", portfolio.user_id)
        .eq("source", "portfolio_purchase")
        .in("portfolio_service_id", serviceIds);

      if (reqErr) throw reqErr;

      const requestRows = (reqs || []).filter((r: any) => !!r.portfolio_service_id);
      const requestIds = requestRows.map((r: any) => r.id);

      const purchaseCountByService: Record<string, number> = {};
      requestRows.forEach((r: any) => {
        const sid = r.portfolio_service_id;
        purchaseCountByService[sid] = (purchaseCountByService[sid] || 0) + 1;
      });

      if (requestIds.length === 0) {
        const empty: Record<string, { purchaseCount: number; ratingAvg: number; ratingCount: number }> = {};
        serviceIds.forEach((sid: string) => {
          empty[sid] = { purchaseCount: purchaseCountByService[sid] || 0, ratingAvg: 0, ratingCount: 0 };
        });
        return empty;
      }

      const { data: ratings, error: ratErr } = await supabase
        .from("request_ratings")
        .select("request_id, quality, speed, communication")
        .in("request_id", requestIds);

      if (ratErr) throw ratErr;

      const requestIdToServiceId = new Map<string, string>();
      requestRows.forEach((r: any) => requestIdToServiceId.set(r.id, r.portfolio_service_id));

      const byService: Record<string, { sum: number; count: number }> = {};
      (ratings || []).forEach((rt: any) => {
        const sid = requestIdToServiceId.get(rt.request_id);
        if (!sid) return;
        const score =
          (Number(rt.quality || 0) + Number(rt.speed || 0) + Number(rt.communication || 0)) / 3;
        if (!byService[sid]) byService[sid] = { sum: 0, count: 0 };
        byService[sid].sum += score;
        byService[sid].count += 1;
      });

      const result: Record<string, { purchaseCount: number; ratingAvg: number; ratingCount: number }> = {};
      serviceIds.forEach((sid: string) => {
        const v = byService[sid];
        result[sid] = {
          purchaseCount: purchaseCountByService[sid] || 0,
          ratingAvg: v?.count ? v.sum / v.count : 0,
          ratingCount: v?.count || 0,
        };
      });

      return result;
    },
    enabled: !!portfolio?.user_id && services.length > 0,
  });

  const { data: serviceAddons = [] } = useQuery({
    queryKey: ["portfolio-service-addons", selectedService?.id],
    queryFn: async () => {
      if (!selectedService?.id) return [];
      const { data, error } = await supabase
        .from("portfolio_service_addons")
        .select("id, title, description, price_egp")
        .eq("service_id", selectedService.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        price_egp: Number(a.price_egp || 0),
      }));
    },
    enabled: !!selectedService?.id,
  });

  const handleRequestFreelancer = () => {
    navigate("/client/create-request", {
      state: {
        preferredFreelancerId: portfolio?.user_id,
        preferredFreelancerName: freelancer?.profile?.full_name,
      },
    });
  };

  const handleBuyService = async (payload: { service: any; selectedAddons: any[]; total: number }) => {
    if (!portfolio?.user_id || !slug) return;

    const service = payload.service;
    const addonsSnapshot = (payload.selectedAddons || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      description: a.description || null,
      price_egp: Number(a.price_egp || 0),
    }));

    // If user not logged-in, store context then go to login.
    if (!user) {
      sessionStorage.setItem(
        "pending_service_purchase",
        JSON.stringify({
          returnTo: `/u/${slug}`,
          freelancerId: portfolio.user_id,
          freelancerName: freelancer?.profile?.full_name,
          service: {
            id: service.id,
            title: service.title,
            description: service.description,
            price_egp: Number(service.price_egp || 0),
          },
          addons: addonsSnapshot,
          total: Number(payload.total || 0),
        })
      );
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("purchase_intents")
      .insert({
        user_id: user.id,
        freelancer_id: portfolio.user_id,
        portfolio_service_id: service.id,
        title_snapshot: service.title,
        description_snapshot: service.description || null,
        price_egp_snapshot: Number(service.price_egp || 0),
        addons_snapshot: addonsSnapshot,
        total_price_egp_snapshot: Number(payload.total || 0),
        quantity: 1,
        status: "draft",
      } as any)
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("Create purchase intent error:", error);
      toast({
        title: "تعذر بدء الشراء",
        description: "حصل خطأ أثناء تجهيز عملية الدفع. سيتم تحويلك لإنشاء طلب عادي.",
        variant: "destructive",
      });

      // fallback: keep existing credits-based request flow
      navigate("/client/create-request", {
        state: {
          preferredFreelancerId: portfolio?.user_id,
          preferredFreelancerName: freelancer?.profile?.full_name,
          service: {
            id: service.id,
            title: service.title,
            description: service.description,
            price_egp: service.price_egp,
          },
        },
      });
      return;
    }

    navigate(`/client/checkout?pi=${data.id}`);
  };

  const profile = (freelancer as any)?.profile;
  const freelancerProfile = (freelancer as any)?.freelancer;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!portfolio || !freelancer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-2">الصفحة غير موجودة</h2>
            <p className="text-muted-foreground mb-4">لم نتمكن من العثور على هذا البورتفوليو</p>
            <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeFullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
  const safePortfolioTitle = typeof (portfolio as any)?.title === "string" ? (portfolio as any).title.trim() : "";
  const slugName = typeof slug === "string" ? slug.replace(/-/g, " ").trim() : "";

  const displayName = safeFullName || safePortfolioTitle || slugName || "فريلانسر";
  const freelancerProfileSafe = (freelancerProfile || {}) as any;
  const creditPrice = 1; // 1 ج.م ~= 1 كريديت (للعرض فقط)

  const getProjectCoverImage = (project: any): string | null => {
    const images = project?.images;

    if (typeof images === "string" && images.trim()) return images;

    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      if (typeof first === "string") return first;
      if (first && typeof first.url === "string") return first.url;
      if (first && typeof first.publicUrl === "string") return first.publicUrl;
    }

    return null;
  };

  const getServiceCoverImage = (service: any): string | null => {
    const images = service?.images;

    if (typeof images === "string" && images.trim()) return images;

    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      if (typeof first === "string") return first;
      if (first && typeof first.url === "string") return first.url;
      if (first && typeof first.publicUrl === "string") return first.publicUrl;
    }

    return null;
  };

  const specializationLabel =
    primaryCategoryLabel ||
    ((portfolio as any)?.headline as string | null) ||
    (portfolio.subtitle && portfolio.subtitle !== "خدمة تجريبية للتأكد من العرض"
      ? portfolio.subtitle
      : null) ||
    "مستقل محترف";

  return (
    <>
      <SEO
        title={`${displayName} | بورتفوليو فريلانسر`}
        description={portfolio.bio || portfolio.subtitle || `بورتفوليو ${displayName}`}
        path={`/u/${slug}`}
        ogImage={portfolio.cover_image || portfolio.avatar_url || undefined}
        schemaType="ProfilePage"
        schema={{
          name: displayName,
          ...(portfolio.bio ? { description: portfolio.bio } : {}),
        }}
      />

      <DynamicNavbar />

      <div className="portfolio-luxe min-h-screen bg-background pt-16 lg:pt-20">
        {/* Hero */}
        <header className="relative editorial-hero overflow-hidden">
          {/* Background layers (subtle, editorial) */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {/* softened grid */}
            <div className="absolute inset-0 decorative-grid opacity-[0.08] dark:opacity-[0.10]" />

            {/* big orbs (reduced intensity) */}
            <div className="absolute top-[-220px] right-[-220px] w-[720px] h-[720px] rounded-full bg-gradient-to-br from-primary/18 to-accent/14 blur-3xl animate-float opacity-60" />
            <div
              className="absolute bottom-[-260px] left-[-260px] w-[760px] h-[760px] rounded-full bg-gradient-to-tr from-accent/16 to-primary/14 blur-3xl animate-float opacity-55"
              style={{ animationDelay: "-4s" }}
            />

            {/* floating particles */}
            <div className="motion-reduce:hidden">
              {heroParticles.map((p, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-primary/15 animate-float"
                  style={{
                    left: p.left,
                    top: p.top,
                    width: p.size,
                    height: p.size,
                    animationDelay: p.delay,
                    animationDuration: p.duration,
                    opacity: p.opacity,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Cover Image */}
          <div className="relative">
            {portfolio.cover_image ? (
              <div className="h-44 sm:h-56 lg:h-80 relative overflow-hidden">
                <img
                  src={portfolio.cover_image}
                  alt={`غلاف بورتفوليو ${displayName}`}
                  className="w-full h-full object-cover dark:brightness-[0.68] dark:saturate-75"
                  loading="lazy"
                />
                <div className="absolute inset-0 editorial-cover-overlay" aria-hidden />
              </div>
            ) : (
              <div className="h-24 sm:h-32 lg:h-48" />
            )}
          </div>

          {/* Header Card */}
          <div className="container mx-auto px-4 relative z-10 -mt-12 sm:-mt-16 lg:-mt-24 pb-8">
            <Card className="editorial-hero-card ring-1 ring-border/50">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="relative">
                    <div
                      className="absolute inset-0 -z-10 blur-2xl opacity-40 bg-gradient-to-l from-primary/18 via-accent/14 to-primary/16"
                      aria-hidden
                    />
                    <Avatar className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 border-4 border-background shadow-lg ring-2 ring-primary/25">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="text-3xl">{displayName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.08] tracking-tight text-foreground">
                        {displayName}
                      </h1>
                      {freelancerProfileSafe?.is_verified && (
                        <Badge
                          variant="default"
                          className="bg-info text-info-foreground border border-info/35"
                        >
                          <CheckCircle2 className="w-4 h-4 ml-1" />
                          موثق
                        </Badge>
                      )}
                    </div>

                    <p className="text-muted-foreground mb-5 text-base sm:text-lg leading-relaxed">
                      {specializationLabel}
                    </p>

                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
                      <div className="editorial-pill">
                        <Star className="w-5 h-5 fill-warning text-warning" />
                        <span className="font-bold">{freelancerProfileSafe?.rating || 0}</span>
                        <span className="text-muted-foreground">({projects.length} مشروع)</span>
                      </div>

                      <div className="editorial-pill">
                        <Briefcase className="w-5 h-5 text-primary" />
                        <span className="truncate max-w-[min(34rem,100%)]">{specializationLabel}</span>
                      </div>

                      <div className="editorial-pill">
                        <Briefcase className="w-5 h-5 text-primary" />
                        <span>{freelancerProfileSafe?.experience || "متوسط"}</span>
                      </div>

                      {freelancerProfileSafe?.hourly_rate && (
                        <div className="editorial-pill">
                          <Clock className="w-5 h-5 text-success" />
                          <span className="font-bold">{freelancerProfileSafe.hourly_rate} ج.م/ساعة</span>
                        </div>
                      )}
                    </div>

                    {(portfolio.show_email || portfolio.show_phone) && (
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
                        {portfolio.show_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{profile.email}</span>
                          </div>
                        )}
                        {portfolio.show_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{profile.phone || "-"}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {freelancerProfileSafe?.portfolio_url && (
                        <Button
                          size="lg"
                          variant="hero-outline"
                          onClick={() => window.open(freelancerProfileSafe.portfolio_url, "_blank")}
                        >
                          <ExternalLink className="w-5 h-5 ml-2" />
                          الموقع الشخصي
                        </Button>
                      )}

                      {freelancerProfileSafe?.linkedin_url && (
                        <Button
                          size="lg"
                          variant="hero-outline"
                          onClick={() => window.open(freelancerProfileSafe.linkedin_url, "_blank")}
                        >
                          <Linkedin className="w-5 h-5 ml-2" />
                          LinkedIn
                        </Button>
                      )}

                      {freelancerProfileSafe?.github_url && (
                        <Button
                          size="lg"
                          variant="hero-outline"
                          onClick={() => window.open(freelancerProfileSafe.github_url, "_blank")}
                        >
                          <Github className="w-5 h-5 ml-2" />
                          GitHub
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </header>

        {/* Content */}
        <main className="container mx-auto px-4 py-8 sm:py-10 space-y-8 sm:space-y-10">
          {/* Freelancer Info Card */}
          <section aria-label="بيانات الفريلانسر" className="animate-fade-in-up">
            <Card className="card-elevated overflow-hidden">
              <div className="relative">
                <div className="h-2 bg-gradient-to-l from-primary/60 via-accent/40 to-primary/60" />
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  aria-hidden
                  style={{
                    background:
                      "radial-gradient(circle at 20% 10%, hsl(var(--primary)) 0%, transparent 55%), radial-gradient(circle at 85% 40%, hsl(var(--accent)) 0%, transparent 60%)",
                  }}
                />
              </div>

              <CardContent className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">بطاقة الفريلانسر</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      بيانات سريعة عن الحساب.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {freelancerProfileSafe?.is_verified ? (
                      <Badge variant="default" className="bg-info text-info-foreground border border-info/35">
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                        موثق
                      </Badge>
                    ) : (
                      <Badge variant="secondary">غير موثق</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 mt-6 md:grid-cols-2">
                  <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40 p-4 sm:p-5">
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                    <div className="flex items-start gap-3">
                      <div className="grid place-items-center w-10 h-10 rounded-xl bg-background/60 border border-border/60">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">الاسم</p>
                        <p className="font-semibold text-base truncate">{displayName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40 p-4 sm:p-5">
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                    <div className="flex items-start gap-3">
                      <div className="grid place-items-center w-10 h-10 rounded-xl bg-background/60 border border-border/60">
                        <CalendarIcon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">تاريخ التسجيل</p>
                        <p className="font-semibold text-base truncate">
                          {(() => {
                            const ts =
                              (profile as any)?.created_at ||
                              (freelancerProfileSafe as any)?.created_at ||
                              (portfolio as any)?.created_at;
                            if (!ts) return "-";
                            try {
                              return new Intl.DateTimeFormat("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "2-digit",
                              }).format(new Date(ts));
                            } catch {
                              return "-";
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* About */}
          {(portfolio.bio || freelancerProfileSafe?.bio) && (
            <section>
              <EditorialSectionHeader
                title="نبذة عني"
                subtitle="لمحة سريعة عن خبرتي وطريقة عملي."
                className="mb-4"
              />
              <Card className="card-elevated">
                <CardContent className="p-6 sm:p-7">
                  <p className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {portfolio.bio || freelancerProfileSafe?.bio}
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Trust Section */}
          <section className="animate-fade-in-up">
            <EditorialSectionHeader
              title="لماذا تختارني؟"
              subtitle="ثلاثة أسباب مباشرة تجعل التجربة أوضح وأسرع."
              className="mb-4"
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="card-elevated group overflow-hidden">
                <CardContent className="p-7 text-center relative">
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-muted/60 border border-border/60">
                    <Shield className="w-7 h-7 text-info" />
                  </div>
                  <h3 className="font-semibold mb-1">هوية موثّقة</h3>
                  <p className="text-sm text-muted-foreground">بيانات موثوقة داخل المنصة</p>
                </CardContent>
              </Card>

              <Card className="card-elevated group overflow-hidden">
                <CardContent className="p-7 text-center relative">
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-muted/60 border border-border/60">
                    <TrendingUp className="w-7 h-7 text-success" />
                  </div>
                  <h3 className="font-semibold mb-1">تواصل واضح</h3>
                  <p className="text-sm text-muted-foreground">متابعة منظمة وتحديثات مستمرة</p>
                </CardContent>
              </Card>

              <Card className="card-elevated group overflow-hidden">
                <CardContent className="p-7 text-center relative">
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-2xl bg-muted/60 border border-border/60">
                    <CheckCircle2 className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-1">جودة قابلة للقياس</h3>
                  <p className="text-sm text-muted-foreground">خبرة + تقييمات + أعمال سابقة</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Services */}
            {services.length > 0 && (
              <section>
                <EditorialSectionHeader
                  kicker="خدمات جاهزة للطلب"
                  kickerIcon={<Sparkles className="w-4 h-4" />}
                  title={primaryCategoryLabel || "خدماتي"}
                  subtitle="خدمات جاهزة للطلب من تخصصي — عاين التفاصيل قبل الشراء."
                  actions={
                    <Button variant="hero" size="lg" onClick={handleRequestFreelancer}>
                      <Briefcase className="w-5 h-5 ml-2" />
                      اطلب هذا الفريلانسر
                    </Button>
                  }
                />

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => {
                  const cover = getServiceCoverImage(service);
                  const credits = Math.max(
                    1,
                    Math.round(Number(service.price_egp || 0) / Number(creditPrice || 1))
                  );
                  return (
                    <Card
                      key={service.id}
                      className="card-elevated group overflow-hidden hover-lift"
                    >
                      {/* Media */}
                      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={`صورة خدمة: ${service.title}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}

                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/75 via-background/10 to-transparent opacity-95" />

                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-background/70 backdrop-blur border border-border/60 px-3 py-1.5 text-sm">
                            <Clock className="w-4 h-4 text-primary" />
                            {service.estimated_days} يوم
                          </span>

                          <span className="inline-flex items-center gap-2 rounded-full bg-background/70 backdrop-blur border border-border/60 px-3 py-1.5 text-sm">
                            <span className="font-semibold text-primary">{service.price_egp} ج.م</span>
                            <span className="text-muted-foreground">(~{credits} كريديت)</span>
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        {(() => {
                          const st = (serviceStatsByService as any)?.[service.id];
                          const purchaseCount = Number(st?.purchaseCount || 0);
                          const ratingCount = Number(st?.ratingCount || 0);
                          const ratingAvg = Number(st?.ratingAvg || 0);

                          return (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-lg sm:text-xl font-semibold leading-snug line-clamp-2">
                                  {service.title}
                                </h3>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-sm border border-border/60">
                                  <ShoppingBag className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">{purchaseCount}</span>
                                  <span className="text-muted-foreground">مرات شراء</span>
                                </span>

                                <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-sm border border-border/60">
                                  <Star className="w-4 h-4 fill-warning text-warning" />
                                  <span className="font-semibold">{ratingAvg.toFixed(1)}</span>
                                  <span className="text-muted-foreground">({ratingCount} تقييم)</span>
                                </span>
                              </div>
                            </>
                          );
                        })()}

                        <p className="text-muted-foreground mt-3 line-clamp-3">
                          {service.short_description || service.description || "خدمة بدون وصف"}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedService(service)}
                          >
                            معاينة
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                          </Button>

                          <Button
                            variant="hero"
                            onClick={() => setSelectedService(service)}
                          >
                            شراء الآن
                            <ArrowUpRight className="w-5 h-5 mr-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section>
              <EditorialSectionHeader
                kicker="مختارات من الأعمال"
                kickerIcon={<Layers3 className="w-4 h-4" />}
                title="أعمالي السابقة"
                subtitle="استعرض صور/فيديو/مرفقات لكل مشروع."
              />

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                  const cover = getProjectCoverImage(project);

                  return (
                    <Card
                      key={project.id}
                      className="card-elevated group overflow-hidden hover-lift"
                      onClick={() => setSelectedProject(project)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setSelectedProject(project);
                      }}
                    >
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={`صورة مشروع: ${project.title}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}

                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/80 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="absolute bottom-3 right-3 left-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-foreground line-clamp-1">
                                {project.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {project.description}
                              </p>
                            </div>
                            <div className="shrink-0 rounded-full bg-background/70 backdrop-blur border border-border/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowUpRight className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-5">
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                            }}
                          >
                            معاينة التفاصيل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Stats Section */}
          <section>
            <EditorialSectionHeader
              kicker="أرقام سريعة"
              kickerIcon={<TrendingUp className="w-4 h-4 text-primary" />}
              title="الإحصائيات"
              subtitle="مؤشرات عامة عن الأداء داخل المنصة."
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="card-elevated">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {freelancerProfileSafe?.stars || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">النجوم</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-success mb-1">
                    {freelancerProfileSafe?.completed_tasks ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">مشروع مكتمل</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-accent mb-1">0</div>
                  <p className="text-sm text-muted-foreground">جاري العمل</p>
                </CardContent>
              </Card>
              <Card className="card-elevated">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-info mb-1">
                    {freelancerProfileSafe?.completed_tasks ?? 0}
                  </div>
                  <p className="text-sm text-muted-foreground">التسليمات</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* CTA */}
          <Card className="card-gradient border border-border/60">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">هل أنت مستعد للبدء؟</h3>
              <p className="text-muted-foreground mb-6">
                اطلب هذا الفريلانسر الآن — متابعة منظمة داخل المنصة من البداية للنهاية
              </p>
              <Button size="lg" onClick={handleRequestFreelancer}>
                <Briefcase className="w-5 h-5 ml-2" />
                اطلب الآن
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>

      <DynamicFooter />

      <ServiceDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => !open && setSelectedService(null)}
        service={selectedService}
        addons={serviceAddons as any}
        stats={
          selectedService
            ? (serviceStatsByService as any)?.[selectedService.id] || {
                purchaseCount: 0,
                ratingAvg: 0,
                ratingCount: 0,
              }
            : undefined
        }
        onBuy={async (payload) => {
          await handleBuyService(payload);
          setSelectedService(null);
        }}
      />

      <ProjectDetailsDialog
        open={projectDetailsOpen}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        project={selectedProject}
      />
    </>
  );
}
