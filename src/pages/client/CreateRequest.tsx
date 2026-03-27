import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { StepWizard } from "@/components/ui/StepWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  ArrowRight, 
  Palette, 
  FileText, 
  Code, 
  Megaphone, 
  Languages, 
  Video,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  CreditCard,
  Crown,
  Upload,
  X,
  File
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const steps = [
  { id: "category", title: "نوع الخدمة", description: "اختر التصنيف" },
  { id: "details", title: "تفاصيل الطلب", description: "وصف المشروع" },
  { id: "files", title: "الملفات", description: "ارفع الملفات" },
  { id: "review", title: "المراجعة", description: "تأكيد الطلب" },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette,
  FileText,
  Code,
  Megaphone,
  Languages,
  Video,
};

const defaultTaskSizes = [
  { id: "micro", name: "مهمة صغيرة جداً", credits: 1, goals: 1, description: "مهمة بسيطة (1-2 ساعة)", min_days: 0, max_days: 1, is_active: true, sort_order: 1 },
  { id: "small", name: "مهمة صغيرة", credits: 3, goals: 2, description: "مهمة عادية (3-5 ساعات)", min_days: 0, max_days: 1, is_active: true, sort_order: 2 },
  { id: "medium", name: "مهمة متوسطة", credits: 5, goals: 3, description: "مشروع متوسط (1-2 يوم)", min_days: 2, max_days: 2, is_active: true, sort_order: 3 },
  { id: "large", name: "مشروع كبير", credits: 10, goals: 5, description: "مشروع كبير (3-5 أيام)", min_days: 3, max_days: 5, is_active: true, sort_order: 4 },
];

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  path: string;
}

interface PortfolioRequestState {
  preferredFreelancerId?: string;
  preferredFreelancerName?: string;
  service?: {
    id: string;
    title: string;
    description?: string;
    price_egp?: number;
  };
}

