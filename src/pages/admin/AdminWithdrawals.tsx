import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Wallet, 
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ArrowDownCircle,
  Search,
  Banknote,
  Smartphone,
  Building2,
  Bitcoin
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type WithdrawalStatus = "pending" | "approved" | "rejected" | "completed";

interface WithdrawalMethod {
  type: string;
  name?: string;
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  phone?: string;
  wallet_address?: string;
  currency?: string;
  network?: string;
}

export default function AdminWithdrawals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Fetch all withdrawals
  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for user names
      const userIds = [...new Set((data || []).map(w => w.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, any>);

      return (data || []).map(w => ({
        ...w,
        user: profilesMap[w.user_id] || { full_name: "غير معروف", email: "" }
      }));
    },
  });

  // Process withdrawal mutation
  const processMutation = useMutation({
    mutationFn: async ({ id, status, notes, user_id, amount }: { id: string; status: string; notes?: string; user_id?: string; amount?: number }) => {
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status,
          notes,
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;

      if (status === "approved" && user_id && typeof amount === "number") {
        const { data: lastEntry, error: ledgerError } = await supabase
          .from("wallet_ledger")
          .select("balance_after")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ledgerError) throw ledgerError;

        const previousBalance = lastEntry?.balance_after ?? 0;
        const newBalance = previousBalance - amount;

        const { error: insertError } = await supabase.from("wallet_ledger").insert({
          user_id,
          amount: -amount,
          type: "debit",
          balance_after: newBalance,
          reason: "سحب أرباح",
          created_by: user?.id,
        });

        if (insertError) throw insertError;
      }

      // Telegram notification to freelancer about status change
      if (user_id && typeof amount === "number" && (status === "approved" || status === "rejected")) {
        const messageType = status === "approved" ? "withdrawal_approved" : "withdrawal_rejected";

        await supabase.functions.invoke("telegram-send", {
          body: {
            user_id,
            message_type: messageType,
            data: {
              amount,
            },
            reference_type: "withdrawal",
            reference_id: id,
          },
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({
        title: variables.status === "approved" 
          ? "تمت الموافقة على طلب السحب ✅" 
          : variables.status === "completed"
          ? "تم تنفيذ طلب السحب ✅"
          : "تم رفض طلب السحب",
      });
      setDetailsOpen(false);
      setSelectedWithdrawal(null);
      setRejectionReason("");
      setProcessingAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
      setProcessingAction(null);
    },
  });

  const getStatusBadge = (status: WithdrawalStatus) => {
    const config: Record<WithdrawalStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "في الانتظار", variant: "secondary" },
      approved: { label: "موافق عليه", variant: "default" },
      rejected: { label: "مرفوض", variant: "destructive" },
      completed: { label: "مكتمل", variant: "outline" },
    };
    const { label, variant } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "vodafone_cash":
      case "instapay":
        return <Smartphone className="w-4 h-4" />;
      case "bank_transfer":
        return <Building2 className="w-4 h-4" />;
      case "crypto":
        return <Bitcoin className="w-4 h-4" />;
      default:
        return <Banknote className="w-4 h-4" />;
    }
  };

  const getMethodLabel = (type: string) => {
    const labels: Record<string, string> = {
      vodafone_cash: "فودافون كاش",
      instapay: "انستا باي",
      bank_transfer: "تحويل بنكي",
      crypto: "عملة رقمية",
    };
    return labels[type] || type;
  };

  const renderPaymentDetails = (paymentDetails: any) => {
    if (!paymentDetails || typeof paymentDetails !== 'object') {
      return <p className="text-muted-foreground text-sm">لا توجد بيانات دفع</p>;
    }

    // Handle different structures
    const details = paymentDetails.details || paymentDetails;
    const type = paymentDetails.type || details.type;

    return (
      <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-md">
        <div className="flex items-center gap-2 mb-2">
          {type === "vodafone_cash" && <Smartphone className="w-4 h-4 text-red-500" />}
          {type === "instapay" && <Smartphone className="w-4 h-4 text-blue-500" />}
          {type === "bank_transfer" && <Building2 className="w-4 h-4 text-green-500" />}
          {type === "crypto" && <Bitcoin className="w-4 h-4 text-orange-500" />}
          <span className="font-semibold">
            {type === "vodafone_cash" && "فودافون كاش"}
            {type === "instapay" && "إنستاباي"}
            {type === "bank_transfer" && "تحويل بنكي"}
            {type === "crypto" && "عملة رقمية"}
            {!["vodafone_cash", "instapay", "bank_transfer", "crypto"].includes(type) && (type || "طريقة أخرى")}
          </span>
        </div>

        {(type === "vodafone_cash" || type === "instapay") && (
          <>
            {(details.name || paymentDetails.methodName) && (
              <p><span className="text-muted-foreground">الاسم:</span> {details.name || paymentDetails.methodName}</p>
            )}
            {(details.phone || details.account_number) && (
              <p><span className="text-muted-foreground">رقم الهاتف/الحساب:</span> {details.phone || details.account_number}</p>
            )}
          </>
        )}

        {type === "bank_transfer" && (
          <>
            {details.bank_name && <p><span className="text-muted-foreground">اسم البنك:</span> {details.bank_name}</p>}
            {details.account_name && <p><span className="text-muted-foreground">اسم الحساب:</span> {details.account_name}</p>}
            {details.account_number && <p><span className="text-muted-foreground">رقم الحساب:</span> {details.account_number}</p>}
            {details.iban && <p><span className="text-muted-foreground">IBAN:</span> {details.iban}</p>}
            {details.swift_code && <p><span className="text-muted-foreground">رمز SWIFT:</span> {details.swift_code}</p>}
          </>
        )}

        {type === "crypto" && (
          <>
            {details.currency && <p><span className="text-muted-foreground">العملة:</span> {details.currency}</p>}
            {details.network && <p><span className="text-muted-foreground">الشبكة:</span> {details.network}</p>}
            {details.wallet_address && (
              <p className="break-all">
                <span className="text-muted-foreground">العنوان:</span> 
                <code className="text-xs bg-background px-1 py-0.5 rounded">{details.wallet_address}</code>
              </p>
            )}
          </>
        )}

        {/* Display all other fields */}
        {Object.entries(details).map(([key, value]) => {
          if (["type", "name", "phone", "account_number", "bank_name", "account_name", 
               "iban", "swift_code", "currency", "network", "wallet_address"].includes(key)) {
            return null;
          }
          if (value && typeof value !== 'object') {
            return (
              <p key={key}>
                <span className="text-muted-foreground">{key}:</span> {String(value)}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const pendingCount = withdrawals.filter(w => w.status === "pending").length;
  const approvedCount = withdrawals.filter(w => w.status === "approved").length;
  const totalAmount = withdrawals
    .filter(w => w.status === "completed")
    .reduce((acc, w) => acc + w.amount, 0);

  const filteredWithdrawals = withdrawals.filter(w =>
    w.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة طلبات السحب"
      subtitle="مراجعة ومعالجة طلبات سحب الأرباح"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="في الانتظار"
          value={pendingCount}
          icon={Clock}
        />
        <StatCard
          title="بانتظار التنفيذ"
          value={approvedCount}
          icon={CheckCircle2}
        />
        <StatCard
          title="إجمالي المدفوع"
          value={`${totalAmount.toLocaleString()} ج.م`}
          icon={Wallet}
        />
        <StatCard
          title="إجمالي الطلبات"
          value={withdrawals.length}
          icon={ArrowDownCircle}
        />
      </div>

      {/* Withdrawals Table */}
      <div className="card-elevated">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">جميع الطلبات</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الفريلانسر</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWithdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات سحب
                  </TableCell>
                </TableRow>
              ) : (
                filteredWithdrawals.map((withdrawal) => {
                  const paymentDetails = withdrawal.payment_details as unknown as WithdrawalMethod | null;
                  return (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{withdrawal.user?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{withdrawal.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{withdrawal.amount.toLocaleString()} ج.م</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMethodIcon(paymentDetails?.type || "")}
                          <span>{getMethodLabel(paymentDetails?.type || "")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(withdrawal.created_at), "d MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(withdrawal.status as WithdrawalStatus)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب السحب</DialogTitle>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold text-lg">{selectedWithdrawal.user?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedWithdrawal.user?.email}</p>
              </div>

              {/* Amount */}
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {selectedWithdrawal.amount.toLocaleString()} ج.م
                </p>
                <p className="text-sm text-muted-foreground mt-1">المبلغ المطلوب</p>
              </div>

              {/* Payment Details */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">بيانات الدفع</Label>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    {getMethodIcon((selectedWithdrawal.payment_details as unknown as WithdrawalMethod)?.type || "")}
                    <span className="font-medium">
                      {getMethodLabel((selectedWithdrawal.payment_details as WithdrawalMethod)?.type || "")}
                    </span>
                  </div>
                  {renderPaymentDetails(selectedWithdrawal.payment_details as WithdrawalMethod)}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الحالة:</span>
                {getStatusBadge(selectedWithdrawal.status as WithdrawalStatus)}
              </div>

              {/* Notes */}
              {selectedWithdrawal.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">الملاحظات:</p>
                  <p>{selectedWithdrawal.notes}</p>
                </div>
              )}

              {/* Actions */}
              {selectedWithdrawal.status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setProcessingAction("approve");
                        processMutation.mutate({
                          id: selectedWithdrawal.id,
                          status: "approved",
                          user_id: selectedWithdrawal.user_id,
                          amount: selectedWithdrawal.amount,
                        });
                      }}
                      disabled={processMutation.isPending}
                    >
                      {processingAction === "approve" && processMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      موافقة
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        if (!rejectionReason.trim()) {
                          toast({
                            title: "يرجى إدخال سبب الرفض",
                            variant: "destructive",
                          });
                          return;
                        }
                        setProcessingAction("reject");
                        processMutation.mutate({
                          id: selectedWithdrawal.id,
                          status: "rejected",
                          notes: rejectionReason,
                          user_id: selectedWithdrawal.user_id,
                          amount: selectedWithdrawal.amount,
                        });
                      }}
                      disabled={processMutation.isPending}
                    >
                      {processingAction === "reject" && processMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      رفض
                    </Button>
                  </div>
                  <Textarea
                    placeholder="سبب الرفض (مطلوب في حالة الرفض)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {selectedWithdrawal.status === "approved" && (
                <Button
                  className="w-full"
                  onClick={() => {
                    setProcessingAction("complete");
                    processMutation.mutate({
                      id: selectedWithdrawal.id,
                      status: "completed",
                      user_id: selectedWithdrawal.user_id,
                      amount: selectedWithdrawal.amount,
                    });
                  }}
                  disabled={processMutation.isPending}
                >
                  {processingAction === "complete" && processMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  تأكيد التنفيذ
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}