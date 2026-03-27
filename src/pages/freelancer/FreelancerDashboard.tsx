import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIdentityVerificationStatus } from "@/hooks/useVerificationSettings";
import { VerificationAlert } from "@/components/notifications/VerificationAlert";
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Wallet,
  ArrowLeft,
  Calendar,
  Loader2,
  Star
} from "lucide-react";
import { useTableSubscription } from "@/hooks/useRealtimeSubscription";

export default function FreelancerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check freelancer verification status
  const { data: freelancerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["freelancer-verification", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Redirect to pending page if not verified, or to portfolio setup if portfolio غير مكتمل
  useEffect(() => {
    if (!profileLoading && freelancerProfile) {
      if (!freelancerProfile.is_verified || freelancerProfile.verification_status !== "approved") {
        navigate("/freelancer/account-pending", { replace: true });
        return;
      }
    }
  }, [freelancerProfile, profileLoading, navigate]);

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["freelancer-profile", user?.id],
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

  // Fetch active assignments
  const { data: activeAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["freelancer-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("assignments")
        .select(`
          *,
          requests(id, title, request_number, status, deadline, profiles!requests_user_id_fkey(full_name))
        `)
        .eq("freelancer_id", user.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch wallet balance
  const { data: walletBalance } = useQuery({
    queryKey: ["freelancer-dashboard-wallet", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("wallet_ledger")
        .select("balance_after")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.balance_after || 0;
    },
    enabled: !!user,
  });

  // Identity verification status
  const { data: verificationStatus } = useIdentityVerificationStatus(user?.id, "freelancer");

  // Realtime updates for identity verification status
  useTableSubscription(
    "identity_verifications",
    [
      ["identity-status", user?.id, "freelancer"],
      ["freelancer-identity-verification", user?.id],
    ],
    {
      event: "*",
      filter: user ? `user_id=eq.${user.id}` : undefined,
    }
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
    });
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

  if (assignmentsLoading) {
    return (
      <DashboardLayout sidebar={<FreelancerSidebar />} title="لوحة التحكم">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const activeTasks = activeAssignments.filter(a => {
    const request = a.requests as any;
    return request && ["assigned", "in_progress"].includes(request.status);
  });

  const completedTasks = freelancerProfile?.completed_tasks || 0;

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title={`مرحباً، ${profile?.full_name || "فريلانسر"}! 👋`}
      subtitle="إليك ملخص نشاطك على المنصة"
    >
      {/* Verification Alert */}
      <VerificationAlert status={getVerificationAlertStatus()} userType="freelancer" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="المهام النشطة"
          value={activeTasks.length}
          icon={ClipboardList}
        />
        <StatCard
          title="في انتظار القبول"
          value={activeAssignments.filter(a => !a.started_at).length}
          icon={Clock}
        />
        <StatCard
          title="المهام المكتملة"
          value={completedTasks}
          icon={CheckCircle2}
        />
        <StatCard
          title="النجوم"
          value={freelancerProfile?.stars || 0}
          icon={Star}
        />
        <StatCard
          title="الرصيد المتاح"
          value={`${walletBalance?.toLocaleString() || 0} ج.م`}
          icon={Wallet}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Active Tasks */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">المهام النشطة</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/freelancer/tasks">
                عرض الكل
                <ArrowLeft className="w-4 h-4 mr-1" />
              </Link>
            </Button>
          </div>
          
          {activeTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد مهام نشطة حالياً
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeTasks.slice(0, 5).map((assignment) => {
                const request = assignment.requests as any;
                const client = request?.profiles as { full_name: string } | null;
                
                return (
                  <Link 
                    key={assignment.id} 
                    to={`/freelancer/tasks/${assignment.id}`}
                    className="flex items-center justify-between p-6 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">{request?.request_number}</span>
                        <StatusBadge status={request?.status || "assigned"} />
                      </div>
                      <h3 className="font-medium text-foreground">{request?.title}</h3>
                      <p className="text-sm text-muted-foreground">{client?.full_name}</p>
                    </div>
                    
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{assignment.payment_amount} ج.م</p>
                      {request?.deadline && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(request.deadline)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">أداؤك</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold">
                    {freelancerProfile?.rating ? freelancerProfile.rating.toFixed(1) : "N/A"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">متوسط التقييم</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold">{completedTasks}</span>
                </div>
                <p className="text-sm text-muted-foreground">مهام مكتملة</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold">
                    {freelancerProfile?.total_earnings?.toLocaleString() || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح (ج.م)</p>
              </div>
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  freelancerProfile?.is_available 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600" 
                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                }`}>
                  <span className="text-sm font-bold">
                    {freelancerProfile?.is_available ? "متاح" : "مشغول"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">الحالة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Documentation */}
      <div className="mt-8 card-elevated p-6 space-y-2 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">شرح الصفحة وطريقة الاستخدام</h2>
        <p>
          في هذه الصفحة تشاهد ملخصاً سريعاً لوضعك كفريلانسر على المنصة: عدد المهام النشطة، المهام المكتملة،
          تقييمك العام، وإجمالي أرباحك بالإضافة إلى رصيد المحفظة.
        </p>
        <p>
          من قسم "المهام النشطة" يمكنك الضغط على أي مهمة للانتقال مباشرة إلى صفحة تفاصيل المهمة وبدء العمل
          أو تسليمها. استخدم زر "عرض الكل" للوصول إلى قائمة جميع المهام.
        </p>
        <p>
          قسم "أداؤك" يساعدك على متابعة تقدمك، تقييم العملاء لك، وحالتك الحالية (متاح أو مشغول) حتى تدير
          وقتك بشكل أفضل وتحافظ على أداء ثابت وجودة عالية.
        </p>
      </div>
    </DashboardLayout>
  );
}