export default function CreateRequest() {
  const [currentStep, setCurrentStep] = useState(0);
  // Generate a stable requestId for the whole session (files will be uploaded to this path)
  const [requestId] = useState(() => crypto.randomUUID());
  const [formData, setFormData] = useState({
    category_id: "",
    title: "",
    description: "",
    size: "small",
    deadline: "",
    files: [] as UploadedFile[],
    goals: [""] as string[], // Array of goals
  });
  const [uploading, setUploading] = useState(false);
  const [showNextStepsModal, setShowNextStepsModal] = useState(false);
  const [nextRequestUrl, setNextRequestUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const portfolioContext = (location.state || {}) as PortfolioRequestState;
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Prefill form when coming from freelancer portfolio
  useEffect(() => {
    if (!portfolioContext) return;

    setFormData((prev) => {
      const next = { ...prev };

      if (portfolioContext.service) {
        if (!next.title) next.title = portfolioContext.service.title;
        const priceLine = portfolioContext.service.price_egp
          ? `\n— السعر المتفق عليه: ${portfolioContext.service.price_egp} ج.م`
          : "";
        const serviceNote = `\n\n— طلب خدمة محددة من الفريلانسر: ${
          portfolioContext.preferredFreelancerName || ""
        }\n— اسم الخدمة: ${portfolioContext.service.title}${priceLine}`;
        if (!next.description?.includes(serviceNote)) {
          next.description = (next.description || "") + serviceNote;
        }
      } else if (portfolioContext.preferredFreelancerName && !next.title) {
        next.title = `طلب عمل من الفريلانسر ${portfolioContext.preferredFreelancerName}`;
      }

      return next;
    });
  }, [portfolioContext]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  // Fetch user subscription
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["client-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("client_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch user credits balance
  const { data: creditsBalance = 0 } = useQuery({
    queryKey: ["credits-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("credits_ledger")
        .select("balance_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after || 0;
    },
    enabled: !!user,
    refetchInterval: 5000, // Auto refresh every 5 seconds
  });

  // Realtime subscription for credits and subscription changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("credits-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "credits_ledger", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["credits-balance", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["client-subscription", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const allowedTaskSizeIds = ["micro", "small", "medium", "large"] as const;

  const { data: taskSizes = defaultTaskSizes } = useQuery({
    queryKey: ["task-sizes-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("settings")
        .select("value")
        .eq("key", "task_sizes_config")
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      const sizes = (data?.value as typeof defaultTaskSizes | null) || defaultTaskSizes;
      return sizes;
    },
  });

  const activeTaskSizes =
    ((taskSizes as any)?.filter((s: any) =>
      (s.is_active ?? true) && allowedTaskSizeIds.includes((s.id || "") as any)
    )?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)) as typeof defaultTaskSizes | null) ||
    defaultTaskSizes;

  const selectedSize =
    activeTaskSizes.find((s: any) => s.id === formData.size) || activeTaskSizes[0] || defaultTaskSizes[1];
  const requiredCredits = selectedSize?.credits || 0;
  const maxGoals = selectedSize?.goals || 1;
  const subscriptionCredits = subscription?.credits_remaining || 0;
  const totalAvailableCredits = subscriptionCredits + creditsBalance;
  const hasEnoughCredits = totalAvailableCredits >= requiredCredits;
  const hasActiveSubscription = !!subscription;
  const canCreateRequest = hasActiveSubscription || creditsBalance > 0;

  // Update goals array when size changes
  useEffect(() => {
    const newMaxGoals =
      (activeTaskSizes.find((s: any) => s.id === formData.size) || selectedSize)?.goals || 1;
    setFormData((prev) => ({
      ...prev,
      goals:
        prev.goals.slice(0, newMaxGoals).length > 0
          ? prev.goals.slice(0, newMaxGoals)
          : [""],
    }));
  }, [formData.size, activeTaskSizes]);

  const handleGoalChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.map((g, i) => (i === index ? value : g)),
    }));
  };

  const addGoal = () => {
    if (formData.goals.length < maxGoals) {
      setFormData((prev) => ({
        ...prev,
        goals: [...prev.goals, ""],
      }));
    }
  };

  const removeGoal = (index: number) => {
    if (formData.goals.length > 1) {
      setFormData((prev) => ({
        ...prev,
        goals: prev.goals.filter((_, i) => i !== index),
      }));
    }
  };

  // File upload handler - uploads to user.id/requests/{requestId}/filename
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // Path: {userId}/requests/{requestId}/{uniqueName}
      const filePath = `${user.id}/requests/${requestId}/${uniqueName}`;

      const { data, error } = await supabase.storage.from("request-files").upload(filePath, file);

      if (error) {
        toast({
          title: "خطأ في رفع الملف",
          description: error.message,
          variant: "destructive",
        });
        continue;
      }

      uploadedFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        path: data?.path || filePath,
      });
    }

    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...uploadedFiles],
    }));
    setUploading(false);

    // Reset input
    e.target.value = "";
  };

  const removeFile = async (index: number) => {
    const file = formData.files[index];
    if (file?.path) {
      // Try to delete from storage
      await supabase.storage.from("request-files").remove([file.path]);
    }
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleNext = () => {
    // Validate goals on step 2 before moving forward
    if (currentStep === 1 && !formData.goals[0]?.trim()) {
      toast({
        title: "الهدف الرئيسي مطلوب",
        description: "يجب إدخال الهدف الأول على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Idempotency key based on requestId (generated once per session)
  const idempotencyKey = useMemo(() => `req-${requestId}`, [requestId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      if (!hasEnoughCredits) throw new Error("رصيد غير كافي");
      if (!formData.goals[0]?.trim()) throw new Error("يجب إدخال الهدف الرئيسي على الأقل");
      if (!formData.deadline) throw new Error("الموعد المطلوب للتسليم مطلوب");

      const deadlineDate = new Date(formData.deadline);
      const now = new Date();
      if (isNaN(deadlineDate.getTime()) || deadlineDate <= now) {
        throw new Error("يجب اختيار موعد تسليم صحيح في المستقبل");
      }

      const sizeConfig = (activeTaskSizes as any)?.find((s: any) => s.id === formData.size);
      if (sizeConfig) {
        if (sizeConfig.min_days != null) {
          const minDeadline = new Date();
          minDeadline.setDate(minDeadline.getDate() + Number(sizeConfig.min_days));
          if (deadlineDate < minDeadline) {
            throw new Error(
              `الموعد المطلوب لهذا الحجم يجب أن يكون بعد ${sizeConfig.min_days} يوم/أيام على الأقل`
            );
          }
        }
        if (sizeConfig.max_days != null) {
          const maxDeadline = new Date();
          maxDeadline.setDate(maxDeadline.getDate() + Number(sizeConfig.max_days));
          if (deadlineDate > maxDeadline) {
            throw new Error(
              `الموعد المطلوب لهذا الحجم يجب أن يكون خلال ${sizeConfig.max_days} يوم/أيام كحد أقصى`
            );
          }
        }
      }

      // Filter out empty goals and build goals text
      const validGoals = formData.goals.filter((g) => g.trim());
      const goalsText =
        validGoals.length > 0
          ? "\n\n--- الأهداف المطلوبة ---\n" +
            validGoals.map((g, i) => `${i + 1}. ${g}`).join("\n")
          : "";

      const { data, error } = await supabase.functions.invoke("create-request", {
        body: {
          request_id: requestId,
          idempotency_key: idempotencyKey,
          category_id: formData.category_id || null,
          title: formData.title,
          description: (formData.description || "") + goalsText,
          size: formData.size,
          deadline: formData.deadline || null,
          files: formData.files,
        },
      });

      if (error) throw error;
      if (!data?.success && !data?.request)
        throw new Error(data?.error || "فشل إنشاء الطلب");

      return data.request;
    },
    onSuccess: (request: any) => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["client-all-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-requests"] });
      queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["credits-balance"] });

      toast({
        title: "تم إرسال الطلب بنجاح!",
        description: "سنراجع طلبك ونرد عليك في أقرب وقت.",
      });

      // Determine target URL for the new request details page
      let targetUrl = "/client/requests";
      if (request?.id) {
        targetUrl = `/client/requests/${request.id}`;
      } else if (request?.request_id) {
        targetUrl = `/client/requests/${request.request_id}`;
      }

      // Store URL and show next steps modal instead of navigating immediately
      setNextRequestUrl(targetUrl);
      setShowNextStepsModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الطلب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show upgrade prompt if no subscription and no credits
  if (!canCreateRequest) {
    return (
      <DashboardLayout
        sidebar={<ClientSidebar />}
        title="طلب جديد"
        subtitle="اشترك في باقة أو اشحن رصيدك للبدء"
      >
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">لا يمكنك إنشاء طلب الآن</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground">
              للبدء في إنشاء طلبات جديدة، يجب عليك الاشتراك في إحدى الباقات أو شحن رصيد كريديت.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Link to="/client/plan">
                <Card className="p-6 hover:border-primary/50 transition-all cursor-pointer h-full">
                  <Crown className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">اشترك في باقة</h3>
                  <p className="text-sm text-muted-foreground">
                    احصل على كريديت شهري ومميزات إضافية
                  </p>
                </Card>
              </Link>

              <Link to="/client/wallet">
                <Card className="p-6 hover:border-primary/50 transition-all cursor-pointer h-full">
                  <CreditCard className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">اشحن رصيدك</h3>
                  <p className="text-sm text-muted-foreground">
                    اشتري كريديت واستخدمه حسب حاجتك
                  </p>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const selectedCategory = categories.find((c) => c.id === formData.category_id);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="طلب جديد"
      subtitle="اتبع الخطوات لإنشاء طلب جديد"
    >
      {/* Next steps modal بعد إنشاء الطلب */}
      <Dialog open={showNextStepsModal} onOpenChange={setShowNextStepsModal}>
        <DialogContent hideClose>
          <DialogHeader>
            <DialogTitle>تم إنشاء طلبك بنجاح</DialogTitle>
            <DialogDescription>
              فيما يلي الخطوات التالية لمتابعة طلبك والتفاعل معه.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-right text-sm">
            <p>1. يمكنك متابعة حالة طلبك من صفحة "طلباتي" أو صفحة تفاصيل الطلب.</p>
            <p>2. وقت الرد المتوقع يعتمد على حجم المهمة، لكن غالباً من بضع ساعات وحتى يوم عمل.</p>
            <p>3. من صفحة تفاصيل الطلب يمكنك:</p>
            <ul className="list-disc pr-6 space-y-1 text-muted-foreground">
              <li>متابعة حالة التنفيذ وتحديثات الفريق.</li>
              <li>إرسال رسائل وتعليقات إضافية على الطلب.</li>
              <li>تحميل الملفات التي يرسلها لك الفريق.</li>
            </ul>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              onClick={() => {
                const target = nextRequestUrl || "/client/requests";
                // Force full page reload and navigate to the request details page
                window.location.href = target;
              }}
            >
              فتح صفحة تفاصيل الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portfolio context banner */}
      {portfolioContext?.preferredFreelancerName && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              إنشاء طلب لفريلانسر: {portfolioContext.preferredFreelancerName}
            </p>
            {portfolioContext.service && (
              <p className="text-sm text-muted-foreground mt-1">
                خدمة: {portfolioContext.service.title}
                {portfolioContext.service.price_egp &&
                  ` — السعر المقترح: ${portfolioContext.service.price_egp} ج.م`}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            سيتم خصم الكريديت تلقائياً من رصيدك حسب حجم المهمة الذي تختاره.
          </p>
        </div>
      )}

      {/* Credits Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">رصيدك المتاح</p>
            <p className="text-sm text-muted-foreground">
              {subscriptionCredits > 0 && `${subscriptionCredits} كريديت من الباقة`}
              {subscriptionCredits > 0 && creditsBalance > 0 && " + "}
              {creditsBalance > 0 && `${creditsBalance} كريديت محفظة`}
              {totalAvailableCredits === 0 && "لا يوجد رصيد"}
            </p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-2xl font-bold text-primary">{subscriptionCredits}</p>
          <p className="text-xs text-muted-foreground">كريديت الباقة</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="card-elevated p-6 mb-8">
        <StepWizard steps={steps} currentStep={currentStep} />
      </div>

      {/* Form Content */}
      <div className="card-elevated p-8">
        {/* Step 1: Category Selection */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">اختر نوع الخدمة</h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const Icon = iconMap[category.icon || "FileText"] || FileText;
                const isSelected = formData.category_id === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, category_id: category.id }))
                    }
                    className={cn(
                      "p-6 rounded-xl border-2 text-right transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {category.name_ar}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-6">تفاصيل الطلب</h2>

            <div className="space-y-2">
              <Label htmlFor="title">عنوان الطلب *</Label>
              <Input
                id="title"
                placeholder="مثال: تصميم شعار لشركة تقنية"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف تفصيلي</Label>
              <Textarea
                id="description"
                placeholder="اشرح بالتفصيل اللي محتاجه... كل ما كان الوصف أوضح كل ما كانت النتيجة أفضل."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                نصيحة: اذكر الألوان المفضلة، الستايل المطلوب، أي أمثلة ملهمة
              </p>
            </div>

            <div className="space-y-2">
              <Label>حجم المهمة *</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeTaskSizes.map((size: any) => {
                  const isSelected = formData.size === size.id;
                  const canAfford = totalAvailableCredits >= size.credits;

                  return (
                    <button
                      key={size.id}
                      onClick={() =>
                        canAfford &&
                        setFormData((prev) => ({ ...prev, size: size.id }))
                      }
                      disabled={!canAfford}
                      className={cn(
                        "p-4 rounded-xl border-2 text-right transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : canAfford
                          ? "border-border hover:border-primary/30"
                          : "border-border opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-foreground">
                          {size.name}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            canAfford ? "text-primary" : "text-destructive"
                          )}
                        >
                          {size.credits} كريديت
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {size.description}
                      </p>
                      {!canAfford && (
                        <p className="text-xs text-destructive mt-1">
                          رصيد غير كافي
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">الموعد المطلوب (إجباري) *</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deadline: e.target.value }))
                }
                className="h-12"
                min={(() => {
                  const sizeConfig = (activeTaskSizes as any)?.find(
                    (s: any) => s.id === formData.size
                  );
                  const minDays =
                    sizeConfig?.min_days != null
                      ? Number(sizeConfig.min_days)
                      : 0;
                  const base = new Date();
                  base.setDate(base.getDate() + minDays);
                  return base.toISOString().split("T")[0];
                })()}
                max={(() => {
                  const sizeConfig = (activeTaskSizes as any)?.find(
                    (s: any) => s.id === formData.size
                  );
                  const maxDays =
                    sizeConfig?.max_days != null
                      ? Number(sizeConfig.max_days)
                      : null;
                  if (!maxDays) return undefined;
                  const base = new Date();
                  base.setDate(base.getDate() + maxDays);
                  return base.toISOString().split("T")[0];
                })()}
              />
            </div>

            {/* Goals Section */}
            <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    أهداف المهمة
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    حدد ما تريد تحقيقه (يمكنك إضافة حتى {maxGoals} هدف حسب حجم
                    المهمة)
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formData.goals.filter((g) => g.trim()).length} / {maxGoals}
                </span>
              </div>

              <div className="space-y-3">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                    </div>
                    <Input
                      placeholder={
                        index === 0
                          ? "الهدف الرئيسي (إجباري) *"
                          : `هدف إضافي ${index + 1} (اختياري)`
                      }
                      value={goal}
                      onChange={(e) => handleGoalChange(index, e.target.value)}
                      className={cn(
                        "flex-1",
                        index === 0 && !goal.trim() && "border-destructive/50"
                      )}
                    />
                    {formData.goals.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeGoal(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {formData.goals.length < maxGoals && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGoal}
                  className="w-full border-dashed"
                >
                  + إضافة هدف آخر
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Files */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              ارفع الملفات
            </h2>
            <p className="text-muted-foreground mb-6">
              ارفع أي ملفات مرجعية أو أمثلة تساعدنا في فهم طلبك بشكل أفضل
            </p>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,.pdf,.doc,.docx,.psd,.ai,.zip,.rar"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                ) : (
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                )}
                <p className="text-foreground font-medium mb-1">
                  {uploading ? "جاري الرفع..." : "اضغط لرفع الملفات"}
                </p>
                <p className="text-sm text-muted-foreground">
                  أو اسحب وأفلت الملفات هنا
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  الحد الأقصى: 50MB لكل ملف
                </p>
              </label>
            </div>

            {/* Uploaded Files List */}
            {formData.files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  الملفات المرفوعة ({formData.files.length})
                </p>
                {formData.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              مراجعة الطلب
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>ملخص الطلب</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">العنوان:</span>
                      <span className="font-medium max-w-[60%] text-right">
                        {formData.title || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نوع الخدمة:</span>
                      <span className="font-medium">
                        {selectedCategory?.name_ar || "غير محدد"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">حجم المهمة:</span>
                      <span className="font-medium">{selectedSize?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الموعد المطلوب:</span>
                      <span className="font-medium">
                        {formData.deadline || "غير محدد"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد الأهداف:</span>
                      <span className="font-medium">
                        {formData.goals.filter((g) => g.trim()).length} / {maxGoals}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الملفات المرفقة:</span>
                      <span className="font-medium">
                        {formData.files.length > 0
                          ? `${formData.files.length} ملف`
                          : "لا يوجد"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>الكريديت المستخدم</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">حجم المهمة:</span>
                      <span className="font-medium">{selectedSize?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الكريديت المطلوب:</span>
                      <span className="font-bold text-primary">
                        {requiredCredits} كريديت
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">رصيدك المتاح:</span>
                      <span className="font-medium">
                        {totalAvailableCredits} كريديت
                      </span>
                    </div>
                    {!hasEnoughCredits && (
                      <p className="text-xs text-destructive mt-2">
                        لا يوجد رصيد كافي، يرجى تقليل حجم المهمة أو شحن رصيدك.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>الوصف والأهداف</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">الوصف التفصيلي:</p>
                      <p className="whitespace-pre-wrap bg-muted/40 rounded-lg p-3 min-h-[80px]">
                        {formData.description || "لم يتم إدخال وصف"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">الأهداف:</p>
                      {formData.goals.filter((g) => g.trim()).length > 0 ? (
                        <ul className="list-disc pr-5 space-y-1">
                          {formData.goals
                            .filter((g) => g.trim())
                            .map((goal, index) => (
                              <li key={index}>{goal}</li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">لم يتم إدخال أهداف</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  سيتم خصم الكريديت مباشرة بعد تأكيد الطلب ولا يمكن استرجاعه إلا
                  عبر طلب استرجاع.
                </span>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowRight className="w-4 h-4 ml-2" />
                  رجوع
                </Button>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !hasEnoughCredits}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    <>
                      تأكيد وإرسال الطلب
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 3 && (
        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowRight className="w-4 h-4 ml-2" />
            رجوع
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 2 ? (
              <>
                مراجعة الطلب
                <ArrowLeft className="w-4 h-4 mr-2" />
              </>
            ) : (
              <>
                التالي
                <ArrowLeft className="w-4 h-4 mr-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
