import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  ShoppingCart,
  CreditCard,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  cart: "bg-muted text-muted-foreground",
  pending_payment: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  refunded: "bg-info/10 text-info",
};

const statusLabels: Record<string, string> = {
  cart: "في السلة",
  pending_payment: "في انتظار الدفع",
  paid: "مدفوع",
  failed: "فشل",
  cancelled: "ملغي",
  refunded: "مسترد",
};

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "cart" | "pending_payment" | "paid" | "failed" | "cancelled" | "refunded"
  >(() => (searchParams.get("status") as any) || "all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Keep URL in sync (so AdminFixedAgreements can deep-link to an order)
  useEffect(() => {
    const next: Record<string, string> = {};
    if (search.trim()) next.search = search.trim();
    if (statusFilter !== "all") next.status = statusFilter;

    const currentSearch = searchParams.get("search") || "";
    const currentStatus = searchParams.get("status") || "";
    const nextSearch = next.search || "";
    const nextStatus = next.status || "";

    // Avoid unnecessary updates (prevents extra renders / subtle loops)
    if (currentSearch !== nextSearch || currentStatus !== nextStatus) {
      setSearchParams(next, { replace: true });
    }
  }, [search, statusFilter, setSearchParams, searchParams]);

  // If user navigates with different params (back/forward), reflect them
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlStatus = (searchParams.get("status") as any) || "all";
    if (urlSearch !== search) setSearch(urlSearch);
    if (urlStatus !== statusFilter) setStatusFilter(urlStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, payment_receipt_url")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search) {
        query = query.ilike("order_number", `%${search}%`);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const { data: orderItems } = useQuery({
    queryKey: ["order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data } = await supabase
        .from("order_items")
        .select("*, products(*)")
        .eq("order_id", selectedOrder.id);
      return data || [];
    },
    enabled: !!selectedOrder,
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, full_name, email");
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: "cart" | "pending_payment" | "paid" | "failed" | "cancelled" | "refunded" }) => {
      // For "paid" we must trigger fulfillment + service conversion securely
      if (status === "paid") {
        const { data, error } = await supabase.functions.invoke("admin-mark-order-paid", {
          body: { orderId },
        });
        if (error) throw error;
        if (!(data as any)?.success) throw new Error((data as any)?.error || "فشل اعتماد الدفع");
        return;
      }

      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast({ title: "تم تحديث حالة الطلب ✅" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  // Extract receipt URL from payment_reference or payment_receipt_url
  const getReceiptUrl = (order: any) => {
    if (order.payment_receipt_url) return order.payment_receipt_url;
    
    if (order.payment_reference) {
      const match = order.payment_reference.match(/إيصال: (https?:\/\/[^\s|]+)/);
      if (match) return match[1];
    }
    return null;
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة الطلبات"
      subtitle="متابعة وإدارة طلبات الشراء"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="حالة الطلب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending_payment">في انتظار الدفع</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
              <SelectItem value="failed">فشل</SelectItem>
              <SelectItem value="refunded">مسترد</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders?.filter(o => o.status === "pending_payment").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">في انتظار الدفع</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders?.filter(o => o.status === "paid").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">مدفوع</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders?.filter(o => o.status === "paid").reduce((acc, o) => acc + Number(o.total), 0).toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإيصال</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد طلبات
                  </TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => {
                  const profile = getProfile(order.user_id);
                  const receiptUrl = getReceiptUrl(order);
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_number}</TableCell>
                      <TableCell>{profile?.full_name || "غير معروف"}</TableCell>
                      <TableCell className="font-semibold">{Number(order.total).toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {receiptUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                              <ImageIcon className="w-4 h-4 ml-1" />
                              عرض
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: ar })}
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
                          {order.status === "pending_payment" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-success hover:text-success"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "paid" })}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "cancelled" })}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">العميل</p>
                  <p className="font-medium">{getProfile(selectedOrder.user_id)?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className={statusColors[selectedOrder.status]}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                  <p>{format(new Date(selectedOrder.created_at), "dd MMM yyyy HH:mm", { locale: ar })}</p>
                </div>
                {selectedOrder.paid_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ الدفع</p>
                    <p>{format(new Date(selectedOrder.paid_at), "dd MMM yyyy HH:mm", { locale: ar })}</p>
                  </div>
                )}
                {selectedOrder.payment_method && (
                  <div>
                    <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                    <p>
                      {selectedOrder.payment_method === "bank_transfer" ? "تحويل بنكي" : 
                       selectedOrder.payment_method === "wallet" ? "محفظة إلكترونية" :
                       selectedOrder.payment_method === "kashier" ? "كاشير (بوابة دفع)" :
                       selectedOrder.payment_method === "coupon" ? "كوبون خصم" :
                       selectedOrder.payment_method === "free" ? "باقة مجانية" :
                       selectedOrder.payment_method}
                    </p>
                  </div>
                )}
                {selectedOrder.payment_reference && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.payment_method === "kashier" ? "رقم معاملة كاشير" : "بيانات الدفع"}
                    </p>
                    <div className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded mt-1">
                      {selectedOrder.payment_reference}
                    </div>
                  </div>
                )}
              </div>

              {/* Receipt Preview */}
              {getReceiptUrl(selectedOrder) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    إيصال الدفع
                  </h4>
                  <div className="relative bg-muted/50 rounded-lg overflow-hidden">
                    {getReceiptUrl(selectedOrder)?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img 
                        src={getReceiptUrl(selectedOrder)} 
                        alt="إيصال الدفع" 
                        className="w-full h-auto max-h-[400px] object-contain"
                      />
                    ) : getReceiptUrl(selectedOrder)?.match(/\.pdf$/i) ? (
                      <iframe 
                        src={getReceiptUrl(selectedOrder)} 
                        className="w-full h-[400px]"
                        title="إيصال الدفع"
                      />
                    ) : (
                      <div className="p-4">
                        <a 
                          href={getReceiptUrl(selectedOrder)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          عرض الإيصال
                        </a>
                      </div>
                    )}
                    <a 
                      href={getReceiptUrl(selectedOrder)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg hover:bg-background transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">المنتجات</h4>
                <div className="space-y-2">
                  {orderItems?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">{item.products?.name_ar || item.products?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          الكمية: {item.quantity}
                          {item.products?.credits && ` • ${item.products.credits} كريديت`}
                        </p>
                      </div>
                      <p className="font-semibold">{Number(item.total).toLocaleString()} ج.م</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{Number(selectedOrder.subtotal).toLocaleString()} ج.م</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-success">
                    <span>الخصم</span>
                    <span>-{Number(selectedOrder.discount).toLocaleString()} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>الإجمالي</span>
                  <span className="text-primary">{Number(selectedOrder.total).toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Actions */}
              {selectedOrder.status === "pending_payment" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "paid" });
                      setSelectedOrder(null);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    الموافقة وتفعيل الكريديت
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "cancelled" });
                      setSelectedOrder(null);
                    }}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
