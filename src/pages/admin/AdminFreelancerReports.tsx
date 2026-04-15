import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Star, TrendingUp, Clock, CheckCircle2, BarChart3, Users } from "lucide-react";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminFreelancerReports() {
  const [period, setPeriod] = useState("30");

  const { data: freelancersData, isLoading } = useQuery({
    queryKey: ["freelancer-performance-reports", period],
    queryFn: async () => {
      const daysAgo = parseInt(period);
      const startDate = subDays(new Date(), daysAgo).toISOString();

      // Get freelancer profiles with profile names
      const { data: freelancers } = await supabase
        .from("freelancer_profiles")
        .select("user_id, stars, completed_tasks, is_available, rating, bio, categories")
        .eq("is_verified", true);

      if (!freelancers?.length) return [];

      const userIds = freelancers.map(f => f.user_id);

      // Get names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      // Get assignments in period
      const { data: assignments } = await supabase
        .from("assignments")
        .select("freelancer_id, assigned_at, completed_at, is_active, payment_amount")
        .in("freelancer_id", userIds)
        .gte("assigned_at", startDate);

      // Get deliveries in period
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("freelancer_id, status, created_at")
        .in("freelancer_id", userIds)
        .gte("created_at", startDate);

      return freelancers.map(f => {
        const name = profiles?.find(p => p.user_id === f.user_id)?.full_name || "غير معروف";
        const fAssignments = assignments?.filter(a => a.freelancer_id === f.user_id) || [];
        const fDeliveries = deliveries?.filter(d => d.freelancer_id === f.user_id) || [];
        
        const completedInPeriod = fAssignments.filter(a => a.completed_at).length;
        const activeCount = fAssignments.filter(a => a.is_active).length;
        const totalEarnings = fAssignments.reduce((sum, a) => sum + (a.payment_amount || 0), 0);
        const approvedDeliveries = fDeliveries.filter(d => d.status === "approved").length;
        const rejectedDeliveries = fDeliveries.filter(d => d.status === "rejected").length;
        const totalDeliveries = approvedDeliveries + rejectedDeliveries;
        const approvalRate = totalDeliveries > 0 ? Math.round((approvedDeliveries / totalDeliveries) * 100) : 0;

        // Average delivery speed (days)
        const completedWithDates = fAssignments.filter(a => a.completed_at && a.assigned_at);
        const avgDays = completedWithDates.length > 0
          ? Math.round(completedWithDates.reduce((sum, a) => {
              const diff = new Date(a.completed_at!).getTime() - new Date(a.assigned_at).getTime();
              return sum + diff / (1000 * 60 * 60 * 24);
            }, 0) / completedWithDates.length)
          : 0;

        return {
          user_id: f.user_id,
          name,
          stars: f.stars || 0,
          completed_tasks: f.completed_tasks,
          is_available: f.is_available,
          completedInPeriod,
          activeCount,
          totalEarnings,
          approvalRate,
          avgDays,
          totalDeliveries,
        };
      }).sort((a, b) => b.completedInPeriod - a.completedInPeriod);
    },
  });

  const topPerformers = freelancersData?.slice(0, 10) || [];

  const chartData = topPerformers.map(f => ({
    name: f.name.split(" ")[0],
    مهام: f.completedInPeriod,
    أرباح: f.totalEarnings,
  }));

  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              تقارير أداء الفريلانسرز
            </h1>
            <p className="text-muted-foreground">تقارير الإنتاجية والأداء</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 3 شهور</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{freelancersData?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">فريلانسر نشط</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {freelancersData?.reduce((s, f) => s + f.completedInPeriod, 0) || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">مهمة مكتملة</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {freelancersData?.length ? Math.round(freelancersData.reduce((s, f) => s + f.approvalRate, 0) / freelancersData.length) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">متوسط معدل القبول</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {freelancersData?.filter(f => f.avgDays > 0).length
                      ? Math.round(freelancersData.filter(f => f.avgDays > 0).reduce((s, f) => s + f.avgDays, 0) / freelancersData.filter(f => f.avgDays > 0).length)
                      : 0} يوم
                  </p>
                  <p className="text-sm text-muted-foreground">متوسط وقت التسليم</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>أفضل 10 فريلانسرز</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="مهام" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Freelancers Table */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {freelancersData?.map((f) => (
                    <div key={f.user_id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">{f.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium">{f.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            <span>{f.stars} نجوم</span>
                            <span>•</span>
                            <span>{f.completed_tasks} مهمة إجمالي</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-lg">{f.completedInPeriod}</p>
                          <p className="text-muted-foreground">مكتملة</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{f.approvalRate}%</p>
                          <p className="text-muted-foreground">معدل القبول</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{f.avgDays || "-"}</p>
                          <p className="text-muted-foreground">أيام تسليم</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{f.totalEarnings} ج.م</p>
                          <p className="text-muted-foreground">أرباح</p>
                        </div>
                        <Badge variant={f.is_available ? "default" : "secondary"}>
                          {f.is_available ? "متاح" : "مشغول"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
