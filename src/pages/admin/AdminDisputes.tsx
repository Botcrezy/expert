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
  AlertTriangle,
  Eye,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  opened: "bg-destructive/10 text-destructive",
  under_review: "bg-warning/10 text-warning",
  resolved_refund: "bg-success/10 text-success",
  resolved_reassign: "bg-info/10 text-info",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  opened: "مفتوح",
  under_review: "قيد المراجعة",
  resolved_refund: "تم الاسترداد",
  resolved_reassign: "تم إعادة التعيين",
  closed: "مغلق",
};

export default function AdminDisputes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState<"opened" | "under_review" | "resolved_refund" | "resolved_reassign" | "closed">("opened");

  const { data: disputes, isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: requests } = useQuery({
    queryKey: ["requests-for-disputes"],
    queryFn: async () => {
      const { data } = await supabase.from("requests").select("*");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-disputes"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ disputeId, status, resolution }: { disputeId: string; status: "opened" | "under_review" | "resolved_refund" | "resolved_reassign" | "closed"; resolution: string }) => {
      const { error } = await supabase
        .from("disputes")
        .update({
          status,
          resolution,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast({ title: "تم تحديث النزاع بنجاح ✅" });
      setSelectedDispute(null);
      setResolution("");
      setNewStatus("opened");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const getRequest = (requestId: string) => requests?.find(r => r.id === requestId);
  const getProfile = (userId: string) => profiles?.find(p => p.user_id === userId);

  const openCount = disputes?.filter(d => d.status === "opened").length || 0;
  const reviewCount = disputes?.filter(d => d.status === "under_review").length || 0;

  const handleResolve = () => {
    if (!selectedDispute || !newStatus) return;
    resolveMutation.mutate({
      disputeId: selectedDispute.id,
      status: newStatus,
      resolution,
    });
  };

  return (
    <DashboardLayout
      sidebar={<AdminSidebar />}
      title="إدارة النزاعات"
      subtitle="متابعة وحل النزاعات بين العملاء والفريلانسرز"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-sm text-muted-foreground">نزاعات مفتوحة</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviewCount}</p>
                <p className="text-sm text-muted-foreground">قيد المراجعة</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disputes?.length || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي النزاعات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Disputes Table */}
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطلب</TableHead>
                <TableHead>فتح بواسطة</TableHead>
                <TableHead>السبب</TableHead>
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
              ) : disputes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد نزاعات</p>
                  </TableCell>
                </TableRow>
              ) : (
                disputes?.map((dispute) => {
                  const request = getRequest(dispute.request_id);
                  const openedBy = getProfile(dispute.opened_by);
                  return (
                    <TableRow key={dispute.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request?.title || "غير معروف"}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {request?.request_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{openedBy?.full_name || "غير معروف"}</TableCell>
                      <TableCell className="max-w-xs truncate">{dispute.reason}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[dispute.status]}>
                          {statusLabels[dispute.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(dispute.created_at), "dd MMM yyyy", { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setNewStatus(dispute.status);
                            setResolution(dispute.resolution || "");
                          }}
                        >
                          <Eye className="w-4 h-4 ml-2" />
                          عرض
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

      {/* Dispute Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل النزاع</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-6">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الطلب</p>
                  <p className="font-medium">{getRequest(selectedDispute.request_id)?.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">فتح بواسطة</p>
                  <p className="font-medium">{getProfile(selectedDispute.opened_by)?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p>{format(new Date(selectedDispute.created_at), "dd MMM yyyy HH:mm", { locale: ar })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة الحالية</p>
                  <Badge className={statusColors[selectedDispute.status]}>
                    {statusLabels[selectedDispute.status]}
                  </Badge>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">سبب النزاع</p>
                <p>{selectedDispute.reason}</p>
              </div>

              {/* Resolution */}
              {!["opened", "under_review"].includes(selectedDispute.status) && selectedDispute.resolution && (
                <div className="bg-success/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">قرار الحل</p>
                  <p>{selectedDispute.resolution}</p>
                </div>
              )}

              {/* Resolve Form */}
              {["opened", "under_review"].includes(selectedDispute.status) && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">تغيير الحالة</p>
                    <Select value={newStatus} onValueChange={(value) => setNewStatus(value as typeof newStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_review">قيد المراجعة</SelectItem>
                        <SelectItem value="resolved_refund">تم الاسترداد</SelectItem>
                        <SelectItem value="resolved_reassign">تم إعادة التعيين</SelectItem>
                        <SelectItem value="closed">مغلق</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">قرار الحل</p>
                    <Textarea
                      placeholder="أدخل قرار الحل..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleResolve}
                    className="w-full"
                    disabled={resolveMutation.isPending}
                  >
                    حفظ التغييرات
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
