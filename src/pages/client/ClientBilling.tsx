import { useState } from "react";
import DOMPurify from "dompurify";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ClientBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["client-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            products(name, name_ar)
          )
        `)
        .eq("user_id", user?.id)
        .neq("status", "cart")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "failed":
      case "cancelled":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "مدفوع";
      case "pending_payment":
        return "في انتظار الدفع";
      case "failed":
        return "فشل";
      case "cancelled":
        return "ملغي";
      case "refunded":
        return "مسترد";
      default:
        return status;
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoice(orderId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { orderId },
      });

      if (error) throw error;

      if (data?.invoiceHTML) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          // Sanitize server-generated HTML before injecting into the print window
          const sanitizedHTML = DOMPurify.sanitize(data.invoiceHTML, {
            ALLOWED_TAGS: ['html', 'head', 'body', 'style', 'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'img'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan'],
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
          });
          printWindow.document.write(sanitizedHTML);
          printWindow.document.close();

          printWindow.onload = () => {
            printWindow.print();
          };
        }

        toast({ title: "تم فتح الفاتورة ✅", description: "يمكنك طباعتها أو حفظها كـ PDF" });
      }
    } catch (error: any) {
      console.error("Invoice download error:", error);
      toast({ 
        title: "خطأ في تحميل الفاتورة", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      title="الفواتير"
      subtitle="سجل مدفوعاتك وفواتيرك"
    >
      <div className="card-elevated">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Receipt className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">سجل الفواتير</h3>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="divide-y divide-border">
            {orders.map((order) => (
              <div key={order.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground font-mono">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="text-sm font-medium">{getStatusLabel(order.status)}</span>
                    </div>
                    <p className="font-semibold text-foreground">{order.total} ج.م</p>
                    {order.status === "paid" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadInvoice(order.id)}
                        disabled={downloadingInvoice === order.id}
                        className="gap-2"
                      >
                        {downloadingInvoice === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                        فاتورة
                      </Button>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-muted/50 rounded-lg p-4">
                  {(order.order_items as any[])?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{item.products?.name_ar || item.products?.name}</span>
                      <span className="text-muted-foreground">
                        {item.quantity} × {item.unit_price} ج.م
                      </span>
                    </div>
                  ))}
                  
                  {order.discount > 0 && (
                    <div className="flex items-center justify-between text-sm text-success mt-2 pt-2 border-t border-border">
                      <span>الخصم</span>
                      <span>-{order.discount} ج.م</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد فواتير</h3>
            <p className="text-muted-foreground">ستظهر هنا فواتيرك بعد أول عملية شراء</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
