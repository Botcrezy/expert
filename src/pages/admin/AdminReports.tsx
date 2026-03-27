import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign,
  Calendar,
  Loader2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ar } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminReports() {
  const [period, setPeriod] = useState("30");

  // Fetch orders/revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["admin-revenue-report", period],
    queryFn: async () => {
      const daysAgo = parseInt(period);
      const startDate = subDays(new Date(), daysAgo);
      
      const { data: orders } = await supabase
        .from("orders")
        .select("total, created_at, status")
        .gte("created_at", startDate.toISOString())
        .eq("status", "paid")
        .order("created_at", { ascending: true });

      // Group by date
      const grouped: Record<string, number> = {};
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), "MM/dd");
        grouped[date] = (grouped[date] || 0) + Number(order.total);
      });

      return Object.entries(grouped).map(([date, total]) => ({
        date,
        revenue: total,
      }));
    },
  });

  // Fetch requests data
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-requests-report", period],
    queryFn: async () => {
      const daysAgo = parseInt(period);
      const startDate = subDays(new Date(), daysAgo);
      
      const { data: requests } = await supabase
        .from("requests")
        .select("created_at, status")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Group by date
      const grouped: Record<string, { total: number; completed: number }> = {};
      requests?.forEach(request => {
        const date = format(new Date(request.created_at), "MM/dd");
        if (!grouped[date]) grouped[date] = { total: 0, completed: 0 };
        grouped[date].total += 1;
        if (request.status === "completed") grouped[date].completed += 1;
      });

      return Object.entries(grouped).map(([date, data]) => ({
        date,
        total: data.total,
        completed: data.completed,
      }));
    },
  });

  // Fetch users growth data
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-report", period],
    queryFn: async () => {
      const daysAgo = parseInt(period);
      const startDate = subDays(new Date(), daysAgo);
      
      const { data: users } = await supabase
        .from("user_roles")
        .select("created_at, role")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      // Group by date
      const grouped: Record<string, { clients: number; freelancers: number }> = {};
      users?.forEach(user => {
        const date = format(new Date(user.created_at), "MM/dd");
        if (!grouped[date]) grouped[date] = { clients: 0, freelancers: 0 };
        if (user.role === "client") grouped[date].clients += 1;
        if (user.role === "freelancer") grouped[date].freelancers += 1;
      });

      return Object.entries(grouped).map(([date, data]) => ({
        date,
        clients: data.clients,
        freelancers: data.freelancers,
      }));
    },
  });

  // Fetch status distribution
  const { data: statusData } = useQuery({
    queryKey: ["admin-status-report"],
    queryFn: async () => {
      const { data: requests } = await supabase
        .from("requests")
        .select("status");

      const counts: Record<string, number> = {};
      requests?.forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });

      const statusLabels: Record<string, string> = {
        submitted: "جديدة",
        approved: "معتمدة",
        assigned: "معينة",
        in_progress: "قيد التنفيذ",
        completed: "مكتملة",
        cancelled: "ملغاة",
      };

      return Object.entries(counts).map(([status, count]) => ({
        name: statusLabels[status] || status,
        value: count,
      }));
    },
  });

  // Fetch summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ["admin-summary-stats", period],
    queryFn: async () => {
      const daysAgo = parseInt(period);
      const startDate = subDays(new Date(), daysAgo);
      const previousStartDate = subDays(startDate, daysAgo);

      // Current period
      const [ordersNow, requestsNow, usersNow] = await Promise.all([
        supabase.from("orders").select("total").eq("status", "paid").gte("created_at", startDate.toISOString()),
        supabase.from("requests").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()),
        supabase.from("user_roles").select("id", { count: "exact" }).gte("created_at", startDate.toISOString()),
      ]);

      // Previous period
      const [ordersPrev, requestsPrev, usersPrev] = await Promise.all([
        supabase.from("orders").select("total").eq("status", "paid").gte("created_at", previousStartDate.toISOString()).lt("created_at", startDate.toISOString()),
        supabase.from("requests").select("id", { count: "exact" }).gte("created_at", previousStartDate.toISOString()).lt("created_at", startDate.toISOString()),
        supabase.from("user_roles").select("id", { count: "exact" }).gte("created_at", previousStartDate.toISOString()).lt("created_at", startDate.toISOString()),
      ]);

      const revenueNow = ordersNow.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const revenuePrev = ordersPrev.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        revenue: { value: revenueNow, change: calcChange(revenueNow, revenuePrev) },
        requests: { value: requestsNow.count || 0, change: calcChange(requestsNow.count || 0, requestsPrev.count || 0) },
        users: { value: usersNow.count || 0, change: calcChange(usersNow.count || 0, usersPrev.count || 0) },
      };
    },
  });

  const isLoading = revenueLoading || requestsLoading || usersLoading;

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<AdminSidebar />} title="التقارير">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="التقارير والإحصائيات"
      subtitle="عرض تفصيلي لأداء المنصة"
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 3 أشهر</SelectItem>
              <SelectItem value="365">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline">
          <Download className="w-4 h-4 ml-2" />
          تصدير التقرير
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-foreground">{summaryStats?.revenue.value.toLocaleString()} ج.م</p>
            </div>
          </div>
          <div className={`text-sm ${(summaryStats?.revenue.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(summaryStats?.revenue.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(summaryStats?.revenue.change || 0)}% عن الفترة السابقة
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-chart-2/10 text-chart-2 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-foreground">{summaryStats?.requests.value}</p>
            </div>
          </div>
          <div className={`text-sm ${(summaryStats?.requests.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(summaryStats?.requests.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(summaryStats?.requests.change || 0)}% عن الفترة السابقة
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-chart-3/10 text-chart-3 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مستخدمون جدد</p>
              <p className="text-2xl font-bold text-foreground">{summaryStats?.users.value}</p>
            </div>
          </div>
          <div className={`text-sm ${(summaryStats?.users.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(summaryStats?.users.change || 0) >= 0 ? '↑' : '↓'} {Math.abs(summaryStats?.users.change || 0)}% عن الفترة السابقة
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            الإيرادات
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'الإيرادات']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requests Chart */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-chart-2" />
            الطلبات
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestsData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="total" name="إجمالي" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="مكتملة" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Users Growth Chart */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-chart-3" />
            نمو المستخدمين
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="clients" name="عملاء" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-3))' }} />
                <Line type="monotone" dataKey="freelancers" name="فريلانسرز" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-4))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">توزيع حالات الطلبات</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
