import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getPublicAppOrigin } from "@/lib/getPublicAppOrigin";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Plus,
  ExternalLink,
  Briefcase,
  Star,
  CheckCircle2,
  Clock,
  TrendingUp,
  Image as ImageIcon,
  DollarSign,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PortfolioMediaItem } from "@/components/portfolio/PortfolioMediaUploader";
import { GoogleDriveImageInput } from "@/components/portfolio/GoogleDriveImageInput";
import { FreelancerPortfolioProfileCard } from "@/components/freelancer/FreelancerPortfolioProfileCard";
import { useTableSubscription } from "@/hooks/useRealtimeSubscription";

export default function FreelancerPortfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [showCoverDialog, setShowCoverDialog] = useState(false);

  const [serviceAddonsDraft, setServiceAddonsDraft] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<PortfolioMediaItem[]>([]);

  const [projectForm, setProjectForm] = useState<{
    title: string;
    description: string;
    project_type: string;
    external_link: string;
    video_url: string;
    images: PortfolioMediaItem[];
    attachments: PortfolioMediaItem[];
    is_visible: boolean;
    sort_order: number;
  }>({
    title: "",
    description: "",
    project_type: "",
    external_link: "",
    video_url: "",
    images: [],
    attachments: [],
    is_visible: true,
    sort_order: 0,
  });

  const [serviceForm, setServiceForm] = useState<{
    title: string;
    short_description: string;
    description: string;
    price_egp: string;
    estimated_days: string;
    execution_date?: Date;
    revisions_included: string;
    deliverables_text: string;
    requirements_text: string;
    video_url: string;
    images: PortfolioMediaItem[];
    attachments: PortfolioMediaItem[];
    is_active: boolean;
    sort_order: number;
  }>({
    title: "",
    short_description: "",
    description: "",
    price_egp: "",
    estimated_days: "",
    execution_date: undefined,
    revisions_included: "",
    deliverables_text: "",
    requirements_text: "",
    video_url: "",
    images: [],
    attachments: [],
    is_active: true,
    sort_order: 0,
  });

  const normalizeMediaItems = (value: any): PortfolioMediaItem[] => {
    if (!value) return [];
    if (typeof value === "string" && value.trim()) {
      return [{ name: "item_1", url: value, isCover: true, order: 0 }];
    }
    if (!Array.isArray(value)) return [];

    return value
      .map((it: any, idx: number) => {
        if (typeof it === "string") {
          return { name: `item_${idx + 1}`, url: it, order: idx } as PortfolioMediaItem;
        }
        return {
          name: it?.name || `item_${idx + 1}`,
          url: it?.url || it?.publicUrl,
          path: it?.path,
          type: it?.type,
          size: it?.size,
          isCover: !!it?.isCover,
          order: typeof it?.order === "number" ? it.order : idx,
        } as PortfolioMediaItem;
      })
      .filter((x: any) => !!x);
  };

  const openEditProject = (project: any) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title || "",
      description: project.description || "",
      project_type: project.project_type || "",
      external_link: project.external_link || "",
      video_url: project.video_url || "",
      images: normalizeMediaItems((project as any).images),
      attachments: normalizeMediaItems((project as any).attachments),
      is_visible: project.is_visible ?? true,
      sort_order: project.sort_order ?? 0,
    });
    setShowProjectDialog(true);
  };

  const openEditService = (service: any) => {
    setEditingService(service);
    setServiceForm({
      title: service.title || "",
      short_description: (service as any).short_description || "",
      description: service.description || "",
      price_egp: String(service.price_egp ?? ""),
      estimated_days: service.estimated_days ? String(service.estimated_days) : "",
      execution_date: (service as any).execution_date ? new Date((service as any).execution_date) : undefined,
      revisions_included: (service as any).revisions_included ? String((service as any).revisions_included) : "",
      deliverables_text: Array.isArray((service as any).deliverables) ? (service as any).deliverables.join("\n") : "",
      requirements_text: Array.isArray((service as any).requirements) ? (service as any).requirements.join("\n") : "",
      video_url: (service as any).video_url || "",
      images: normalizeMediaItems((service as any).images),
      attachments: normalizeMediaItems((service as any).attachments),
      is_active: service.is_active ?? true,
      sort_order: service.sort_order ?? 0,
    });
    setShowServiceDialog(true);
  };

  // Fetch portfolio
  const { data: portfolio, isLoading: portfolioLoading } = useQuery({
    queryKey: ["freelancer-portfolio", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_portfolios")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch freelancer profile
  const { data: freelancerProfile } = useQuery({
    queryKey: ["freelancer-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Realtime: keep username + portfolio slug/link in sync without refresh
  const realtimeUserFilter = user?.id ? `user_id=eq.${user.id}` : "user_id=eq.__none__";
  useTableSubscription(
    "freelancer_profiles",
    [["freelancer-profile", user?.id], ["freelancer-full-profile", user?.id]],
    { filter: realtimeUserFilter }
  );
  useTableSubscription(
    "freelancer_portfolios",
    [["freelancer-portfolio", user?.id]],
    { filter: realtimeUserFilter }
  );

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["portfolio-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .eq("freelancer_id", user?.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["portfolio-services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_services")
        .select("*")
        .eq("freelancer_id", user?.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  const { data: serviceAddons = [] } = useQuery({
    queryKey: ["portfolio-service-addons-edit", editingService?.id],
    queryFn: async () => {
      if (!editingService?.id) return [];
      const { data, error } = await supabase
        .from("portfolio_service_addons")
        .select("id, title, description, price_egp, is_active, sort_order")
        .eq("service_id", editingService.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!editingService?.id && showServiceDialog,
  });

  useEffect(() => {
    if (!showServiceDialog) return;
    if (!editingService?.id) return;
    setServiceAddonsDraft(
      (serviceAddons || []).map((a: any, idx: number) => ({
        id: a.id,
        title: a.title || "",
        description: a.description || "",
        price_egp: String(a.price_egp ?? ""),
        is_active: a.is_active ?? true,
        sort_order: typeof a.sort_order === "number" ? a.sort_order : idx,
      }))
    );
  }, [serviceAddons, editingService?.id, showServiceDialog]);

  const saveAddonsMutation = useMutation({
    mutationFn: async () => {
      if (!editingService?.id) return;

      const isUuidLike = (value: unknown) =>
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

      const rows = serviceAddonsDraft
        .map((a: any, idx: number) => {
          const title = String(a?.title || "").trim();
          const rawPrice = String(a?.price_egp ?? "").trim();
          const price = rawPrice === "" ? NaN : Number(rawPrice);

          if (!title || !Number.isFinite(price)) return null;

          const baseRow: any = {
            service_id: editingService.id,
            title,
            description: String(a?.description || "").trim() || null,
            price_egp: price,
            is_active: a?.is_active ?? true,
            sort_order: idx,
          };

          // IMPORTANT: only send id when it's a valid uuid (avoid null/"none"/invalid uuid issues)
          if (isUuidLike(a?.id)) baseRow.id = a.id;

          return baseRow;
        })
        .filter(Boolean);

      if (rows.length === 0) return;

      const { error } = await supabase
        .from("portfolio_service_addons")
        .upsert(rows as any, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio-service-addons-edit", editingService?.id],
      });
      toast.success("تم حفظ الإضافات");
    },
    onError: (error: any) => {
      console.error("saveAddonsMutation error:", error);
      toast.error(error?.message || "حدث خطأ أثناء حفظ الإضافات");
    },
  });

  const deleteAddonMutation = useMutation({
    mutationFn: async (addonId: string) => {
      const { error } = await supabase.from("portfolio_service_addons").delete().eq("id", addonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["portfolio-service-addons-edit", editingService?.id],
      });
      toast.success("تم حذف الإضافة");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الإضافة");
    },
  });

  // Create portfolio mutation
  const createPortfolioMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !freelancerProfile?.username) {
        throw new Error("يجب إضافة اسم مستخدم في صفحة (الملف الشخصي) أولاً");
      }

      const { data, error } = await supabase
        .from("freelancer_portfolios")
        .insert({
          user_id: user.id,
          slug: freelancerProfile.username || user.id,
          is_public: false,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-portfolio"] });
      toast.success("تم إنشاء صفحة البورتفوليو بنجاح!");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء إنشاء البورتفوليو");
    },
  });

  // Toggle portfolio visibility
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      const { error } = await supabase
        .from("freelancer_portfolios")
        .update({ is_public: isPublic })
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-portfolio"] });
      toast.success("تم تحديث حالة البورتفوليو");
    },
  });

  // Update cover image
  const updateCoverMutation = useMutation({
    mutationFn: async (coverUrl: string | null) => {
      const { error } = await supabase
        .from("freelancer_portfolios")
        .update({ cover_image: coverUrl })
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-portfolio"] });
      toast.success("تم تحديث صورة الغلاف");
      setShowCoverDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء تحديث الصورة");
    },
  });

  // Create / update project
  const upsertProjectMutation = useMutation({
    mutationFn: async (project: any) => {
      if (!user?.id) throw new Error("المستخدم غير مسجل");

      const payload = {
        freelancer_id: user.id,
        title: project.title,
        description: project.description || "",
        project_type: project.project_type || null,
        external_link: project.external_link || null,
        video_url: project.video_url || null,
        images: project.images || [],
        attachments: project.attachments || [],
        is_visible: project.is_visible ?? true,
        sort_order: project.sort_order ?? 0,
      };

      if (project.id) {
        const { error } = await supabase
          .from("portfolio_projects")
          .update(payload)
          .eq("id", project.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portfolio_projects")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects", user?.id] });
      setShowProjectDialog(false);
      setEditingProject(null);
      toast.success("تم حفظ العمل بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ العمل");
    },
  });

  // Delete project
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("portfolio_projects")
        .delete()
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects", user?.id] });
      setShowProjectDialog(false);
      setEditingProject(null);
      toast.success("تم حذف العمل");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف العمل");
    },
  });

  // Create / update service
  const upsertServiceMutation = useMutation({
    mutationFn: async (service: any) => {
      if (!user?.id) throw new Error("المستخدم غير مسجل");

      const toLines = (text: string) =>
        text
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);

      const payload = {
        freelancer_id: user.id,
        title: service.title,
        short_description: service.short_description || null,
        description: service.description || "",
        price_egp: Number(service.price_egp || 0),
        estimated_days: service.estimated_days ? Number(service.estimated_days) : null,
        execution_date: service.execution_date ? format(service.execution_date, "yyyy-MM-dd") : null,
        revisions_included: service.revisions_included ? Number(service.revisions_included) : null,
        deliverables: Array.isArray(service.deliverables) ? service.deliverables : toLines(service.deliverables_text || ""),
        requirements: Array.isArray(service.requirements) ? service.requirements : toLines(service.requirements_text || ""),
        video_url: service.video_url || null,
        images: service.images || [],
        attachments: service.attachments || [],
        is_active: service.is_active ?? true,
        sort_order: service.sort_order ?? 0,
      };

      if (service.id) {
        const { error } = await supabase
          .from("portfolio_services")
          .update(payload)
          .eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portfolio_services")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-services", user?.id] });
      setShowServiceDialog(false);
      setEditingService(null);
      toast.success("تم حفظ الخدمة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حفظ الخدمة");
    },
  });

  // Delete service
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from("portfolio_services")
        .delete()
        .eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-services", user?.id] });
      setShowServiceDialog(false);
      setEditingService(null);
      toast.success("تم حذف الخدمة");
    },
    onError: (error: any) => {
      toast.error(error.message || "حدث خطأ أثناء حذف الخدمة");
    },
  });

  // Copy portfolio link
  const portfolioLink = portfolio ? `${getPublicAppOrigin()}/u/${portfolio.slug}` : "";

  const copyPortfolioLink = async () => {
    if (!portfolioLink) return;
    try {
      await navigator.clipboard.writeText(portfolioLink);
      toast.success("تم نسخ رابط البورتفوليو");
    } catch (error) {
      toast.error("تعذر نسخ الرابط، حاول مرة أخرى");
    }
  };

  const visibleProjects = projects.filter((p) => p.is_visible).length;
  const activeServices = services.filter((s) => s.is_active).length;

  const { data: serviceRatingStatsByService = {} } = useQuery({
    queryKey: ["portfolio-service-rating-stats", user?.id, services.map((s) => s.id).join(",")],
    queryFn: async () => {
      try {
        if (!user?.id || services.length === 0) return {} as Record<string, { avg: number; count: number }>;

        const serviceIds = services.map((s) => s.id);

        // 1) Get requests created from portfolio purchases for this freelancer and those services
        const { data: reqs, error: reqErr } = await supabase
          .from("requests")
          .select("id, portfolio_service_id")
          .eq("preferred_freelancer_id", user.id)
          .in("portfolio_service_id", serviceIds);

        if (reqErr) throw reqErr;

        const requestRows = (reqs || []).filter((r: any) => !!r.portfolio_service_id);
        const requestIds = requestRows.map((r: any) => r.id);
        if (requestIds.length === 0) return {} as Record<string, { avg: number; count: number }>;

        // 2) Fetch ratings for those requests
        const { data: ratings, error: ratErr } = await supabase
          .from("request_ratings")
          .select("request_id, quality, speed, communication")
          .in("request_id", requestIds);

        if (ratErr) throw ratErr;

        const byService: Record<string, { sum: number; count: number }> = {};
        const requestIdToServiceId = new Map<string, string>();
        requestRows.forEach((r: any) => requestIdToServiceId.set(r.id, r.portfolio_service_id));

        (ratings || []).forEach((rt: any) => {
          const sid = requestIdToServiceId.get(rt.request_id);
          if (!sid) return;
          const score = (Number(rt.quality || 0) + Number(rt.speed || 0) + Number(rt.communication || 0)) / 3;
          if (!byService[sid]) byService[sid] = { sum: 0, count: 0 };
          byService[sid].sum += score;
          byService[sid].count += 1;
        });

        const result: Record<string, { avg: number; count: number }> = {};
        Object.entries(byService).forEach(([sid, v]) => {
          result[sid] = { avg: v.count ? v.sum / v.count : 0, count: v.count };
        });

        return result;
      } catch (e) {
        // In case RLS doesn't allow reading ratings, we just hide stats.
        return {} as Record<string, { avg: number; count: number }>;
      }
    },
    enabled: !!user?.id && services.length > 0,
  });

  if (portfolioLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="وظفني">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // First time setup
  if (!portfolio) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="وظفني">
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-dashed animate-fade-in-up">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary rounded-2xl flex items-center justify-center mb-4 animate-glow-pulse shadow-glow">
                <Briefcase className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl">أنشئ صفحة البورتفوليو الخاصة بك</CardTitle>
              <CardDescription className="text-lg mt-2">
                صفحة احترافية لعرض أعمالك وخدماتك للعملاء
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/40 border border-border/60 rounded-xl hover-scale">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-semibold">اعرض أعمالك السابقة</h4>
                      <p className="text-sm text-muted-foreground">أضف صور ووصف لمشاريعك المنفذة</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/40 border border-border/60 rounded-xl hover-scale">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-semibold">قدم خدماتك الجاهزة</h4>
                      <p className="text-sm text-muted-foreground">حدد الخدمات التي تقدمها مع الأسعار</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/40 border border-border/60 rounded-xl hover-scale">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-semibold">اجذب عملاء جدد</h4>
                      <p className="text-sm text-muted-foreground">شارك رابط صفحتك وابدأ استقبال الطلبات</p>
                    </div>
                  </div>
                </div>

              {!freelancerProfile?.username && (
                <div className="p-4 bg-warning/15 border border-warning/30 rounded-xl animate-fade-in">
                  <p className="text-sm text-foreground">
                    ⚠️ لازم تعمل Username قبل إنشاء صفحة البورتفوليو.
                    <br />
                    اليوزرنيم لازم يكون: حروف/أرقام إنجليزية أو underscore (_) فقط.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate("/freelancer/profile")}
                  >
                    افتح الملف الشخصي
                  </Button>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={() => createPortfolioMutation.mutate()}
                disabled={createPortfolioMutation.isPending || !freelancerProfile?.username}
              >
                {createPortfolioMutation.isPending ? "جاري الإنشاء..." : "إنشاء صفحة البورتفوليو"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={<FreelancerSidebar />} title="وظفني">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={portfolio.is_public ? "default" : "secondary"}>
                      {portfolio.is_public ? "منشور" : "مخفي"}
                    </Badge>
                    <Badge variant="outline">{portfolio.status}</Badge>
                  </div>
                </div>
                {portfolio.is_public ? (
                  <Eye className="w-8 h-8 text-success" />
                ) : (
                  <EyeOff className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الأعمال</p>
                  <p className="text-2xl font-bold">{visibleProjects}/{projects.length}</p>
                </div>
                <ImageIcon className="w-8 h-8 text-info" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الخدمات</p>
                  <p className="text-2xl font-bold">{activeServices}/{services.length}</p>
                </div>
                <DollarSign className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">التقييم</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="text-xl font-bold">{freelancerProfile?.rating || 0}</span>
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Freelancer Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الفريلانسر</CardTitle>
            <CardDescription>هذه البيانات تظهر لك داخل لوحة التحكم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <Briefcase className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">الاسم</p>
                  <p className="font-medium truncate">{profile?.full_name || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <CalendarIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">تاريخ التسجيل</p>
                  <p className="font-medium truncate">
                    {(() => {
                      const ts = (profile as any)?.created_at || (freelancerProfile as any)?.created_at;
                      if (!ts) return "-";
                      try {
                        return format(new Date(ts), "dd/MM/yyyy");
                      } catch {
                        return "-";
                      }
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <Clock className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">متاح للعمل</p>
                  <div className="mt-1">
                    <Badge variant={freelancerProfile?.is_available ? "default" : "secondary"}>
                      {freelancerProfile?.is_available ? "متاح" : "غير متاح"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Summary Card */}
        <FreelancerPortfolioProfileCard
          profile={profile}
          freelancerProfile={freelancerProfile}
          portfolioLink={portfolioLink}
          onEditProfile={() => navigate("/freelancer/profile")}
          serviceRatingsSummary={(() => {
            const items = Object.values(serviceRatingStatsByService || {});
            const totalRatings = items.reduce((acc: number, it: any) => acc + (it.count || 0), 0);
            const weightedSum = items.reduce((acc: number, it: any) => acc + (it.avg || 0) * (it.count || 0), 0);
            return {
              totalRatings,
              averageRating: totalRatings ? weightedSum / totalRatings : 0,
            };
          })()}
        />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>إدارة سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={copyPortfolioLink}>
                <Copy className="w-4 h-4 ml-2" />
                نسخ الرابط
              </Button>
              <Button variant="outline" onClick={() => window.open(portfolioLink, "_blank")}>
                <ExternalLink className="w-4 h-4 ml-2" />
                عرض الصفحة
              </Button>
              <Button variant="outline" onClick={() => navigate("/freelancer/profile")}>
                <Edit className="w-4 h-4 ml-2" />
                تعديل البيانات
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCoverImage(portfolio?.cover_image ? normalizeMediaItems(portfolio.cover_image) : []);
                  setShowCoverDialog(true);
                }}
              >
                <ImageIcon className="w-4 h-4 ml-2" />
                {portfolio?.cover_image ? "تعديل غلاف الهيرو" : "إضافة غلاف للهيرو"}
              </Button>
              <div className="flex items-center gap-2 mr-auto">
                <Label htmlFor="public-toggle">إظهار للعامة</Label>
                <Switch
                  id="public-toggle"
                  checked={portfolio.is_public}
                  onCheckedChange={(checked) => toggleVisibilityMutation.mutate(checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">الأعمال ({projects.length})</TabsTrigger>
            <TabsTrigger value="services">الخدمات ({services.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">أعمالي</h3>
              <Button
                onClick={() => {
                  setEditingProject(null);
                  setProjectForm({
                    title: "",
                    description: "",
                    project_type: "",
                    external_link: "",
                    video_url: "",
                    images: [],
                    attachments: [],
                    is_visible: true,
                    sort_order: projects.length,
                  });
                  setShowProjectDialog(true);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة عمل جديد
              </Button>
            </div>

            {projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لم تضف أي أعمال بعد</p>
                  <Button className="mt-4" onClick={() => setShowProjectDialog(true)}>
                    أضف عملك الأول
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => openEditProject(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openEditProject(project);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h4 className="font-semibold mb-1">{project.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant={project.is_visible ? "default" : "secondary"}>
                          {project.is_visible ? "ظاهر" : "مخفي"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditProject(project);
                          }}
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          تعديل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">خدماتي</h3>
              <Button
                onClick={() => {
                  setEditingService(null);
                  setServiceAddonsDraft([]);
                  setServiceForm({
                    title: "",
                    short_description: "",
                    description: "",
                    price_egp: "",
                    estimated_days: "",
                    execution_date: undefined,
                    revisions_included: "",
                    deliverables_text: "",
                    requirements_text: "",
                    video_url: "",
                    images: [],
                    attachments: [],
                    is_active: true,
                    sort_order: services.length,
                  });
                  setShowServiceDialog(true);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة خدمة جديدة
              </Button>
            </div>

            {services.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لم تضف أي خدمات بعد</p>
                  <Button className="mt-4" onClick={() => setShowServiceDialog(true)}>
                    أضف خدمتك الأولى
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="cursor-pointer"
                    onClick={() => openEditService(service)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") openEditService(service);
                    }}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">{service.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{service.estimated_days} يوم</span>
                        </div>
                        <div className="font-bold text-primary">{service.price_egp} ج.م</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={service.is_active ? "default" : "secondary"}>
                          {service.is_active ? "نشط" : "معطل"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditService(service);
                          }}
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          تعديل
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add / Edit Project Dialog */}
        <Dialog
          open={showProjectDialog}
          onOpenChange={(open) => {
            setShowProjectDialog(open);
            if (!open) {
              setEditingProject(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? "تعديل العمل" : "إضافة عمل جديد"}</DialogTitle>
              <DialogDescription>
                أضف تفاصيل العمل ليظهر في صفحة البورتفوليو العامة.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-title">عنوان العمل *</Label>
                <Input
                  id="project-title"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-type">نوع العمل</Label>
                <Select
                  value={projectForm.project_type || ""}
                  onValueChange={(v) => setProjectForm((p) => ({ ...p, project_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">تصميم</SelectItem>
                    <SelectItem value="development">تطوير</SelectItem>
                    <SelectItem value="marketing">تسويق</SelectItem>
                    <SelectItem value="content">محتوى</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-link">رابط خارجي (اختياري)</Label>
                <Input
                  id="project-link"
                  dir="ltr"
                  placeholder="https://..."
                  value={projectForm.external_link}
                  onChange={(e) => setProjectForm((p) => ({ ...p, external_link: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-desc">وصف العمل</Label>
                <Textarea
                  id="project-desc"
                  rows={5}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-video">فيديو (YouTube/Vimeo) - اختياري</Label>
                <Input
                  id="project-video"
                  dir="ltr"
                  placeholder="https://..."
                  value={projectForm.video_url}
                  onChange={(e) => setProjectForm((p) => ({ ...p, video_url: e.target.value }))}
                />
              </div>

              <GoogleDriveImageInput
                label="صور العمل (مع اختيار غلاف) — روابط Google Drive أو روابط مباشرة"
                initialItems={projectForm.images}
                onChange={(items) => setProjectForm((p) => ({ ...p, images: items }))}
              />

              <GoogleDriveImageInput
                label="ملفات مرفقة (اختياري) — روابط"
                allowCover={false}
                imageOnly={false}
                initialItems={projectForm.attachments}
                onChange={(items) => setProjectForm((p) => ({ ...p, attachments: items }))}
              />

              <div className="flex items-center justify-between">
                <Label htmlFor="project-visible">إظهار في البورتفوليو</Label>
                <Switch
                  id="project-visible"
                  checked={projectForm.is_visible}
                  onCheckedChange={(checked) => setProjectForm((p) => ({ ...p, is_visible: checked }))}
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                {editingProject ? (
                  <Button
                    variant="destructive"
                    onClick={() => deleteProjectMutation.mutate(editingProject.id)}
                    disabled={deleteProjectMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowProjectDialog(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() =>
                      upsertProjectMutation.mutate({
                        id: editingProject?.id,
                        title: projectForm.title,
                        description: projectForm.description,
                        project_type: projectForm.project_type || null,
                        external_link: projectForm.external_link || null,
                        video_url: projectForm.video_url || null,
                        images: projectForm.images,
                        attachments: projectForm.attachments,
                        is_visible: projectForm.is_visible,
                        sort_order: projectForm.sort_order,
                      })
                    }
                    disabled={!projectForm.title || upsertProjectMutation.isPending}
                  >
                    {upsertProjectMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add / Edit Service Dialog */}
        <Dialog
          open={showServiceDialog}
          onOpenChange={(open) => {
            setShowServiceDialog(open);
            if (!open) {
              setEditingService(null);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
              <DialogDescription>
                أضف خدمة بسعر ثابت لتظهر للعملاء في صفحة البورتفوليو.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="service-title">عنوان الخدمة *</Label>
                <Input
                  id="service-title"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm((s) => ({ ...s, title: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-short">وصف مختصر</Label>
                <Input
                  id="service-short"
                  value={serviceForm.short_description}
                  onChange={(e) => setServiceForm((s) => ({ ...s, short_description: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-desc">وصف الخدمة</Label>
                <Textarea
                  id="service-desc"
                  rows={5}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((s) => ({ ...s, description: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="service-price">السعر (ج.م) *</Label>
                  <Input
                    id="service-price"
                    type="number"
                    inputMode="decimal"
                    value={serviceForm.price_egp}
                    onChange={(e) => setServiceForm((s) => ({ ...s, price_egp: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="service-days">مدة التنفيذ (بالأيام)</Label>
                  <Input
                    id="service-days"
                    type="number"
                    inputMode="numeric"
                    value={serviceForm.estimated_days}
                    onChange={(e) => setServiceForm((s) => ({ ...s, estimated_days: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>موعد تنفيذ الخدمة</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !serviceForm.execution_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 ml-2" />
                      {serviceForm.execution_date ? format(serviceForm.execution_date, "PPP") : "اختر تاريخ"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={serviceForm.execution_date}
                      onSelect={(d) => setServiceForm((s) => ({ ...s, execution_date: d || undefined }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="service-revisions">عدد التعديلات</Label>
                  <Input
                    id="service-revisions"
                    type="number"
                    inputMode="numeric"
                    value={serviceForm.revisions_included}
                    onChange={(e) => setServiceForm((s) => ({ ...s, revisions_included: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="service-video">فيديو (YouTube/Vimeo) - اختياري</Label>
                  <Input
                    id="service-video"
                    dir="ltr"
                    placeholder="https://..."
                    value={serviceForm.video_url}
                    onChange={(e) => setServiceForm((s) => ({ ...s, video_url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-deliverables">Deliverables (سطر لكل عنصر)</Label>
                <Textarea
                  id="service-deliverables"
                  rows={4}
                  value={serviceForm.deliverables_text}
                  onChange={(e) => setServiceForm((s) => ({ ...s, deliverables_text: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-req">متطلبات البدء (سطر لكل عنصر)</Label>
                <Textarea
                  id="service-req"
                  rows={4}
                  value={serviceForm.requirements_text}
                  onChange={(e) => setServiceForm((s) => ({ ...s, requirements_text: e.target.value }))}
                />
              </div>

              <GoogleDriveImageInput
                label="صور الخدمة (مع اختيار غلاف) — روابط Google Drive أو روابط مباشرة"
                initialItems={serviceForm.images}
                onChange={(items) => setServiceForm((s) => ({ ...s, images: items }))}
              />

              <GoogleDriveImageInput
                label="ملفات مرفقة (اختياري) — روابط"
                allowCover={false}
                imageOnly={false}
                initialItems={serviceForm.attachments}
                onChange={(items) => setServiceForm((s) => ({ ...s, attachments: items }))}
              />

              <div className="flex items-center justify-between">
                <Label htmlFor="service-active">تفعيل الخدمة</Label>
                <Switch
                  id="service-active"
                  checked={serviceForm.is_active}
                  onCheckedChange={(checked) => setServiceForm((s) => ({ ...s, is_active: checked }))}
                />
              </div>

              {/* Add-ons */}
              {!editingService?.id ? (
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    احفظ الخدمة أولاً ثم يمكنك إضافة (Add-ons) بسعر إضافي.
                  </p>
                </Card>
              ) : (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">إضافات (Add-ons)</p>
                      <p className="text-xs text-muted-foreground">كل إضافة: اسم + سعر إضافي</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setServiceAddonsDraft((prev) => [
                          ...prev,
                          { title: "", description: "", price_egp: "", is_active: true },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة
                    </Button>
                  </div>

                  {serviceAddonsDraft.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد إضافات بعد.</p>
                  ) : (
                    <div className="space-y-2">
                      {serviceAddonsDraft.map((a: any, idx: number) => (
                        <div key={a.id || idx} className="rounded-xl border border-border p-3 space-y-2">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="md:col-span-2 grid gap-2">
                              <Label>اسم الإضافة</Label>
                              <Input
                                value={a.title}
                                onChange={(e) =>
                                  setServiceAddonsDraft((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                                  )
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>السعر</Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={a.price_egp}
                                onChange={(e) =>
                                  setServiceAddonsDraft((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, price_egp: e.target.value } : x))
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label>وصف (اختياري)</Label>
                            <Textarea
                              rows={2}
                              value={a.description}
                              onChange={(e) =>
                                setServiceAddonsDraft((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x))
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>تفعيل</Label>
                              <Switch
                                checked={a.is_active ?? true}
                                onCheckedChange={(checked) =>
                                  setServiceAddonsDraft((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, is_active: checked } : x))
                                  )
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                if (a.id) {
                                  deleteAddonMutation.mutate(a.id);
                                }
                                setServiceAddonsDraft((prev) => prev.filter((_, i) => i !== idx));
                              }}
                            >
                              حذف
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => saveAddonsMutation.mutate()}
                          disabled={saveAddonsMutation.isPending}
                        >
                          {saveAddonsMutation.isPending ? "جاري الحفظ..." : "حفظ الإضافات"}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                {editingService ? (
                  <Button
                    variant="destructive"
                    onClick={() => deleteServiceMutation.mutate(editingService.id)}
                    disabled={deleteServiceMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowServiceDialog(false)}
                  >
                    إلغاء
                  </Button>
                    <Button
                      onClick={() =>
                        upsertServiceMutation.mutate({
                          id: editingService?.id,
                          title: serviceForm.title,
                          short_description: serviceForm.short_description,
                          description: serviceForm.description,
                          price_egp: serviceForm.price_egp,
                          estimated_days: serviceForm.estimated_days,
                          execution_date: serviceForm.execution_date,
                          revisions_included: serviceForm.revisions_included,
                          deliverables_text: serviceForm.deliverables_text,
                          requirements_text: serviceForm.requirements_text,
                          video_url: serviceForm.video_url,
                          images: serviceForm.images,
                          attachments: serviceForm.attachments,
                          is_active: serviceForm.is_active,
                          sort_order: serviceForm.sort_order,
                        })
                      }
                      disabled={!serviceForm.title || !serviceForm.price_egp || upsertServiceMutation.isPending}
                    >
                    {upsertServiceMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cover Image Dialog */}
        <Dialog open={showCoverDialog} onOpenChange={setShowCoverDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>صورة غلاف الهيرو</DialogTitle>
              <DialogDescription>
                رفع صورة بانوراما (1920x400 أو أكبر) تظهر خلف بياناتك في الهيرو
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <GoogleDriveImageInput
                label="صورة الغلاف — رابط Google Drive أو رابط مباشر"
                maxItems={1}
                allowCover={false}
                initialItems={coverImage}
                onChange={(items) => setCoverImage(items)}
              />

              <div className="flex justify-between items-center pt-4">
                {portfolio?.cover_image && (
                  <Button
                    variant="destructive"
                    onClick={() => updateCoverMutation.mutate(null)}
                    disabled={updateCoverMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    إزالة الغلاف
                  </Button>
                )}

                <div className="flex gap-2 mr-auto">
                  <Button variant="outline" onClick={() => setShowCoverDialog(false)}>
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => {
                      const url = coverImage.length > 0 ? coverImage[0].url : null;
                      updateCoverMutation.mutate(url ?? null);
                    }}
                    disabled={updateCoverMutation.isPending}
                  >
                    {updateCoverMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {/* Portfolio Link Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">رابط البورتفوليو الخاص بك</h4>
                <p className="text-sm text-muted-foreground font-mono">{portfolioLink}</p>
              </div>
              <Button onClick={copyPortfolioLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}