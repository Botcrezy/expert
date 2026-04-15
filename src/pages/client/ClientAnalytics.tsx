import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  DollarSign,
  Calendar,
  Loader2,
  Star,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ClientAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["client-analytics", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // All requests
      const { data: allRequests } = await supabase
        .from("requests")
        .select("id, status, created_at, category_id, categories(name_ar)")
        .eq("user_id", user.id);

      // Orders
      const { data: orders } = await supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "paid");

      // Assignments for delivery time
      const requestIds = allRequests?.map(r => r.id) || [];
      let avgDeliveryHours = 0;
      if (requestIds.length > 0) {
        const { data: assignments } = await supabase
          .from("assignments")
          .select("assigned_at, completed_at, started_at, request_id")
          .in("request_id", requestIds)
          .not("completed_at", "is", null);

        if (assignments && assignments.length > 0) {
          let total = 0, count = 0;
          assignments.forEach(a => {
            const start = new Date(a.started_at || a.assigned_at).getTime();
            const end = new Date(a.completed_at!).getTime();
            const hours = (end - start) / (1000 * 60 * 60);
            if (hours > 0 && hours < 720) { total += hours; count++; }
          });
          avgDeliveryHours = count > 0 ? Math.round(total / count) : 0;
        }
      }

      const totalRequests = allRequests?.length || 0;
      const completed = allRequests?.filter(r => r.status === "completed").length || 0;
      const active = allRequests?.filter(r => !["completed", "cancelled"].includes(r.status)).length || 0;
      const cancelled = allRequests?.filter(r => r.status === "cancelled").length || 0;
      const totalSpent = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      // Category breakdown
      const categoryMap: Record<string, number> = {};
      allRequests?.forEach(r => {
        const catName = (r.categories as any)?.name_ar || "غير مصنف";
        categoryMap[catName] = (categoryMap[catName] || 0) + 1;
      });
      const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Monthly spending
      const monthlySpend: Record<string, number> = {};
      orders?.forEach(o => {
        const month = new Date(o.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short" });
        monthlySpend[month] = (monthlySpend[month] || 0) + Number(o.total);
      });

      // Status breakdown
      const statusMap: Record<string, number> = {};
      allRequests?.forEach(r => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
      });

      return {
        totalRequests,
        completed,
        active,
        cancelled,
        completionRate: totalRequests > 0 ? Math.round((completed / totalRequests) * 100) : 0,
        avgDeliveryHours,
        totalSpent,
        topCategories,
        monthlySpend,
        statusMap,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    submitted: "قيد المراجعة",
    approved: "معتمد",
    in_progress: "قيد التنفيذ",
    ready_for_qc: "جاهز للمراجعة",
    revision_requested: "طلب تعديل",
    delivered_to_client: "تم التسليم",
    completed: "مكتمل",
    cancelled: "ملغي",
  };

  const statusColors: Record<string, string> = {
    submitted: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    ready_for_qc: "bg-purple-100 text-purple-700",
    revision_requested: "bg-orange-100 text-orange-700",
    delivered_to_client: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="التحليلات والإحصائيات"
      subtitle="نظرة شاملة على نشاطك ومشاريعك"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Top Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="إجمالي الطلبات" value={stats.totalRequests} icon={FileText} />
            <StatCard title="الطلبات المكتملة" value={stats.completed} icon={CheckCircle2} />
            <StatCard title="متوسط وقت التسليم" value={`${stats.avgDeliveryHours} ساعة`} icon={Clock} />
            <StatCard title="إجمالي الإنفاق" value={`${stats.totalSpent.toLocaleString()} ج.م`} icon={DollarSign} />
          </div>

          {/* Completion Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                معدل إنجاز المشاريع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={stats.completionRate} className="flex-1" />
                <span className="text-2xl font-bold text-primary">{stats.completionRate}%</span>
              </div>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                <span>{stats.completed} مكتمل</span>
                <span>{stats.active} نشط</span>
                <span>{stats.cancelled} ملغي</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  توزيع حالات الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.statusMap).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge className={statusColors[status] || "bg-muted text-muted-foreground"}>
                        {statusLabels[status] || status}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${(count / stats.totalRequests) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-left">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  أكثر الخدمات طلباً
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topCategories.length === 0 ? (
                  <p className="text-muted-foreground text-sm">لا توجد بيانات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topCategories.map(([name, count], i) => (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary w-5">{i + 1}.</span>
                          <span className="text-sm">{name}</span>
                        </div>
                        <Badge variant="secondary">{count} طلب</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Spending */}
          {Object.keys(stats.monthlySpend).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  الإنفاق الشهري
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.monthlySpend).map(([month, amount]) => (
                    <div key={month} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{month}</span>
                      <span className="font-semibold">{amount.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </DashboardLayout>
  );
}
