import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  RotateCcw,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminRefunds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundNotes, setRefundNotes] = useState("");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["refundable-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["paid", "refunded"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-refunds"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refundable-orders"] });
      toast({ title: "تم استرداد المبلغ بنجاح ✅" });
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  const paidOrders = orders?.filter(o => o.status === "paid") || [];
  const refundedOrders = orders?.filter(o => o.status === "refunded") || [];

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الاستردادات"
      subtitle="متابعة وإدارة طلبات الاسترداد"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{paidOrders.length}</p>
                <p className="text-sm text-muted-foreground">طلبات مدفوعة</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{refundedOrders.length}</p>
                <p className="text-sm text-muted-foreground">تم الاسترداد</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {refundedOrders.reduce((acc, o) => acc + Number(o.total), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">إجمالي المسترد (ج.م)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Paid Orders (Can be refunded) */}
        <div className="card-elevated">
          <div className="p-4 border-b">
            <h3 className="font-semibold">الطلبات المدفوعة (قابلة للاسترداد)</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>تاريخ الدفع</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : paidOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات مدفوعة
                  </TableCell>
                </TableRow>
              ) : (
                paidOrders.map((order) => {
                  const profile = getProfile(order.user_id);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_number}</TableCell>
                      <TableCell>{profile?.full_name || "غير معروف"}</TableCell>
                      <TableCell className="font-semibold">{Number(order.total).toLocaleString()} ج.م</TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.paid_at ? format(new Date(order.paid_at), "dd MMM yyyy", { locale: ar }) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-warning border-warning hover:bg-warning hover:text-warning-foreground"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <RotateCcw className="w-4 h-4 ml-1" />
                            استرداد
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Refunded Orders */}
        <div className="card-elevated">
          <div className="p-4 border-b">
            <h3 className="font-semibold">الطلبات المستردة</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refundedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات مستردة
                  </TableCell>
                </TableRow>
              ) : (
                refundedOrders.map((order) => {
                  const profile = getProfile(order.user_id);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_number}</TableCell>
                      <TableCell>{profile?.full_name || "غير معروف"}</TableCell>
                      <TableCell className="font-semibold">{Number(order.total).toLocaleString()} ج.م</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.updated_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-info/10 text-info">مسترد</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Refund Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>استرداد الطلب</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الطلب</p>
                    <p className="font-mono font-medium">{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المبلغ</p>
                    <p className="font-semibold text-primary">{Number(selectedOrder.total).toLocaleString()} ج.م</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">ملاحظات الاسترداد</p>
                <Textarea
                  placeholder="أدخل سبب الاسترداد..."
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedOrder(null)}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1 bg-warning hover:bg-warning/90"
                  onClick={() => refundMutation.mutate(selectedOrder.id)}
                  disabled={refundMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  تأكيد الاسترداد
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
