import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Wallet, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus,
  History
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ClientWallet() {
  const { user } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ["client-subscription", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Wallet credits (outside subscription)
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

  const { data: creditsLedger } = useQuery({
    queryKey: ["credits-ledger", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credits_ledger")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const subscriptionCredits = subscription?.credits_remaining || 0;
  const currentBalance = walletBalance || 0;
  const walletOnlyCredits = Math.max((walletBalance || 0) - subscriptionCredits, 0);
  const totalSpent =
    creditsLedger?.filter((t) => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="المحفظة"
      subtitle="إدارة رصيدك وكريديتات الخدمات"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="الرصيد الحالي"
          value={`${currentBalance} كريديت`}
          icon={Wallet}
        />
        <StatCard
          title="رصيد الاشتراك"
          value={`${subscriptionCredits} كريديت`}
          icon={CreditCard}
        />
        <StatCard
          title="رصيد المحفظة"
          value={`${walletOnlyCredits} كريديت`}
          icon={ArrowDownLeft}
        />
        <StatCard
          title="إجمالي المستخدم"
          value={`${totalSpent} كريديت`}
          icon={ArrowUpRight}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">إجراءات سريعة</h3>
            <div className="space-y-3">
              <Button className="w-full justify-start gap-2" asChild>
                <Link to="/client/checkout">
                  <Plus className="w-4 h-4" />
                  شراء كريديتات
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/client/checkout?type=subscription">
                  <CreditCard className="w-4 h-4" />
                  ترقية الباقة
                </Link>
              </Button>
            </div>
          </div>

          {/* Current Plan */}
          {subscription && (
            <div className="card-elevated p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">باقتك الحالية</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الباقة</span>
                  <span className="font-semibold">{(subscription?.plans as any)?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">كريديتات شهرية</span>
                  <span className="font-semibold">{(subscription?.plans as any)?.credits_per_month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">حد التعديلات</span>
                  <span className="font-semibold">{(subscription?.plans as any)?.revisions_limit}</span>
                </div>
                {subscription.expires_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">تنتهي في</span>
                    <span className="font-semibold">
                      {format(new Date(subscription.expires_at), "dd MMM yyyy", { locale: ar })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2 card-elevated">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">سجل المعاملات</h3>
          </div>
          
          <div className="divide-y divide-border">
            {creditsLedger && creditsLedger.length > 0 ? (
              creditsLedger.map((transaction) => (
                <div key={transaction.id} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      transaction.type === "credit" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {transaction.type === "credit" ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{transaction.reason || "معاملة"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-semibold ${
                      transaction.type === "credit" ? "text-success" : "text-destructive"
                    }`}>
                      {transaction.type === "credit" ? "+" : "-"}{Math.abs(transaction.amount)} كريديت
                    </p>
                    <p className="text-sm text-muted-foreground">
                      الرصيد: {transaction.balance_after}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Wallet className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد معاملات بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
