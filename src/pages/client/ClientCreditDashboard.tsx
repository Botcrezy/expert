import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Plus,
} from "lucide-react";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function ClientCreditDashboard() {
  const { user } = useAuth();

  // Get subscription and credits
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["client-subscription-details", user?.id],
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

  // Get credit transactions
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["credit-transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("credits_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
  });

  // Get requests for usage stats
  const { data: requests } = useQuery({
    queryKey: ["client-requests-stats", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("requests")
        .select("credits_cost, created_at, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = subLoading || txLoading;

  // Calculate stats
  const currentBalance = subscription?.credits_remaining || 0;
  const totalEarned = transactions
    ?.filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalSpent = transactions
    ?.filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) || 0;

  // Prepare chart data - usage over time
  const usageData = transactions
    ?.filter(t => t.type === 'debit')
    .slice(0, 30)
    .reverse()
    .map(t => ({
      date: format(new Date(t.created_at), "dd/MM"),
      amount: Math.abs(Number(t.amount)),
    })) || [];

  // Usage by category
  const usageByCategory = [
    { name: "طلبات", value: requests?.filter(r => r.status !== 'cancelled').length || 0 },
    { name: "تعديلات", value: subscription?.revisions_used || 0 },
    { name: "إضافات", value: 0 },
  ];

  // Monthly stats
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStr = format(date, "MMM", { locale: ar });
    
    const monthTransactions = transactions?.filter(t => {
      const tDate = new Date(t.created_at);
      return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
    }) || [];

    return {
      month: monthStr,
      earned: monthTransactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0),
      spent: Math.abs(monthTransactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)),
    };
  });

  if (isLoading) {
    return (
      <DashboardLayout sidebar={<ClientSidebar />} title="إدارة الكريديت">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="إدارة الكريديت"
      subtitle="تتبع رصيدك وتاريخ المعاملات"
    >
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-xs text-muted-foreground">الرصيد الحالي</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{currentBalance}</p>
          <p className="text-sm text-muted-foreground">كريديت متاح</p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{totalEarned}</p>
          <p className="text-sm text-muted-foreground">إجمالي المكتسب</p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
            <ArrowDownRight className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-foreground">{totalSpent}</p>
          <p className="text-sm text-muted-foreground">إجمالي المستخدم</p>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{requests?.length || 0}</p>
          <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Usage Over Time */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              استخدام الكريديت
            </h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
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
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-chart-2" />
              المقارنة الشهرية
            </h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="earned" name="مكتسب" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" name="مستخدم" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions + Transactions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4">إجراءات سريعة</h3>
          <div className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/client/checkout">
                <Plus className="w-4 h-4 ml-2" />
                شراء كريديتات
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/client/create-request">
                <FileText className="w-4 h-4 ml-2" />
                طلب جديد
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/client/plan">
                <CreditCard className="w-4 h-4 ml-2" />
                ترقية الباقة
              </Link>
            </Button>
          </div>

          {subscription?.plans && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">الباقة الحالية</p>
              <p className="font-semibold text-lg">{(subscription.plans as any).name_ar}</p>
              <p className="text-sm text-muted-foreground">
                {subscription.credits_remaining} كريديت متبقي
              </p>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4">آخر المعاملات</h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {transactions?.slice(0, 10).map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'credit' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {tx.type === 'credit' ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.reason || (tx.type === 'credit' ? 'إضافة رصيد' : 'استخدام رصيد')}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{Math.abs(Number(tx.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الرصيد: {tx.balance_after}
                  </p>
                </div>
              </div>
            ))}

            {(!transactions || transactions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد معاملات بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
