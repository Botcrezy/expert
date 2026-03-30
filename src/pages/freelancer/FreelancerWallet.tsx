import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { WithdrawalMethodsManager, WithdrawalMethod } from "@/components/freelancer/WithdrawalMethodsManager";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock,
  CheckCircle2,
  Loader2,
  BanknoteIcon
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FreelancerWallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["freelancer-full-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: walletLedger } = useQuery({
    queryKey: ["freelancer-wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_ledger")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["freelancer-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const withdrawalMethods = (profile?.withdrawal_methods as unknown as WithdrawalMethod[]) || [];
  const currentBalance = walletLedger?.[0]?.balance_after || 0;
  const pendingWithdrawals = withdrawals?.filter(w => w.status === "pending" || w.status === "approved") || [];
  const totalEarnings = profile?.total_earnings || 0;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!user || !withdrawAmount) throw new Error("بيانات ناقصة");

      const selectedMethod = withdrawalMethods.find(m => m.id === selectedMethodId);
      if (!selectedMethod && withdrawalMethods.length > 0) {
        throw new Error("يرجى اختيار طريقة السحب");
      }

      const amount = parseFloat(withdrawAmount);
      if (amount > currentBalance) throw new Error("الرصيد غير كافي");
      if (amount < 5100) throw new Error("الحد الأدنى للسحب 5,100 ج.م (ما يعادل 100 دولار) وفقاً لسياسات البنك المركزي المصري");

      const { data, error } = await supabase
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount,
          payment_method: selectedMethod?.type || "other",
          payment_details: selectedMethod
            ? {
                methodId: selectedMethod.id,
                methodName: selectedMethod.name,
                ...selectedMethod.details,
              }
            : null,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // In-app notification for freelancer
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "payment",
        title: "تم استلام طلب السحب",
        body: `مبلغ: ${amount} ج.م` ,
        reference_type: "withdrawal",
        reference_id: data.id,
      });

      // Telegram notification for admins (important event)
      const { notifyTelegramAdmin } = await import("@/lib/telegramAdminNotify");
      await notifyTelegramAdmin({
        eventKey: "admin_withdrawal_requested",
        reference: { type: "withdrawal", id: data.id },
        adminPath: `/admin/withdrawals`,
        data: {
          user_name: user.email || "Freelancer",
          amount: `${amount} EGP`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelancer-withdrawals"] });
      toast({
        title: "تم إرسال طلب السحب بنجاح! ✅",
        description: "سيتم مراجعة طلبك خلال 24-48 ساعة",
      });
      setDialogOpen(false);
      setWithdrawAmount("");
      setSelectedMethodId("");
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <DashboardLayout
      sidebar={<FreelancerSidebar />}
      title="المحفظة"
      subtitle="إدارة أرباحك وسحب أموالك"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="الرصيد المتاح"
          value={`${Number(currentBalance).toLocaleString()} ج.م`}
          icon={Wallet}
        />
        <StatCard
          title="إجمالي الأرباح"
          value={`${Number(totalEarnings).toLocaleString()} ج.م`}
          icon={ArrowDownLeft}
        />
        <StatCard
          title="في انتظار السحب"
          value={`${pendingWithdrawals.reduce((acc, w) => acc + Number(w.amount), 0).toLocaleString()} ج.م`}
          icon={Clock}
        />
        <StatCard
          title="المهام المكتملة"
          value={`${profile?.completed_tasks || 0}`}
          icon={CheckCircle2}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Withdraw Section */}
        <div className="space-y-6">
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BanknoteIcon className="w-5 h-5" />
              سحب الأرباح
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">الرصيد المتاح للسحب</p>
                <p className="text-3xl font-bold text-primary">{Number(currentBalance).toLocaleString()} ج.م</p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" disabled={currentBalance < 100 || withdrawalMethods.length === 0}>
                    <ArrowUpRight className="w-4 h-4" />
                    طلب سحب
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>طلب سحب جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>المبلغ (ج.م)</Label>
                      <Input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="الحد الأدنى 100 ج.م"
                        max={currentBalance}
                      />
                    </div>
                    
                    {withdrawalMethods.length > 0 && (
                      <div className="space-y-2">
                        <Label>طريقة السحب</Label>
                        <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طريقة السحب" />
                          </SelectTrigger>
                          <SelectContent>
                            {withdrawalMethods.map((method) => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name} ({method.type === "vodafone_cash" ? "فودافون كاش" : 
                                               method.type === "instapay" ? "انستاباي" :
                                               method.type === "bank_transfer" ? "بنك" : "عملات رقمية"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={() => withdrawMutation.mutate()}
                      disabled={withdrawMutation.isPending}
                    >
                      {withdrawMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        "تأكيد الطلب"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {withdrawalMethods.length === 0 && (
                <p className="text-xs text-destructive text-center">
                  يجب إضافة طريقة سحب أولاً
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center">
                الحد الأدنى للسحب 100 ج.م • يتم المعالجة خلال 24-48 ساعة
              </p>
            </div>

            {/* Pending Withdrawals */}
            {pendingWithdrawals.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-medium text-foreground mb-3">طلبات قيد المعالجة</h4>
                <div className="space-y-2">
                  {pendingWithdrawals.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-warning" />
                          <span>{Number(w.amount).toLocaleString()} ج.م</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {w.status === "pending" ? "قيد المراجعة" : "قيد الدفع"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(w.created_at), "dd MMM", { locale: ar })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Withdrawal Methods */}
          <div className="card-elevated p-6">
            <WithdrawalMethodsManager 
              methods={withdrawalMethods}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["freelancer-full-profile"] });
              }}
            />
          </div>
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2 card-elevated">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">سجل المعاملات</h3>
          </div>
          
          <div className="divide-y divide-border">
            {walletLedger && walletLedger.length > 0 ? (
              walletLedger.map((transaction) => (
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
                      {transaction.type === "credit" ? "+" : "-"}{Math.abs(Number(transaction.amount)).toLocaleString()} ج.م
                    </p>
                    <p className="text-sm text-muted-foreground">
                      الرصيد: {Number(transaction.balance_after).toLocaleString()}
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
