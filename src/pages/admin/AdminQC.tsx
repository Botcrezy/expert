import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FilePreview } from "@/components/files/FilePreview";
import { DeliveryLinksDisplay, type DeliveryLink } from "@/components/delivery/DeliveryLinksInput";
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
  CheckCircle, 
  XCircle,
  Eye,
  ClipboardCheck,
  FileText,
  Clock,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  resubmitted: "bg-info/10 text-info",
};

const statusLabels: Record<string, string> = {
  pending: "في الانتظار",
  approved: "مقبول",
  rejected: "مرفوض",
  resubmitted: "معاد تقديمه",
};

export default function AdminQC() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [qcNotes, setQcNotes] = useState("");
  const [aiQcResult, setAiQcResult] = useState<any>(null);
  const [isRunningAiQc, setIsRunningAiQc] = useState(false);
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["admin-qc-deliveries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliveries")
        .select("*")
        .in("status", ["pending", "resubmitted"])
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["requests-for-qc"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("*");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-qc"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ deliveryId, status, notes }: { deliveryId: string; status: "pending" | "approved" | "rejected" | "resubmitted"; notes: string }) => {
      const { error } = await supabase
        .from("deliveries")
        .update({
          status,
          qc_notes: notes,
          qc_reviewer_id: user?.id,
          qc_reviewed_at: new Date().toISOString(),
        })
        .eq("id", deliveryId);
      if (error) throw error;

      // Update request status based on QC decision
      const delivery = deliveries?.find((d) => d.id === deliveryId);
      if (delivery) {
        if (status === "approved") {
          await supabase.from("requests").update({ status: "delivered_to_client" }).eq("id", delivery.request_id);
        }
        if (status === "rejected") {
          await supabase.from("requests").update({ status: "qc_rejected" }).eq("id", delivery.request_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-qc-deliveries"] });
      toast({ title: "تم تحديث حالة التسليم ✅" });
      setSelectedDelivery(null);
      setQcNotes("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getRequest = (requestId: string) => requests?.find(r => r.id === requestId);
  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  const runAiQc = async (deliveryId: string) => {
    setIsRunningAiQc(true);
    setAiQcResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-qc-check", {
        body: { deliveryId },
      });
      if (error) throw error;
      setAiQcResult(data.result);
      toast({ title: "تم فحص الجودة بالذكاء الاصطناعي ✅" });
    } catch (err: any) {
      toast({ title: "خطأ في فحص AI", description: err.message, variant: "destructive" });
    } finally {
      setIsRunningAiQc(false);
    }
  };

    if (!selectedDelivery) return;
    reviewMutation.mutate({
      deliveryId: selectedDelivery.id,
      status: "approved",
      notes: qcNotes,
    });
  };

  const handleReject = () => {
    if (!selectedDelivery || !qcNotes.trim()) {
      toast({ title: "يرجى إدخال سبب الرفض", variant: "destructive" });
      return;
    }
    reviewMutation.mutate({
      deliveryId: selectedDelivery.id,
      status: "rejected",
      notes: qcNotes,
    });
  };

  const pendingCount = deliveries?.filter(d => d.status === "pending").length || 0;
  const resubmittedCount = deliveries?.filter(d => d.status === "resubmitted").length || 0;

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="مراجعة الجودة (QC)"
      subtitle="مراجعة التسليمات قبل إرسالها للعملاء"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">في انتظار المراجعة</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resubmittedCount}</p>
                <p className="text-sm text-muted-foreground">معاد تقديمها</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{deliveries?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي المعلق</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطلب</TableHead>
                <TableHead>الفريلانسر</TableHead>
                <TableHead>رقم التسليم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : deliveries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد تسليمات في انتظار المراجعة</p>
                  </TableCell>
                </TableRow>
              ) : (
                deliveries?.map((delivery) => {
                  const request = getRequest(delivery.request_id);
                  const freelancer = getProfile(delivery.freelancer_id);
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{request?.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {request?.request_number}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{freelancer?.full_name || "غير معروف"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">التسليم #{delivery.revision_number}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[delivery.status]}>
                          {statusLabels[delivery.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(delivery.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDelivery(delivery);
                            setQcNotes("");
                          }}
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          مراجعة
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>مراجعة التسليم</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-6">
              {/* Delivery Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الطلب</p>
                  <p className="font-medium">{getRequest(selectedDelivery.request_id)?.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الفريلانسر</p>
                  <p className="font-medium">{getProfile(selectedDelivery.freelancer_id)?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم التسليم</p>
                  <p>#{selectedDelivery.revision_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التسليم</p>
                  <p>{format(new Date(selectedDelivery.created_at), "dd MMM yyyy HH:mm", { locale: ar })}</p>
                </div>
              </div>

              {/* Freelancer Notes */}
              {selectedDelivery.notes && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">ملاحظات الفريلانسر</p>
                  <p>{selectedDelivery.notes}</p>
                </div>
              )}

              {/* Delivery Links */}
              {selectedDelivery.delivery_links && (selectedDelivery.delivery_links as any[]).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">روابط التسليم</p>
                  <DeliveryLinksDisplay links={selectedDelivery.delivery_links as DeliveryLink[]} />
                </div>
              )}

              {/* Files */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">الملفات المرفقة</p>
                {(selectedDelivery.files as any[])?.length > 0 ? (
                  <FilePreview 
                    files={(selectedDelivery.files as any[]).map((f: any) => ({
                      name: f.name || 'ملف',
                      size: f.size,
                      type: f.type,
                      path: f.path || f.url
                    }))} 
                    bucket="request-files"
                    title="ملفات التسليم"
                  />
                ) : (
                  !selectedDelivery.delivery_links || (selectedDelivery.delivery_links as any[]).length === 0 ? (
                    <p className="text-muted-foreground">لا توجد ملفات أو روابط</p>
                  ) : null
                )}
              </div>

              {/* QC Notes */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">ملاحظات المراجعة</p>
                <Textarea
                  placeholder="أدخل ملاحظاتك هنا (مطلوب في حالة الرفض)..."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="w-4 h-4 ml-2" />
                  رفض
                </Button>
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  قبول
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
