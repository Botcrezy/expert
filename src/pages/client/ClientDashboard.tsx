import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  PlusCircle,
  ArrowLeft,
  Calendar,
  Loader2,
  Crown,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIdentityVerificationStatus } from "@/hooks/useVerificationSettings";
import { VerificationAlert } from "@/components/notifications/VerificationAlert";
import { useTableSubscription } from "@/hooks/useRealtimeSubscription";

export default function ClientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["client-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("requests")
        .select("*, categories(name_ar)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: subscription } = useQuery({
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

  // Fetch credit balance from ledger only (wallet credits, not subscription)
  const { data: walletBalance } = useQuery({
    queryKey: ["wallet-balance", user?.id],
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
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeRequests = requests.filter(r => 
    !["completed", "cancelled"].includes(r.status)
  ).length;

  const completedRequests = requests.filter(r => r.status === "completed").length;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "اليوم";
    if (days === 1) return "أمس";
    if (days < 7) return `منذ ${days} أيام`;
    return d.toLocaleDateString("ar-EG");
  };

  // Identity verification status
  const { data: verificationStatus } = useIdentityVerificationStatus(user?.id, "client");

  // Realtime updates for identity verification status
  useTableSubscription(
    "identity_verifications",
    [
      ["identity-status", user?.id, "client"],
      ["identity-verification", user?.id],
    ],
    {
      event: "*",
      filter: user ? `user_id=eq.${user.id}` : undefined,
    }
  );

  const currentPlan = subscription?.plans as any;
  const hasActiveSubscription = !!subscription;
  
  // Subscription credits are separate from wallet credits
  const subscriptionCredits = subscription?.credits_remaining || 0;
  const walletCredits = walletBalance || 0;
  // Total credits available = subscription credits + wallet credits
  const totalCredits = subscriptionCredits + walletCredits;
  
  const hasCredits = totalCredits > 0;
  const canCreateRequest = hasActiveSubscription || hasCredits;

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  // Determine verification alert status
  const getVerificationAlertStatus = () => {
    if (!verificationStatus) return null;
    if (verificationStatus.verified) return null;
    if (verificationStatus.pending) return "pending" as const;
    if (verificationStatus.rejected) return "rejected" as const;
    if (verificationStatus.required) return "required" as const;
    return null;
  };

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title={`مرحباً، ${profile?.full_name || "عميل"}! 👋`}
      subtitle="إليك ملخص نشاطك على المنصة"
    >
      {/* Verification Alert */}
      <VerificationAlert status={getVerificationAlertStatus()} userType="client" />

      {/* Warning if no subscription */}
      {!canCreateRequest && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">لا يوجد رصيد أو اشتراك نشط</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">اشترك في باقة أو اشحن كريديت لتتمكن من إنشاء طلبات</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/client/plan">اشترك الآن</Link>
          </Button>
        </div>
      )}

      {/* User Profile Card */}
      <div className="card-elevated p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(profile?.full_name || "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{profile?.full_name}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-blue-100 text-blue-700">عميل</Badge>
                {currentPlan && (
                  <Badge className="bg-primary/10 text-primary">
                    <Crown className="w-3 h-3 ml-1" />
                    {currentPlan.name_ar}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/client/settings">تعديل الملف</Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="الطلبات النشطة"
          value={activeRequests}
          icon={FileText}
        />
        <StatCard
          title="في انتظار التسليم"
          value={requests.filter(r => r.status === "ready_for_qc" || r.status === "delivered_to_client").length}
          icon={Clock}
        />
        <StatCard
          title="الطلبات المكتملة"
          value={completedRequests}
          icon={CheckCircle2}
        />
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <Link to="/client/plan" className="text-xs text-primary hover:underline">
              ترقية
            </Link>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {totalCredits}
          </p>
          <p className="text-sm text-muted-foreground">الكريديت المتبقي</p>
          {subscriptionCredits > 0 && walletCredits > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              ({subscriptionCredits} اشتراك + {walletCredits} محفظة)
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link 
          to={canCreateRequest ? "/client/create-request" : "/client/plan"} 
          className="card-elevated p-6 hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">طلب جديد</h3>
              <p className="text-sm text-muted-foreground">
                {canCreateRequest ? "ابدأ مشروع جديد" : "اشترك أولاً"}
              </p>
            </div>
          </div>
        </Link>
        
        <Link to="/client/requests" className="card-elevated p-6 hover:border-primary/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">متابعة الطلبات</h3>
              <p className="text-sm text-muted-foreground">شوف كل طلباتك</p>
            </div>
          </div>
        </Link>
        
        <Link to="/client/plan" className="card-elevated p-6 hover:border-primary/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {hasActiveSubscription ? "ترقية الباقة" : "اشترك الآن"}
              </h3>
              <p className="text-sm text-muted-foreground">احصل على كريديت أكتر</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Subscription Info */}
      {subscription && currentPlan && (
        <div className="card-elevated p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              باقتك الحالية
            </h3>
            <Button variant="outline" size="sm" asChild>
              <Link to="/client/plan">تفاصيل الباقة</Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{subscription.credits_remaining}</p>
              <p className="text-sm text-muted-foreground">كريديت متبقي</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{currentPlan.credits_per_month}</p>
              <p className="text-sm text-muted-foreground">كريديت شهري</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {currentPlan.revisions_limit - subscription.revisions_used}
              </p>
              <p className="text-sm text-muted-foreground">تعديلات متبقية</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{currentPlan.sla_hours || "∞"}</p>
              <p className="text-sm text-muted-foreground">ساعة SLA</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div className="card-elevated">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">آخر الطلبات</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/client/requests">
              عرض الكل
              <ArrowLeft className="w-4 h-4 mr-1" />
            </Link>
          </Button>
        </div>
        
        {requestsLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">لا توجد طلبات بعد</p>
            {canCreateRequest && (
              <Button asChild>
                <Link to="/client/create-request">إنشاء طلب جديد</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map((request) => (
              <Link 
                key={request.id} 
                to={`/client/requests/${request.id}`}
                className="flex items-center justify-between p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{request.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {(request.categories as { name_ar: string } | null)?.name_ar || "غير مصنف"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <StatusBadge status={request.status as "submitted" | "in_progress" | "completed"} />
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(request.created_at)}
                  </span>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Page Documentation */}
      <div className="mt-8 card-elevated p-6 space-y-2 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">شرح الصفحة وطريقة الاستخدام</h2>
        <p>
          هذه الصفحة تعرض لك ملخص سريع عن حسابك كعميل: بياناتك الأساسية، حالة رصيد الكريديت والاشتراك،
          وأحدث الطلبات التي قمت بإنشائها.
        </p>
        <p>
          استخدم أزرار الإجراءات السريعة في الأعلى لإنشاء طلب جديد، متابعة الطلبات الحالية، أو إدارة الباقة
          والرصيد. يمكنك الضغط على أي طلب في جدول "آخر الطلبات" لفتح صفحة تفاصيل الطلب ومتابعة التنفيذ
          أو إضافة ملاحظات.
        </p>
        <p>
          في حال عدم وجود رصيد أو اشتراك نشط، ستظهر لك رسالة تنبيه في أعلى الصفحة توضح طريقة الاشتراك
          أو شحن الكريديت لبدء استخدام المنصة.
        </p>
      </div>
    </DashboardLayout>
  );
}
