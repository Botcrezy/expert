import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Users, 
  AlertTriangle,
  ArrowLeft,
  Clock,
  CheckCircle2,
  TrendingUp,
  Loader2,
  UserPlus,
  DollarSign,
  BarChart3,
  Briefcase,
  Award,
  MessageSquare,
  Bell
} from "lucide-react";

export default function AdminDashboard() {
  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalRequests },
        { count: pendingRequests },
        { count: assignedRequests },
        { count: completedRequests },
        { count: totalClients },
        { count: totalFreelancers },
        { count: verifiedFreelancers },
        { count: pendingFreelancers },
        { count: openDisputes },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from("requests").select("*", { count: "exact", head: true }),
        supabase.from("requests").select("*", { count: "exact", head: true }).in("status", ["submitted", "needs_info"]),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "assigned"),
        supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("freelancer_profiles").select("*", { count: "exact", head: true }),
        supabase.from("freelancer_profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("freelancer_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("disputes").select("*", { count: "exact", head: true }).in("status", ["opened", "under_review"]),
        supabase.from("orders").select("total").eq("status", "paid")
      ]);

      const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      return {
        totalRequests: totalRequests || 0,
        pendingRequests: pendingRequests || 0,
        assignedRequests: assignedRequests || 0,
        completedRequests: completedRequests || 0,
        totalClients: totalClients || 0,
        totalFreelancers: totalFreelancers || 0,
        verifiedFreelancers: verifiedFreelancers || 0,
        pendingFreelancers: pendingFreelancers || 0,
        openDisputes: openDisputes || 0,
        totalRevenue,
        completionRate: totalRequests ? Math.round((completedRequests || 0) / totalRequests * 100) : 0
      };
    },
  });

  // Fetch pending requests
  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-pending-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("requests")
        .select("*")
        .in("status", ["submitted", "needs_info", "approved"])
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch recent training submissions
  const { data: trainingSubmissions = [] } = useQuery({
    queryKey: ["admin-training-submissions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_assignments")
        .select("*, training_tasks(title)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(3);
      
      if (data && data.length > 0) {
        const freelancerIds = data.map(a => a.freelancer_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", freelancerIds);
        
        return data.map(a => ({
          ...a,
          freelancer_name: profiles?.find(p => p.user_id === a.freelancer_id)?.full_name || "غير معروف"
        }));
      }
      
      return [];
    },
  });

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  if (requestsLoading || statsLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="لوحة التحكم">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="لوحة التحكم"
      subtitle="مرحباً بك في لوحة إدارة Sity Experts"
    >
      {/* Alerts Section */}
      <div className="space-y-3 mb-8">
        {(stats?.pendingFreelancers || 0) > 0 && (
          <div className="bg-gradient-to-l from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-orange-800">فريلانسرز في انتظار الموافقة</p>
                <p className="text-sm text-orange-600">{stats?.pendingFreelancers} فريلانسر جديد ينتظر مراجعتك</p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Link to="/admin/freelancers/pending">مراجعة الطلبات</Link>
            </Button>
          </div>
        )}

        {(stats?.openDisputes || 0) > 0 && (
          <div className="bg-gradient-to-l from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">نزاعات تحتاج اهتمامك</p>
                <p className="text-sm text-red-600">{stats?.openDisputes} نزاع مفتوح يحتاج مراجعة</p>
              </div>
            </div>
            <Button asChild size="sm" variant="destructive">
              <Link to="/admin/disputes">عرض النزاعات</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white hover:bg-white/30">جديد</Badge>
            </div>
            <p className="text-3xl font-bold">{stats?.pendingRequests || 0}</p>
            <p className="text-blue-100 text-sm">طلبات في الانتظار</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats?.assignedRequests || 0}</p>
            <p className="text-purple-100 text-sm">قيد التنفيذ</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats?.completedRequests || 0}</p>
            <p className="text-green-100 text-sm">طلبات مكتملة</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold">{(stats?.totalRevenue || 0).toLocaleString()}</p>
            <p className="text-amber-100 text-sm">إجمالي الإيرادات (ج.م)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Pending Requests */}
        <div className="lg:col-span-2">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                طلبات في انتظار الإجراء
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/requests/queue">
                  عرض الكل
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>لا توجد طلبات في الانتظار! 🎉</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pendingRequests.map((request) => (
                    <Link 
                      key={request.id} 
                      to={`/admin/requests/${request.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">{request.request_number}</span>
                            <StatusBadge status={request.status as any} />
                          </div>
                          <h3 className="font-medium">{request.title}</h3>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatTimeAgo(request.created_at)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Training Submissions */}
        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-primary" />
              تسليمات التدريب
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingSubmissions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Award className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm">لا توجد تسليمات جديدة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainingSubmissions.map((submission: any) => (
                  <div key={submission.id} className="p-3 rounded-xl bg-muted/50">
                    <p className="font-medium text-sm">{submission.freelancer_name}</p>
                    <p className="text-xs text-muted-foreground">{submission.training_tasks?.title}</p>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full" size="sm">
                  <Link to="/admin/training">عرض الكل</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">معدل الإنجاز</span>
            </div>
            <p className="text-2xl font-bold">{stats?.completionRate || 0}%</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all" 
                style={{ width: `${stats?.completionRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">العملاء</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalClients || 0}</p>
            <p className="text-xs text-muted-foreground">مستخدم مسجل</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">الفريلانسرز</span>
            </div>
            <p className="text-2xl font-bold">{stats?.verifiedFreelancers || 0}</p>
            <p className="text-xs text-muted-foreground">من {stats?.totalFreelancers || 0} مسجل</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">إجمالي الطلبات</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalRequests || 0}</p>
            <p className="text-xs text-muted-foreground">طلب حتى الآن</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
