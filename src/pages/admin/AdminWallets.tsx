import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Wallet, 
  Search,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  Users
} from "lucide-react";
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

export default function AdminWallets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user: adminUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-wallet-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      
      // Get subscriptions separately
      const { data: subscriptions } = await supabase
        .from("client_subscriptions")
        .select("user_id, credits_remaining")
        .eq("is_active", true);
      
      return (profiles || []).map(p => ({
        ...p,
        credits_remaining: subscriptions?.find(s => s.user_id === p.user_id)?.credits_remaining || 0
      }));
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ["admin-recent-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credits_ledger")
        .select("*, profiles!credits_ledger_user_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !amount) throw new Error("بيانات ناقصة");

      // Get current balance
      const { data: subscription } = await supabase
        .from("client_subscriptions")
        .select("credits_remaining")
        .eq("user_id", selectedUser)
        .eq("is_active", true)
        .maybeSingle();

      const currentBalance = subscription?.credits_remaining || 0;
      const amountNum = parseInt(amount);
      const newBalance = transactionType === "credit" 
        ? currentBalance + amountNum 
        : currentBalance - amountNum;

      // Create ledger entry
      const { error: ledgerError } = await supabase
        .from("credits_ledger")
        .insert({
          user_id: selectedUser,
          amount: transactionType === "credit" ? amountNum : -amountNum,
          type: transactionType,
          balance_after: newBalance,
          reason,
          created_by: adminUser?.id,
        });

      if (ledgerError) throw ledgerError;

      // Update subscription balance
      if (subscription) {
        await supabase
          .from("client_subscriptions")
          .update({ credits_remaining: newBalance })
          .eq("user_id", selectedUser)
          .eq("is_active", true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallet-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recent-transactions"] });
      toast({
        title: "تمت العملية بنجاح! ✅",
      });
      setDialogOpen(false);
      setSelectedUser(null);
      setAmount("");
      setReason("");
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalCredits = users?.reduce((acc, u) => {
    return acc + (u.credits_remaining || 0);
  }, 0) || 0;

  const filteredUsers = users?.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة المحافظ"
      subtitle="إدارة أرصدة الكريديتات للعملاء"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="إجمالي الكريديتات"
          value={`${totalCredits.toLocaleString()}`}
          icon={Wallet}
        />
        <StatCard
          title="عدد المستخدمين"
          value={`${users?.length || 0}`}
          icon={Users}
        />
        <StatCard
          title="معاملات اليوم"
          value={`${recentTransactions?.filter(t => 
            new Date(t.created_at).toDateString() === new Date().toDateString()
          ).length || 0}`}
          icon={ArrowUpRight}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 card-elevated">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">أرصدة المستخدمين</h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  إضافة معاملة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة معاملة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>المستخدم</Label>
                    <Select value={selectedUser || ""} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستخدم" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>نوع العملية</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={transactionType === "credit" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setTransactionType("credit")}
                      >
                        <Plus className="w-4 h-4" />
                        إيداع
                      </Button>
                      <Button
                        type="button"
                        variant={transactionType === "debit" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setTransactionType("debit")}
                      >
                        <Minus className="w-4 h-4" />
                        خصم
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ (كريديت)</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السبب</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="سبب العملية..."
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => addTransactionMutation.mutate()}
                    disabled={addTransactionMutation.isPending}
                  >
                    تأكيد العملية
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredUsers?.map(user => {
                const balance = user.credits_remaining || 0;

                return (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                        {user.full_name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{balance} كريديت</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card-elevated">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">آخر المعاملات</h3>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {recentTransactions?.map(transaction => {
              const profile = transaction.profiles as any;
              return (
                <div key={transaction.id} className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transaction.type === "credit" 
                      ? "bg-success/10 text-success" 
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {transaction.type === "credit" ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {transaction.reason || "معاملة"}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${
                    transaction.type === "credit" ? "text-success" : "text-destructive"
                  }`}>
                    {transaction.type === "credit" ? "+" : ""}{transaction.amount}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
